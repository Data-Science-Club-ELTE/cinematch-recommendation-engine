"use client";

import { useState } from "react";
import Image from "next/image";
import type { RecommendationItem } from "@/types";

const GENRES = ["Action", "Drama", "Sci-Fi", "Thriller", "Comedy", "Horror", "Romance", "Crime"];
const MOODS = ["Dark", "Feel-good", "Mind-bending", "Suspenseful", "Cozy", "Epic", "Emotional"];

type ApiResponse = {
  items: RecommendationItem[];
  query: { intentSummary: string };
};

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [error, setError] = useState("");

  const onSearch = async () => {
    if (!prompt.trim()) {
      setError("Please describe what you want to watch.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "guest", prompt, genres, moods })
      });
      const data = (await response.json()) as ApiResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Unable to run recommendations.");
      }
      const success = data as ApiResponse;
      setItems(success.items);
      setSummary(success.query.intentSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">CineMatch</h1>
        <p className="text-sm text-muted-foreground">Simple recommendation engine for movies and TV shows.</p>
      </div>

      <div className="space-y-3 rounded-xl border bg-white p-4">
        <textarea
          className="min-h-24 w-full rounded-md border p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Try: dark psychological thrillers like Fight Club"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <TagRow title="Genres" options={GENRES} values={genres} setValues={setGenres} />
        <TagRow title="Moods" options={MOODS} values={moods} setValues={setMoods} />
        <button
          onClick={onSearch}
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {loading ? "Scoring..." : "Get Recommendations"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      {summary ? (
        <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Parsed intent:</span> {summary}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.tmdbId} className="overflow-hidden rounded-lg border bg-white">
            <div className="relative aspect-[2/3] w-full bg-muted">
              {item.posterUrl ? (
                <Image src={item.posterUrl} alt={item.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No poster</div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="line-clamp-1 font-medium">{item.title}</p>
              <p className="line-clamp-3 text-xs text-muted-foreground">{item.overview}</p>
              <p className="text-xs text-muted-foreground">{item.whyRecommended}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function TagRow({
  title,
  options,
  values,
  setValues
}: {
  title: string;
  options: string[];
  values: string[];
  setValues: (values: string[]) => void;
}) {
  const toggle = (option: string) => {
    setValues(values.includes(option) ? values.filter((v) => v !== option) : [...values, option]);
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => toggle(option)}
            className={`rounded-full border px-3 py-1 text-xs ${values.includes(option) ? "bg-black text-white" : "bg-white text-foreground"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
