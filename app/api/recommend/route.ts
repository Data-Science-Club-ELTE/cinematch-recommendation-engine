import { NextResponse } from "next/server";
import { z } from "zod";
import { buildRecommendations } from "@/lib/recommendation-engine";

const schema = z.object({
  userId: z.string().min(1),
  prompt: z.string().min(3),
  genres: z.array(z.string()).default([]),
  moods: z.array(z.string()).default([])
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const response = await buildRecommendations(payload);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recommendation pipeline failed" },
      { status: 500 }
    );
  }
}
