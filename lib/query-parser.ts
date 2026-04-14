import type { ParsedQuery } from "@/types";

const fallbackGenres = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller"
];

export async function parseUserPrompt(input: string, selectedGenres: string[], selectedMoods: string[]): Promise<ParsedQuery> {
  const normalizedInput = input.toLowerCase();
  const referenceTitles = extractReferenceTitles(input);
  const inferredGenres = inferGenres(normalizedInput);
  const inferredMood = inferMoods(normalizedInput);
  const keywords = extractKeywords(normalizedInput, referenceTitles);

  return {
    genres: dedupeAndWhitelist([...selectedGenres, ...inferredGenres]),
    mood: dedupe([...selectedMoods, ...inferredMood]),
    keywords,
    referenceTitles,
    intentSummary: buildIntentSummary(input, inferredGenres, inferredMood)
  };
}

function dedupe(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function dedupeAndWhitelist(values: string[]) {
  const normalized = new Set(fallbackGenres.map((genre) => genre.toLowerCase()));
  return dedupe(values).filter((value) => normalized.has(value.toLowerCase()));
}

function inferGenres(input: string): string[] {
  const mappings: Record<string, string[]> = {
    Action: ["action", "fight", "explosive", "adrenaline", "martial"],
    Adventure: ["adventure", "journey", "quest", "expedition"],
    Animation: ["animation", "animated", "pixar", "dreamworks"],
    Comedy: ["comedy", "funny", "humor", "laugh"],
    Crime: ["crime", "heist", "gangster", "mafia", "detective"],
    Drama: ["drama", "emotional", "character-driven", "realistic"],
    Fantasy: ["fantasy", "magic", "wizard", "mythical"],
    Horror: ["horror", "scary", "haunted", "supernatural"],
    Mystery: ["mystery", "whodunit", "investigation", "puzzle"],
    Romance: ["romance", "love story", "romantic"],
    "Sci-Fi": ["sci-fi", "science fiction", "space", "future", "cyberpunk", "alien"],
    Thriller: ["thriller", "suspense", "psychological", "mind-bending", "tense"]
  };

  const hits: string[] = [];
  for (const [genre, keywords] of Object.entries(mappings)) {
    if (keywords.some((keyword) => input.includes(keyword))) {
      hits.push(genre);
    }
  }
  return hits;
}

function inferMoods(input: string): string[] {
  const mappings: Record<string, string[]> = {
    Dark: ["dark", "gritty", "bleak"],
    "Feel-good": ["feel good", "uplifting", "heartwarming", "positive"],
    "Mind-bending": ["mind-bending", "twist", "complex", "philosophical"],
    Suspenseful: ["suspense", "tense", "edge of seat"],
    Cozy: ["cozy", "comfort", "light", "warm"],
    Epic: ["epic", "grand", "large scale"],
    Emotional: ["emotional", "tearjerker", "moving"],
    "Fast-paced": ["fast-paced", "quick", "high energy"]
  };

  const hits: string[] = [];
  for (const [mood, keywords] of Object.entries(mappings)) {
    if (keywords.some((keyword) => input.includes(keyword))) {
      hits.push(mood);
    }
  }
  return hits;
}

function extractKeywords(input: string, referenceTitles: string[] = []): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "show",
    "movie",
    "movies",
    "series",
    "like",
    "want",
    "watch",
    "something",
    "please",
    "from",
    "about",
    "into"
  ]);

  const titleTokens = new Set(
    referenceTitles
      .flatMap((title) => title.toLowerCase().match(/[a-z0-9-]+/g) ?? [])
      .filter((token) => token.length >= 3)
  );
  const words = input.match(/[a-z0-9-]+/g) ?? [];
  const frequency = new Map<string, number>();
  for (const word of words) {
    if (word.length < 4 || stopWords.has(word) || titleTokens.has(word)) continue;
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function extractReferenceTitles(input: string): string[] {
  const patterns = [
    /\blike\s+["']?([^"',.!?;]+)["']?/gi,
    /\bsimilar to\s+["']?([^"',.!?;]+)["']?/gi,
    /\bin the style of\s+["']?([^"',.!?;]+)["']?/gi,
    /\bsuch as\s+["']?([^"',.!?;]+)["']?/gi
  ];

  const rawMatches: string[] = [];
  for (const pattern of patterns) {
    const matches = input.matchAll(pattern);
    for (const match of matches) {
      const maybeTitle = sanitizeReferenceTitle(match[1]);
      if (maybeTitle && maybeTitle.length >= 2) {
        rawMatches.push(maybeTitle);
      }
    }
  }

  return [...new Set(rawMatches.map((value) => value.replace(/\s+/g, " ").trim()))].slice(0, 3);
}

function sanitizeReferenceTitle(value: string | undefined) {
  if (!value) return "";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.replace(/\b(?:but|and|with|because|that)\b.*$/i, "").trim();
}

function buildIntentSummary(prompt: string, genres: string[], moods: string[]) {
  const parts = [
    genres.length ? `genres: ${genres.join(", ")}` : "",
    moods.length ? `moods: ${moods.join(", ")}` : ""
  ].filter(Boolean);
  if (parts.length === 0) {
    return `User intent extracted from prompt: ${prompt}`;
  }
  return `User intent extracted from prompt with ${parts.join(" | ")}.`;
}
