import type { CandidateFeatures, ParsedQuery, TmdbResult } from "@/types";
import { parseDateScore } from "@/lib/utils";

const GENRE_DIMENSIONS = 20;
const VOCAB = [
  "dark",
  "love",
  "space",
  "crime",
  "family",
  "war",
  "future",
  "survival",
  "friendship",
  "revenge",
  "dream",
  "mind",
  "comedy",
  "romance",
  "mystery",
  "hero",
  "alien",
  "power",
  "thriller",
  "drama"
];

export function buildFeatureCandidates(candidates: TmdbResult[], query: ParsedQuery): CandidateFeatures[] {
  return candidates.map((candidate) => {
    const genreVector = encodeGenres(candidate.genreIds);
    const tfidfVector = encodeText(candidate.overview, query.keywords);
    return {
      tmdbId: candidate.id,
      title: candidate.title,
      overview: candidate.overview,
      mediaType: candidate.mediaType,
      genreVector,
      tfidfVector,
      popularity: candidate.popularity,
      recencyScore: parseDateScore(candidate.releaseDate)
    };
  });
}

function encodeGenres(genreIds: number[]): number[] {
  const vector = new Array<number>(GENRE_DIMENSIONS).fill(0);
  for (const id of genreIds) {
    vector[id % GENRE_DIMENSIONS] = 1;
  }
  return vector;
}

function encodeText(text: string, queryKeywords: string[]): number[] {
  const normalized = text.toLowerCase();
  const keywordBonus = queryKeywords.map((keyword) => keyword.toLowerCase());
  return VOCAB.map((term) => {
    const base = normalized.includes(term) ? 1 : 0;
    const bonus = keywordBonus.some((kw) => kw.includes(term) || term.includes(kw)) ? 0.5 : 0;
    return Math.min(1.5, base + bonus);
  });
}
