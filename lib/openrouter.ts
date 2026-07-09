const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chat({
  messages,
  model,
  temperature = 0.5,
  maxTokens = 1800,
}: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env.local — see .env.local.example."
    );
  }
  const useModel = model || process.env.OPENROUTER_DEFAULT_MODEL || "openai/gpt-oss-120b:free";

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_TITLE || "Job Search Copilot",
    },
    body: JSON.stringify({
      model: useModel,
      temperature,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    model: string;
  };
  return {
    content: data.choices[0]?.message?.content ?? "",
    model: data.model || useModel,
  };
}
