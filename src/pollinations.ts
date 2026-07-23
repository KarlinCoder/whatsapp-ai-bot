import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.POLLINATIONS_API_KEY || "";
const MODEL = process.env.POLLINATIONS_MODEL || "openai";
const BASE_URL = "https://gen.pollinations.ai/v1";

export async function generateText(prompt: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente de WhatsApp. Responde siempre en formato de WhatsApp markdown válido: *negrita*, _cursiva_, ~tachado~, `monoespacio`. Sé conciso y útil. Responde en el mismo idioma que el usuario.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pollinations API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content || "No se pudo generar una respuesta.";
}
