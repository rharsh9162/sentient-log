import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';

const ALLOWED_OPERATORS = [
  '$match', '$group', '$sort', '$limit', '$project',
  '$unwind', '$count', '$addFields', '$avg', '$sum',
  '$max', '$min', '$first', '$last', '$skip',
];

const SYSTEM_PROMPT = `You are an expert MongoDB query builder for an analytics platform.
The database has a single collection called "events" with this schema:
{
  event_type: string (enum: "page_view" | "click" | "error" | "api_call"),
  url: string,
  latency_ms: number,
  status_code: number (optional),
  metadata: object (may contain: domain, source, page_title, content_type, size_bytes, method, error),
  session_id: string (optional),
  timestamp: Date
}
Given the user's question, respond with ONLY a valid JSON object in this exact format:
{
  "pipeline": [ /* MongoDB aggregation pipeline stages */ ],
  "summary": "A one-sentence description of what the query will return"
}
Do not include any explanation, markdown, or code fences outside the JSON.
Always include a $limit stage (max 100).
Use proper MongoDB date functions when filtering by time (e.g., $gte with ISODate-style new Date() strings).
For domain-specific queries, filter using {"metadata.domain": "domain_name"}.`;

export class AnalyticAgent {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async query(question: string, domain?: string, userId?: string): Promise<{
    question: string;
    pipeline: object[];
    results: object[];
    summary: string;
  }> {
    await connectDB();

    // Build the prompt with domain context
    let userPrompt = question;
    if (domain) {
      userPrompt = `[CONTEXT: The user is asking about data from the domain "${domain}". You MUST include {"$match": {"metadata.domain": "${domain}"}} as the FIRST stage in the pipeline to filter events for this domain only.]

User question: ${question}`;
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 1000,
        temperature: 0.1,
      },
    });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userPrompt },
    ]);

    const responseText = result.response.text();

    // Clean response — strip markdown fences if Gemini adds them
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${cleanText.substring(0, 200)}`);
    }

    const { pipeline, summary } = parsed;

    if (!pipeline || !summary) {
      throw new Error('AI response missing pipeline or summary fields');
    }

    // Security: validate pipeline operators
    this.validatePipeline(pipeline);

    // Inject user_id filter as first stage for data isolation
    if (userId) {
      pipeline.unshift({ $match: { user_id: userId } });
    }

    const results = await Event.aggregate(pipeline);
    return { question, pipeline, results, summary };
  }

  private validatePipeline(pipeline: object[]): void {
    if (!Array.isArray(pipeline)) {
      throw new Error('Pipeline must be an array');
    }
    for (const stage of pipeline) {
      const key = Object.keys(stage)[0];
      if (!ALLOWED_OPERATORS.includes(key)) {
        throw new Error(`Disallowed pipeline operator: ${key}`);
      }
    }
  }
}
