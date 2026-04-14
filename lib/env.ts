import { z } from "zod";

const envSchema = z.object({
  TMDB_API_KEY: z.string().min(1),
  ML_SERVICE_URL: z.string().url().default("http://127.0.0.1:8000"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

const partialSchema = envSchema.partial();
const parsed = partialSchema.parse(process.env);

export const env = {
  tmdbApiKey: parsed.TMDB_API_KEY ?? "",
  mlServiceUrl: parsed.ML_SERVICE_URL ?? "http://127.0.0.1:8000",
  appUrl: parsed.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
};

export function assertServerEnv() {
  const required = ["TMDB_API_KEY"] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
