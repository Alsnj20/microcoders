import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../index.js";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_KEY = process.env.MISTRAL_API_KEY || "";

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

export function createChatRoutes(
  agentRegistry: any,
  memoryRegistry: any,
  contextRegistry: any,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  const ChatMessageSchema = z.object({
    message: z.string().min(1),
    agentId: z.string().optional(),
  });

  routes.post("/send", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = ChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ code: "VALIDATION_ERROR", message: "Invalid request" }, 400);
    }

    const { message, agentId } = parsed.data;

    // Gather context: agent info + linked memories
    let systemPrompt = `Eres MemoryChain AI, un asistente de IA especializado en conocimiento descentralizado.
Tu usuario tiene una wallet en Arbitrum Stylus y utiliza MemoryChain para gestionar memorias y agentes de IA.
Responde en español de forma concisa y útil.
Si el usuario pregunta sobre crear un agente o memoria, sugiérele usar la interfaz.
Si el usuario pregunta sobre sus memorias o agentes, ayúdale a entender qué puede hacer con ellos.`;

    if (agentId) {
      try {
        const agent = await agentRegistry.getAgent(agentId);
        if (agent.success && agent.data) {
          systemPrompt += `\n\nEl usuario está hablando con el agente "${agent.data.name || 'Agente'}".`;
          systemPrompt += `\nDescripción del agente: ${agent.data.description || 'Sin descripción'}.`;

          // Fetch linked memories for this agent
          try {
            const links = await contextRegistry.getAgentContexts(agentId, 0, 100);
            console.log(`[Chat] Agent ${agentId} has ${links.data?.length || 0} linked memories`);
            if (links.success && links.data && links.data.length > 0) {
              systemPrompt += `\n\nEl agente tiene acceso a las siguientes memorias:`;
              for (const link of links.data) {
                try {
                  console.log(`[Chat] Fetching memory: ${link.memoryId}`);
                  const memResult = await memoryRegistry.getMemory(link.memoryId);
                  if (memResult.success && memResult.data) {
                    console.log(`[Chat] Memory found: ${memResult.data.name}`);
                    systemPrompt += `\n- "${memResult.data.name || 'Sin nombre'}": ${memResult.data.description || 'Sin descripción'}`;
                  } else {
                    console.log(`[Chat] Memory not found: ${memResult.error}`);
                  }
                } catch (err: any) {
                  console.log(`[Chat] Error fetching memory: ${err.message}`);
                }
              }
              systemPrompt += `\nUsa esta información para responder al usuario de forma contextualizada.`;
            }
          } catch (err: any) {
            console.log(`[Chat] Error fetching linked memories: ${err.message}`);
          }
        }
      } catch {}
    }

    try {
      const response = await fetch(MISTRAL_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MISTRAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Mistral API error:", errText);
        return c.json({ code: "AI_ERROR", message: "Error al conectar con la IA" }, 500);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "No pude generar una respuesta.";

      return c.json({
        reply,
        model: data.model,
        usage: data.usage,
      });
    } catch (err: any) {
      console.error("Chat error:", err.message);
      return c.json({ code: "AI_ERROR", message: "Error al procesar el mensaje" }, 500);
    }
  });

  // Welcome message endpoint
  routes.get("/welcome", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const username = c.req.query("username") || session.username || "usuario";
    const shortAddress = session.address
      ? `${session.address.slice(0, 6)}…${session.address.slice(-4)}`
      : "";
    const welcomeMessage = `¡Hola ${username}! 👋 Soy tu asistente de MemoryChain.

Puedo ayudarte a:
• **Crear memorias** — Guarda información importante en la blockchain
• **Crear agentes** — Configura agentes de IA especializados
• **Vincular memorias a agentes** — Dale conocimiento a tus agentes
• **Consultar tu knowledge base** — Recupera información guardada

¿En qué te puedo ayudar hoy?`;

    return c.json({ message: welcomeMessage, address: shortAddress, username });
  });

  return routes;
}
