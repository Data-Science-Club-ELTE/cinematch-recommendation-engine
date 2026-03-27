import type { ParsedQuery, RecommendationItem, RecommendationRequest, RecommendationResponse } from "@/types";
import { parseUserPrompt } from "@/lib/query-parser";
import { fetchTmdbCandidates, toPosterUrl } from "@/lib/tmdb";
import { buildFeatureCandidates } from "@/lib/feature-engineering";
import { scoreWithMlService } from "@/lib/ml-client";
import { normalize } from "@/lib/utils";

export async function buildRecommendations(input: RecommendationRequest): Promise<RecommendationResponse> {
  const query = await parseUserPrompt(input.prompt, input.genres, input.moods);
  const tmdbCandidates = await fetchTmdbCandidates(query).catch(() => []);
  const engineered = buildFeatureCandidates(tmdbCandidates, query);

  if (engineered.length === 0) {
    return { query, items: [] };
  }

  const scoreResponse = await scoreWithMlService({
    userId: input.userId,
    parsedQuery: query,
    candidates: engineered
  }).catch(() => scoreLocally(engineered, query));

  const scoreMap = new Map(scoreResponse.items.map((item) => [item.tmdbId, item]));
  const items = tmdbCandidates
    .map<RecommendationItem | null>((candidate) => {
      const score = scoreMap.get(candidate.id);
      if (!score) return null;
      return {
        tmdbId: candidate.id,
        title: candidate.title,
        overview: candidate.overview,
        mediaType: candidate.mediaType,
        posterUrl: toPosterUrl(candidate.posterPath),
        rating: candidate.voteAverage,
        score: score.score,
        whyRecommended: score.whyRecommended,
        featureBreakdown: {
          contentSimilarity: score.contentSimilarity,
          collaborativeScore: score.collaborativeScore,
          popularity: score.popularity,
          recency: score.recency
        }
      };
    })
    .filter((item): item is RecommendationItem => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  return { query, items };
}

function scoreLocally(candidates: ReturnType<typeof buildFeatureCandidates>, query: ParsedQuery) {
  const vectors = candidates.map((candidate) => [...candidate.genreVector, ...candidate.tfidfVector]);
  const centroid = vectors[0].map((_, index) => vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length);

  const contentRaw = vectors.map((vector) => cosineSimilarity(vector, centroid));
  const popularityRaw = candidates.map((candidate) => candidate.popularity);
  const recencyRaw = candidates.map((candidate) => candidate.recencyScore);

  const content = normalizeArray(contentRaw);
  const popularity = normalizeArray(popularityRaw);
  const recency = normalizeArray(recencyRaw);

  return {
    items: candidates.map((candidate, index) => {
      const collaborative = 0.5;
      const score = 0.45 * content[index] + 0.25 * collaborative + 0.2 * popularity[index] + 0.1 * recency[index];
      return {
        tmdbId: candidate.tmdbId,
        contentSimilarity: content[index],
        collaborativeScore: collaborative,
        popularity: popularity[index],
        recency: recency[index],
        score,
        whyRecommended: `${candidate.title} is ranked via local fallback scoring based on "${query.intentSummary}", weighted by content similarity, popularity, and release recency.`
      };
    })
  };
}

function normalizeArray(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max <= min) {
    return values.map(() => 0.5);
  }
  return values.map((value) => normalize(value, min, max));
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}
