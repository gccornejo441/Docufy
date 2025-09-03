import { API_BASE } from "./api";

export type RecipeIndexItem = {
  id: string;
  name?: string;
  path: string;
  updated_at?: string;
};

export type RecipeIndexResponse = {
  items: RecipeIndexItem[];
};

export type RecipeContent = Record<string, unknown>;

export type ApiError = { detail?: string };

export type RecipePreset = {
  id: string;
  name: string;
  summary: string;
  use_on: string[];
  works_best_when: string[];
  content: Record<string, unknown>;
};

export async function listPresets(): Promise<RecipePreset[]> {
  const res = await fetch(`${API_BASE}/recipes/presets`);
  const text = await res.text();
  const data = text
    ? (JSON.parse(text) as { presets: RecipePreset[] })
    : { presets: [] };
  if (!res.ok) throw new Error("Failed to load presets");
  return data.presets || [];
}

export async function createFromPreset(
  presetId: string,
  newId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/recipes/presets/${encodeURIComponent(presetId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newId, content: {} }),
    }
  );
  const ok = res.ok;
  const text = await res.text();
  if (!ok) {
    try {
      const e = JSON.parse(text);
      throw new Error(e?.detail || "Failed to create from preset");
    } catch {
      throw new Error("Failed to create from preset");
    }
  }
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  const isJson = (res.headers.get("content-type") || "").includes(
    "application/json"
  );
  const data = isJson && text ? (JSON.parse(text) as unknown) : ({} as unknown);

  if (!res.ok) {
    const msg =
      (isJson &&
        typeof data === "object" &&
        data &&
        (data as ApiError).detail) ||
      res.statusText ||
      "Request failed";
    throw new Error(msg);
  }
  return (data as T) ?? ({} as T);
}

export async function listRecipes(): Promise<RecipeIndexItem[]> {
  const res = await fetch(`${API_BASE}/recipes`);
  const data = await handle<RecipeIndexResponse>(res);
  return data.items || [];
}

export async function readRecipe(id: string): Promise<RecipeContent> {
  const res = await fetch(`${API_BASE}/recipes/${encodeURIComponent(id)}`);
  return handle<RecipeContent>(res);
}

export async function createRecipe(
  id: string,
  content: RecipeContent
): Promise<void> {
  const res = await fetch(`${API_BASE}/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, content }),
  });
  await handle<unknown>(res);
}

export async function updateRecipe(
  id: string,
  content: RecipeContent
): Promise<void> {
  const res = await fetch(`${API_BASE}/recipes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  await handle<unknown>(res);
}

export async function deleteRecipe(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await handle<unknown>(res);
}
