import type { MlScoreRequest, MlScoreResponse } from "@/types";
import { env } from "@/lib/env";

export async function scoreWithMlService(payload: MlScoreRequest): Promise<MlScoreResponse> {
  const response = await fetch(`${env.mlServiceUrl}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`ML service failed with ${response.status}`);
  }

  return (await response.json()) as MlScoreResponse;
}
