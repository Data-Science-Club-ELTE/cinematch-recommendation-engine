from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from recommender import HybridRecommender

app = FastAPI(title="CineMatch ML Service", version="1.0.0")
recommender = HybridRecommender()


class ParsedQuery(BaseModel):
    genres: list[str]
    mood: list[str]
    keywords: list[str]
    intentSummary: str


class Candidate(BaseModel):
    tmdbId: int
    title: str
    overview: str
    mediaType: str
    genreVector: list[float]
    tfidfVector: list[float]
    popularity: float
    recencyScore: float


class ScoreRequest(BaseModel):
    userId: str
    parsedQuery: ParsedQuery
    candidates: list[Candidate]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/score")
def score(request: ScoreRequest) -> dict:
    items = recommender.score_candidates(
        user_id=request.userId,
        parsed_query=request.parsedQuery.model_dump(),
        candidates=[candidate.model_dump() for candidate in request.candidates],
    )
    return {"items": items}
