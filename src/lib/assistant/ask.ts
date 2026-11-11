import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { isAvailable, listCars, type Car } from "@/data/cars";
import { heuristicMatch } from "@/lib/assistant/heuristic";

// `-latest` aliases track the current Gemini Flash-Lite model, so this keeps
// working when Google retires older versions. Gemini supports structured
// output, which `Output.object()` below relies on for a reliable JSON reply.
const GEMINI_MODEL = process.env["GEMINI_MODEL"] ?? "gemini-flash-lite-latest";
// Second provider, tried only if Gemini is missing or fails.
const GROQ_MODEL = process.env["GROQ_MODEL"] ?? "openai/gpt-oss-120b";

// This endpoint is public and every call can hit a paid model, so bound what a
// single request can cost: capped message/reply length, and only the most
// recent turns of history are forwarded (older ones are dropped, not rejected,
// so a long chat keeps working).
export const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_CONTENT_LENGTH = 2000;
const MAX_HISTORY_TURNS = 20;

export const askSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(MAX_HISTORY_CONTENT_LENGTH),
      }),
    )
    .default([])
    .transform((history) => history.slice(-MAX_HISTORY_TURNS)),
});

const resultSchema = z.object({
  reply: z.string(),
  matchedCarIds: z.array(z.string()),
});

function toInventoryContext(cars: Car[]) {
  // Keep this small and structured — the model should only ever reference
  // ids from this list, never invent a car, price, or availability.
  return cars
    .filter(isAvailable)
    .slice(0, 60)
    .map((c) => ({
      id: c.id,
      title: c.title,
      make: c.make,
      model: c.model,
      year: c.year,
      condition: c.condition,
      bodyType: c.bodyType,
      city: c.city,
      price: c.price,
      monthly: c.monthly,
      mileageKm: c.mileageKm,
      fuel: c.fuel,
    }));
}

/**
 * "AI Car Assistant" — tries Gemini, then Groq (structured output, constrained to the
 * real live inventory), and falls back to a local keyword matcher if both are
 * unavailable (no/invalid key, rate limited, network error), so the feature
 * degrades gracefully rather than breaking.
 */
export const askAssistantFn = createServerFn({ method: "POST" })
  .validator(askSchema)
  .handler(async ({ data }) => {
    const cars = await listCars();
    const inventory = toInventoryContext(cars);

    const geminiKey = process.env["GEMINI_API_KEY"];
    const groqKey = process.env["GROQ_API_KEY"];
    const providers = [
      ...(geminiKey
        ? [{ source: "gemini" as const, model: createGoogleGenerativeAI({ apiKey: geminiKey })(GEMINI_MODEL) }]
        : []),
      ...(groqKey
        ? [{ source: "groq" as const, model: createGroq({ apiKey: groqKey })(GROQ_MODEL) }]
        : []),
    ];

    for (const provider of providers) {
      try {
        const { output } = await generateText({
          model: provider.model,
          output: Output.object({ schema: resultSchema }),
          system: [
            "You are Yalhacar's car shopping assistant for a Saudi Arabia car marketplace.",
            "You may ONLY recommend vehicles that appear in the INVENTORY JSON provided — never invent a car, price, spec, or availability that isn't in that list.",
            "If nothing in the inventory matches, say so honestly in `reply` and suggest the user widen their budget or criteria — do not make something up.",
            "Reply in the same language as the user's latest message (Arabic or English).",
            "Keep `reply` to 1-3 short sentences. Put the ids of every car you're recommending in `matchedCarIds` (use the exact `id` field from the inventory) — empty array if none match.",
            `INVENTORY: ${JSON.stringify(inventory)}`,
          ].join("\n"),
          messages: [
            ...data.history.map((m) => ({ role: m.role, content: m.content }) as const),
            { role: "user" as const, content: data.message },
          ],
        });

        const validIds = new Set(inventory.map((c) => c.id));
        return {
          reply: output.reply,
          matchedCarIds: output.matchedCarIds.filter((id) => validIds.has(id)),
          source: provider.source,
        };
      } catch {
        // try the next provider, then the heuristic below
      }
    }

    const { reply, matched } = heuristicMatch(data.message, cars);
    return {
      reply,
      matchedCarIds: matched.map((c) => c.id),
      source: "heuristic" as const,
    };
  });
