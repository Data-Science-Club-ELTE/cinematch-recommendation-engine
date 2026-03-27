from __future__ import annotations

from dataclasses import dataclass
from typing import List

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors

from data_loader import load_movielens_user_item_matrix


@dataclass
class ScoreConfig:
    w1: float = 0.45  # content similarity
    w2: float = 0.25  # collaborative score
    w3: float = 0.2   # popularity
    w4: float = 0.1   # recency


class HybridRecommender:
    def __init__(self) -> None:
        self.config = ScoreConfig()
        self.user_item_matrix = self._build_user_item_matrix()
        self.knn = self._fit_knn_model(self.user_item_matrix)

    def score_candidates(self, user_id: str, parsed_query: dict, candidates: List[dict]) -> List[dict]:
        if not candidates:
            return []

        frame = pd.DataFrame(candidates)
        content_scores = self._content_similarity_scores(frame)
        collaborative_scores = self._collaborative_scores(user_id, frame["tmdbId"].tolist())
        popularity = self._normalize(frame["popularity"].to_numpy(dtype=float))
        recency = self._normalize(frame["recencyScore"].to_numpy(dtype=float))

        final_score = (
            self.config.w1 * content_scores
            + self.config.w2 * collaborative_scores
            + self.config.w3 * popularity
            + self.config.w4 * recency
        )

        items = []
        for idx, row in frame.iterrows():
            why = self._build_explanation(
                parsed_query,
                row["title"],
                content_scores[idx],
                collaborative_scores[idx],
                popularity[idx],
                recency[idx],
            )
            items.append(
                {
                    "tmdbId": int(row["tmdbId"]),
                    "contentSimilarity": float(content_scores[idx]),
                    "collaborativeScore": float(collaborative_scores[idx]),
                    "popularity": float(popularity[idx]),
                    "recency": float(recency[idx]),
                    "score": float(final_score[idx]),
                    "whyRecommended": why,
                }
            )

        return sorted(items, key=lambda x: x["score"], reverse=True)

    def _content_similarity_scores(self, frame: pd.DataFrame) -> np.ndarray:
        genre_matrix = np.array(frame["genreVector"].tolist(), dtype=float)
        tfidf_matrix = np.array(frame["tfidfVector"].tolist(), dtype=float)
        combined = np.hstack([genre_matrix, tfidf_matrix])
        query_profile = combined.mean(axis=0, keepdims=True)
        scores = cosine_similarity(combined, query_profile).reshape(-1)
        return self._normalize(scores)

    def _collaborative_scores(self, user_id: str, tmdb_ids: List[int]) -> np.ndarray:
        if self.user_item_matrix.empty:
            return np.full(shape=(len(tmdb_ids),), fill_value=0.5, dtype=float)

        user_vector = self._get_user_vector(user_id)
        n_neighbors = min(max(2, len(self.user_item_matrix.index)), 6)
        distances, indices = self.knn.kneighbors(user_vector.reshape(1, -1), n_neighbors=n_neighbors, return_distance=True)
        neighbor_idx = indices[0][1:]

        neighborhood = self.user_item_matrix.iloc[neighbor_idx]
        neighbor_means = neighborhood.mean(axis=0)

        scores = np.array([neighbor_means.get(item_id, 0.0) for item_id in tmdb_ids], dtype=float)
        return self._normalize(scores)

    def _build_explanation(
        self,
        parsed_query: dict,
        title: str,
        content_similarity: float,
        collaborative_score: float,
        popularity: float,
        recency: float,
    ) -> str:
        genres = ", ".join(parsed_query.get("genres", [])[:2]) or "your selected themes"
        mood = ", ".join(parsed_query.get("mood", [])[:2]) or "your current mood"
        leading_signal = max(
            [
                ("content profile", content_similarity),
                ("viewer behavior patterns", collaborative_score),
                ("trending popularity", popularity),
                ("release freshness", recency),
            ],
            key=lambda x: x[1],
        )[0]
        return (
            f"{title} is recommended because it aligns with {genres} and {mood}. "
            f"The strongest ranking signal came from {leading_signal}."
        )

    @staticmethod
    def _normalize(values: np.ndarray) -> np.ndarray:
        if values.size == 0:
            return values
        min_value = float(values.min())
        max_value = float(values.max())
        if max_value - min_value <= 1e-8:
            return np.full(shape=values.shape, fill_value=0.5, dtype=float)
        return (values - min_value) / (max_value - min_value)

    def _build_user_item_matrix(self) -> pd.DataFrame:
        movielens_matrix = load_movielens_user_item_matrix()
        if not movielens_matrix.empty:
            return movielens_matrix

        # Fallback bootstrap matrix when online dataset cannot be loaded.
        seed = [
            {"userId": "u1", "tmdbId": 550, "rating": 5},
            {"userId": "u1", "tmdbId": 680, "rating": 4},
            {"userId": "u2", "tmdbId": 680, "rating": 5},
            {"userId": "u2", "tmdbId": 13, "rating": 4},
            {"userId": "u3", "tmdbId": 13, "rating": 5},
            {"userId": "u3", "tmdbId": 155, "rating": 4},
            {"userId": "u4", "tmdbId": 603, "rating": 5},
            {"userId": "u4", "tmdbId": 157336, "rating": 4},
        ]
        frame = pd.DataFrame(seed)
        matrix = frame.pivot_table(index="userId", columns="tmdbId", values="rating", fill_value=0.0)
        return matrix

    def _fit_knn_model(self, matrix: pd.DataFrame) -> NearestNeighbors:
        model = NearestNeighbors(metric="cosine", algorithm="brute")
        if matrix.empty:
            model.fit(np.zeros((1, 1)))
        else:
            model.fit(matrix.values)
        return model

    def _get_user_vector(self, user_id: str) -> np.ndarray:
        if user_id in self.user_item_matrix.index:
            return self.user_item_matrix.loc[user_id].to_numpy(dtype=float)
        # Cold start: average profile fallback.
        return self.user_item_matrix.mean(axis=0).to_numpy(dtype=float)
