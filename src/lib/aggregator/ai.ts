/**
 * AI News Generator — Google Gemini integration for generating
 * localized, concise esports news articles.
 */

import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai"

// ─── Types ──────────────────────────────────────────────────────────
export interface GeneratedArticle {
  title_ru: string
  title_en: string
  title_kz: string
  content_ru: string
  content_en: string
  content_kz: string
}

// ─── Client ─────────────────────────────────────────────────────────
function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("[Aggregator AI] GEMINI_API_KEY is not set in environment")
  }
  
  const genAI = new GoogleGenerativeAI(apiKey)
  
  // Strict JSON schema definition for Gemini
  const responseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      title_ru: { type: SchemaType.STRING },
      title_en: { type: SchemaType.STRING },
      title_kz: { type: SchemaType.STRING },
      content_ru: { type: SchemaType.STRING },
      content_en: { type: SchemaType.STRING },
      content_kz: { type: SchemaType.STRING },
    },
    required: ["title_ru", "title_en", "title_kz", "content_ru", "content_en", "content_kz"],
  }

  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.2, // Low temperature for high factual accuracy
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  })
}

// ─── Generator ──────────────────────────────────────────────────────
export async function generateArticle(
  title: string,
  summary: string,
  sourceName: string,
  category: string
): Promise<GeneratedArticle | null> {
  try {
    const model = getGeminiModel()

    const systemPrompt = `You are a professional fact-checker and esports news editor for "o.esports".

CRITICAL ANTI-FAKE RULES:
1. STRICT FACTUALITY: You must ONLY use facts explicitly stated in the provided SOURCE. 
2. NO HALLUCINATION: Do NOT invent dates, tournament names, rosters, rumors, scores, or quotes. If a detail is not in the source text, LEAVE IT OUT.
3. If the source is vague, write a vague and brief summary. Do not fill in the gaps.
4. Style: News report, 2-4 lines max (per language). Punchy, no filler.

You must translate your factual summary into three languages: English, Russian, and Kazakh.
Output strictly as JSON matching the schema.`

    const userPrompt = `Translate and summarize this EXACT source material. DO NOT ADD ANY EXTERNAL KNOWLEDGE.

CATEGORY: ${category.toUpperCase()}
SOURCE: ${sourceName}
ORIGINAL TITLE: ${title}
SUMMARY TEXT: ${summary}

Provide the resulting JSON.`

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: systemPrompt,
    })

    const responseText = result.response.text()
    if (!responseText) {
      console.error("[Aggregator AI] Empty response from Gemini")
      return null
    }

    const parsed = JSON.parse(responseText) as GeneratedArticle

    // Validate all required fields exist
    if (!parsed.title_ru || !parsed.title_en || !parsed.content_ru || !parsed.content_en) {
      console.error("[Aggregator AI] Missing required fields in response")
      return null
    }

    return parsed
  } catch (err) {
    console.error("[Aggregator AI] Generation failed:", (err as Error).message)
    return null
  }
}

// ─── Slug generator ─────────────────────────────────────────────────
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)
}
