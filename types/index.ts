export type MediaType = "movie" | "tv";

export type ParsedQuery = {
  genres: string[];
  mood: string[];
  keywords: string[];
  referenceTitles?: string[];
  intentSummary: string;
};

export type TmdbResult = {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate: string | null;
  popularity: number;
  genreIds: number[];
};

export type CandidateFeatures = {
  tmdbId: number;
  title: string;
  overview: string;
  mediaType: MediaType;
  genreVector: number[];
  tfidfVector: number[];
  popularity: number;
  recencyScore: number;
};

export type RecommendationItem = {
  tmdbId: number;
  title: string;
  overview: string;
  mediaType: MediaType;
  posterUrl: string | null;
  rating: number;
  score: number;
  whyRecommended: string;
  featureBreakdown: {
    contentSimilarity: number;
    collaborativeScore: number;
    popularity: number;
    recency: number;
  };
};

export type RecommendationRequest = {
  userId: string;
  prompt: string;
  genres: string[];
  moods: string[];
};

export type RecommendationResponse = {
  query: ParsedQuery;
  items: RecommendationItem[];
};

export type MlScoreRequest = {
  userId: string;
  parsedQuery: ParsedQuery;
  candidates: CandidateFeatures[];
};

export type MlScoreResponse = {
  items: Array<{
    tmdbId: number;
    contentSimilarity: number;
    collaborativeScore: number;
    popularity: number;
    recency: number;
    score: number;
    whyRecommended: string;
  }>;
};

export type AnalyticsSnapshot = {
  recommendedTitles: Array<{ title: string; count: number }>;
  topGenres: Array<{ genre: string; count: number }>;
  engagement: {
    searches: number;
    clicks: number;
    ratings: number;
    watchlistAdds: number;
  };
  trendByDay: Array<{ date: string; events: number }>;
};
