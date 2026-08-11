// Prices are keyed by Foundry deployment name (what the chat API receives as `model`).
export const MODEL_PRICES: Record<string, number> = {
  "gpt-4o": 2,
  "gpt-4o-mini": 1,
  "claude-sonnet-4-20250514": 3,
  "claude-haiku": 1,
  "gemini-2.0-flash": 1,
  "gemini-2.5-pro": 2,
};

const DEFAULT_COST_IN_MC = 1;

export function getModelCost(model: string): number {
  return MODEL_PRICES[model] ?? DEFAULT_COST_IN_MC;
}
