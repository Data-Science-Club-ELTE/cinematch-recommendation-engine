import { unstable_cache } from "next/cache";
import type { ParsedQuery, TmdbResult } from "@/types";
import { env } from "@/lib/env";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

type TmdbSearchResponse = {
  results: Array<{
    id: number;
    media_type?: "movie" | "tv";
    title?: string;
    name?: string;
    overview: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    popularity: number;
    genre_ids: number[];
  }>;
};

type TmdbMedia = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate: string | null;
  popularity: number;
  genreIds: number[];
};

const discoverCached = unstable_cache(
  async (query: ParsedQuery) => {
    const queryText = buildQueryText(query);
    const searchCandidates = await fetchSearchCandidates(queryText);
    const referenceTitles = query.referenceTitles ?? [];
    const seedItems = (await Promise.all(referenceTitles.map((title) => findSeedByTitle(title)))).filter(
      (seed): seed is TmdbMedia => seed !== null
    );

    const relatedCandidates = (
      await Promise.all(seedItems.map((seed) => fetchSeedNeighbors(seed.mediaType, seed.id)))
    ).flat();

    const merged = dedupeMedia([relatedCandidates, searchCandidates, seedItems].flat()).filter((item) =>
      shouldKeepItem(item, referenceTitles)
    );

    return merged.slice(0, 45).map<TmdbResult>((item) => ({
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      overview: item.overview,
      posterPath: item.posterPath,
      voteAverage: item.voteAverage,
      releaseDate: item.releaseDate,
      popularity: item.popularity,
      genreIds: item.genreIds
    }));
  },
  ["tmdb-discover-query"],
  { revalidate: 3600, tags: ["tmdb-search"] }
);

export async function fetchTmdbCandidates(query: ParsedQuery): Promise<TmdbResult[]> {
  if (!env.tmdbApiKey) {
    return [];
  }
  return discoverCached(query);
}

export function toPosterUrl(path: string | null) {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}${path}`;
}

async function fetchSearchCandidates(queryText: string): Promise<TmdbMedia[]> {
  const payload = await tmdbGet<TmdbSearchResponse>("/search/multi", {
    query: queryText || "popular",
    include_adult: "false",
    page: "1"
  });
  return normalizeResults(payload.results);
}

async function findSeedByTitle(title: string): Promise<TmdbMedia | null> {
  const [movieResult, tvResult] = await Promise.all([
    tmdbGet<TmdbSearchResponse>("/search/movie", { query: title, include_adult: "false", page: "1" }).catch(
      () => null
    ),
    tmdbGet<TmdbSearchResponse>("/search/tv", { query: title, include_adult: "false", page: "1" }).catch(() => null)
  ]);

  const movieCandidate = normalizeResults(movieResult?.results ?? [], "movie")[0];
  const tvCandidate = normalizeResults(tvResult?.results ?? [], "tv")[0];

  if (!movieCandidate && !tvCandidate) {
    return null;
  }
  if (!tvCandidate) {
    return movieCandidate;
  }
  if (!movieCandidate) {
    return tvCandidate;
  }
  return movieCandidate.popularity >= tvCandidate.popularity ? movieCandidate : tvCandidate;
}

async function fetchSeedNeighbors(mediaType: "movie" | "tv", id: number): Promise<TmdbMedia[]> {
  const [recommended, similar] = await Promise.all([
    tmdbGet<TmdbSearchResponse>(`/${mediaType}/${id}/recommendations`, {
      include_adult: "false",
      page: "1"
    }).catch(() => ({ results: [] })),
    tmdbGet<TmdbSearchResponse>(`/${mediaType}/${id}/similar`, {
      include_adult: "false",
      page: "1"
    }).catch(() => ({ results: [] }))
  ]);

  return dedupeMedia([
    ...normalizeResults(recommended.results, mediaType),
    ...normalizeResults(similar.results, mediaType)
  ]);
}

async function tmdbGet<T>(path: string, query: Record<string, string>) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function normalizeResults(items: TmdbSearchResponse["results"], forcedMediaType?: "movie" | "tv"): TmdbMedia[] {
  return items
    .map<TmdbMedia | null>((item) => {
      const mediaType = forcedMediaType ?? item.media_type;
      if (mediaType !== "movie" && mediaType !== "tv") {
        return null;
      }
      return {
        id: item.id,
        mediaType,
        title: item.title ?? item.name ?? "Untitled",
        overview: item.overview ?? "",
        posterPath: item.poster_path,
        voteAverage: item.vote_average ?? 0,
        releaseDate: item.release_date ?? item.first_air_date ?? null,
        popularity: item.popularity ?? 0,
        genreIds: item.genre_ids ?? []
      };
    })
    .filter((item): item is TmdbMedia => item !== null)
    .filter((item) => item.overview.trim().length > 0);
}

function dedupeMedia(items: TmdbMedia[]): TmdbMedia[] {
  const byKey = new Map<string, TmdbMedia>();
  for (const item of items) {
    const key = `${item.mediaType}:${item.id}`;
    const existing = byKey.get(key);
    if (!existing || item.popularity > existing.popularity) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()].sort((a, b) => b.popularity - a.popularity);
}

function shouldKeepItem(item: TmdbMedia, referenceTitles: string[]) {
  const normalizedTitle = item.title.toLowerCase().trim();
  return !referenceTitles.some((seedTitle) => normalizedTitle === seedTitle.toLowerCase().trim());
}

function buildQueryText(query: ParsedQuery) {
  const mood = query.mood.slice(0, 2).join(" ");
  const genre = query.genres.slice(0, 2).join(" ");
  const keywords = query.keywords.slice(0, 4).join(" ");
  const seedHints = (query.referenceTitles ?? []).slice(0, 1).join(" ");
  const terms = [mood, genre, keywords, seedHints].filter(Boolean);
  return terms.join(" ").trim();
}
