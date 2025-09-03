import { useEffect, useState } from "react";
import { API_BASE } from "../../lib/api";
import Button from "../ui/Button";

type Settings = {
  default_watch_folder: string;
  default_recipe_id: string;
  out_dir: string;
};

export default function WatchFolderPanel() {
  const [s, setS] = useState<Settings>({
    default_watch_folder: "C:\\Docufy\\Inbox",
    default_recipe_id: "default",
    out_dir: "C:\\Docufy\\Outbox",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function load() {
    const r = await fetch(`${API_BASE}/settings`);
    const j = await r.json();
    setS(j);
  }

  async function save() {
    setLoading(true); setMsg("");
    const r = await fetch(`${API_BASE}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { setMsg(j?.detail || "Failed to save settings"); return; }
    setS(j);
    setMsg("Saved.");
  }

  async function startWatcher() {
    const body = {
      folder: s.default_watch_folder,
      recipe_id: s.default_recipe_id || "default",
    };
    const r = await fetch(`${API_BASE}/watch/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setMsg(r.ok ? `Watcher started: ${j.key}` : (j?.detail || "Failed to start watcher"));
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Defaults</h2>

        <label className="block mt-3 text-sm">Default watch folder (server path)</label>
        <input
          className="w-full rounded border px-3 py-2"
          value={s.default_watch_folder}
          onChange={(e) => setS({ ...s, default_watch_folder: e.target.value })}
          placeholder="C:\Docufy\Inbox"
        />

        <label className="block mt-3 text-sm">Default recipe id</label>
        <input
          className="w-full rounded border px-3 py-2"
          value={s.default_recipe_id}
          onChange={(e) => setS({ ...s, default_recipe_id: e.target.value })}
          placeholder="default"
        />

        <label className="block mt-3 text-sm">Output folder (server path)</label>
        <input
          className="w-full rounded border px-3 py-2"
          value={s.out_dir}
          onChange={(e) => setS({ ...s, out_dir: e.target.value })}
          placeholder="C:\Docufy\Outbox"
        />

        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={loading}>Save defaults</Button>
          <Button variant="secondary" onClick={startWatcher}>Start watcher with defaults</Button>
        </div>

        {msg && <p className="mt-2 text-sm">{msg}</p>}

        <p className="text-xs opacity-70 mt-3">
          Tip: These are <b>server</b> paths. If your API runs in Docker or on another machine,
          use paths that exist there (e.g., mapped volumes or UNC shares like \\server\scans).
        </p>
      </div>
    </div>
  );
}
