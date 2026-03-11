import Groq from 'groq-sdk';

export interface ModerationResult {
  approved: boolean;
  reason: string;
  categories: {
    abuse: number;
    sexual: number;
    toxic: number;
    dangerous: number;
    hate: number;
  };
}

export async function moderateWithGroq(
  message: string
): Promise<ModerationResult> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content:
          'You are a content moderation assistant. Analyze messages for safety and return only valid JSON with no markdown.',
      },
      {
        role: 'user',
        content: `Analyze the following compliment message for safety. Flag if it contains:
- Abuse or harassment
- Sexual content
- Toxic or mean-spirited language
- Dangerous or harmful content
- Hate speech or discrimination

Return a JSON response with this exact format:
{
  "approved": true,
  "reason": "Brief explanation",
  "categories": {
    "abuse": 0.0,
    "sexual": 0.0,
    "toxic": 0.0,
    "dangerous": 0.0,
    "hate": 0.0
  }
}

Compliment message:
"${message.replace(/"/g, '\\"')}"`,
      },
    ],
    temperature: 0,
    max_tokens: 256,
  });

  const text = completion.choices[0]?.message?.content ?? '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid Groq response format');
  }

  const moderation: ModerationResult = JSON.parse(jsonMatch[0]);

  // Reject if any category score > 0.5
  const maxScore = Math.max(...Object.values(moderation.categories));
  if (maxScore > 0.5) {
    moderation.approved = false;
    moderation.reason = `Content flagged: ${Object.entries(moderation.categories)
      .filter(([, score]) => score > 0.5)
      .map(([category]) => category)
      .join(', ')}`;
  }

  return moderation;
}
