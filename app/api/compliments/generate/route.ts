import { NextResponse } from 'next/server';
import { z } from 'zod';
import Groq from 'groq-sdk';

const generateSchema = z.object({
  category: z.enum(['professional', 'creative', 'personal_growth', 'just_because']),
  context: z.string().max(200).optional(),
});

const CATEGORY_CONTEXT: Record<string, string> = {
  professional: 'professional skills, work ethic, leadership, or teamwork',
  creative: 'creativity, artistic talent, or innovative thinking',
  personal_growth: 'personal character, resilience, kindness, or values',
  just_because: 'warmth, positive energy, or simply being a great person to be around',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { category, context } = parsed.data;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI generation not configured' }, { status: 503 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const contextLine = context?.trim()
      ? `Additional context about them: ${context.trim()}.`
      : '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'You are a heartfelt compliment writer. Generate warm, genuine, specific compliments. Avoid clichés and platitudes. Return only the compliment text — no quotes, no preamble, no explanation.',
        },
        {
          role: 'user',
          content: `Write a single heartfelt anonymous compliment focused on ${CATEGORY_CONTEXT[category]}. ${contextLine}

Requirements:
- 1–3 sentences, under 240 characters total
- Warm and specific, not generic
- Anonymous tone — written as if from a secret admirer
- Uplifting and positive only`,
        },
      ],
      temperature: 0.95,
      max_tokens: 128,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!raw) {
      return NextResponse.json({ error: 'Failed to generate' }, { status: 500 });
    }

    // Strip surrounding quotes if the model added them
    const message = raw.replace(/^["']|["']$/g, '').trim();

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Generate compliment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
