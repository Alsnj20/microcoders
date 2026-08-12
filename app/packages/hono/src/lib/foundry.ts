export interface FoundryDeployment {
  name: string;
  modelName: string;
  modelVersion: string;
  modelPublisher: string;
  capabilities?: Record<string, string>;
  sku?: {
    capacity: number;
    family: string;
    name: string;
    size: string;
    tier: string;
  };
  connectionName?: string;
}

const FOUNDRY_PROJECT_URL = process.env.FOUNDRY_PROJECT_URL || "";
const FOUNDRY_KEY = process.env.FOUNDRY_KEY || "";
const FOUNDRY_API_VERSION = process.env.FOUNDRY_API_VERSION || "2025-05-01";

export async function listFoundryDeployments(): Promise<FoundryDeployment[]> {
  if (!FOUNDRY_PROJECT_URL || !FOUNDRY_KEY) {
    console.warn("[Foundry] FOUNDRY_PROJECT_URL or FOUNDRY_KEY not configured");
    return [];
  }

  const url = `${FOUNDRY_PROJECT_URL}/deployments?api-version=${encodeURIComponent(FOUNDRY_API_VERSION)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "api-key": FOUNDRY_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[Foundry] deployments request failed: ${response.status} ${errText}`);
      return [];
    }

    const data = (await response.json()) as { value?: FoundryDeployment[] };
    return data.value ?? [];
  } catch (err: any) {
    console.error("[Foundry] deployments request error:", err.message);
    return [];
  }
}
