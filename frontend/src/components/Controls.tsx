import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  MoreVertical,
  Settings as SettingsIcon,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Check,
  Plug,
  Camera,
  Folder,
  FileCog,
  X,
} from "lucide-react";
import Button from "./ui/Button";
import { useTheme } from "../provider/useTheme";
import type { Theme } from "../provider/theme.types";
import DpiSettings from "./dpi/DpiSettings";
import { useScreenshot } from "../hooks/useScreenshot";
import { API_BASE } from "../lib/api";
import RecipeManager from "./recipes/RecipeManager";

interface ControlsProps {
  onReset: () => void;
  onRun: () => void;
  isUploading: boolean;
  isDocReady: boolean;
  onOpenDoc: () => void;
  dpi?: number;
  onChangeDpi?: (dpi: number) => void;
  showActions?: boolean;
  onManageConnections?: () => void;
  onCaptureScreenshot?: (file: File) => void;
  onCaptureError?: (error: unknown) => void;
}

type SettingsState = {
  default_watch_folder: string;
  default_recipe_id: string;
  out_dir: string;
};

type ApiError = { detail?: string };
type StatusResponse = { active?: string[] };
type StartResponse = { key?: string } & ApiError;

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default function Controls({
  onReset,
  onRun,
  isUploading,
  isDocReady,
  onOpenDoc,
  dpi: dpiProp,
  onChangeDpi,
  showActions = true,
  onManageConnections,
  onCaptureScreenshot,
  onCaptureError,
}: ControlsProps) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [watchOpen, setWatchOpen] = React.useState(false);
  const [recipeMgrOpen, setRecipeMgrOpen] = React.useState(false);

  const { theme, setTheme } = useTheme();

  const { isCapturing, takeScreenshot } = useScreenshot({
    onCaptured: onCaptureScreenshot,
    onError: onCaptureError ?? ((e: unknown) => console.warn("Screenshot error:", e)),
    options: { fileNamePrefix: "screenshot" },
  });

  const menuItemBase =
    "group px-3 py-2 text-sm rounded-md outline-none cursor-pointer flex items-center gap-2 " +
    "data-[highlighted]:bg-[var(--gray-3)] " +
    "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none " +
    "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]";

  // --- Watch folder state/logic ---
  const [form, setForm] = React.useState<SettingsState>({
    default_watch_folder: "C:\\\\Docufy\\\\Inbox",
    default_recipe_id: "default",
    out_dir: "C:\\\\Docufy\\\\Outbox",
  });
  const [recipePath, setRecipePath] = React.useState<string>("");
  const [outDirOverride, setOutDirOverride] = React.useState<string>("");
  const [activeWatchers, setActiveWatchers] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");

  async function loadSettings() {
    try {
      const r = await fetch(`${API_BASE}/settings`);
      const j = (await r.json()) as SettingsState | ApiError;
      if (r.ok) setForm(j as SettingsState);
      else setMsg((j as ApiError).detail ?? "Failed to load settings");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    }
  }

  async function saveSettings() {
    try {
      setBusy(true);
      setMsg("");
      const r = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await r.json()) as SettingsState | ApiError;
      if (r.ok) {
        setForm(j as SettingsState);
        setMsg("Defaults saved.");
      } else {
        setMsg((j as ApiError).detail ?? "Failed to save settings");
      }
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshWatchers() {
    try {
      const r = await fetch(`${API_BASE}/watch/status`);
      const j = (await r.json()) as StatusResponse;
      if (r.ok) setActiveWatchers(j.active ?? []);
    } catch {
      /* noop */
    }
  }

  async function startWatcher() {
    try {
      setBusy(true);
      setMsg("");

      const payload: Record<string, string> = {
        folder: form.default_watch_folder,
      };
      if (recipePath.trim()) {
        payload.recipe_path = recipePath.trim();
      } else {
        payload.recipe_id = form.default_recipe_id || "default";
      }
      if (outDirOverride.trim()) {
        payload.out_dir = outDirOverride.trim();
      }

      const r = await fetch(`${API_BASE}/watch/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as StartResponse;
      if (r.ok) setMsg(`Watcher started: ${j.key ?? "(no key returned)"}`);
      else setMsg(j.detail ?? "Failed to start watcher");
      await refreshWatchers();
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function stopWatcher(key: string) {
    try {
      setBusy(true);
      const r = await fetch(`${API_BASE}/watch/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!r.ok) {
        const j = (await r.json()) as ApiError;
        setMsg(j.detail ?? "Failed to stop watcher");
      }
      await refreshWatchers();
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Load settings/status when opening the dialog
  React.useEffect(() => {
    if (watchOpen) {
      void loadSettings();
      void refreshWatchers();
    }
  }, [watchOpen]);

  return (
    <section className="flex flex-wrap gap-4 items-end w-full">
      {showActions ? (
        <div className="flex gap-3 items-center">
          <Button
            variant="primary"
            onClick={onOpenDoc}
            disabled={!isDocReady}
            aria-disabled={!isDocReady}
            title={!isDocReady ? "Upload a PDF first" : "Open Viewer"}
          >
            Open Viewer
          </Button>

          <Button
            variant="primary"
            onClick={onRun}
            disabled={!isDocReady || isUploading}
            aria-disabled={!isDocReady || isUploading}
            title={!isDocReady ? "Upload a PDF first" : isUploading ? "Processing…" : "Run OCR"}
          >
            {isUploading ? "Processing…" : "Run OCR"}
          </Button>

          <Button variant="secondary" onClick={onReset} title="Reset">
            Reset
          </Button>

          <span id="hint-upload-first" className="sr-only">
            Upload a PDF before running OCR or opening the viewer.
          </span>
        </div>
      ) : (
        <div aria-hidden className="h-10" />
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Advanced (DPI) Settings dialog */}
        <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[var(--gray-a8)] backdrop-blur-[2px] data-[state=open]:opacity-100 data-[state=closed]:opacity-0" />
            {/* Card is the content itself (not full-screen) so outside click closes */}
            <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,600px)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl border bg-[var(--surface-1)] text-[var(--gray-12)] border-[var(--gray-a6)] focus:outline-none">
              <div className="relative flex flex-col max-h-[85vh]">
                <header className="p-4 border-b">
                  <Dialog.Title className="text-lg font-semibold">
                    Advanced Settings
                  </Dialog.Title>
                  {/* Close icon in header */}
                  <Dialog.Close
                    aria-label="Close"
                    className="absolute right-3 top-3 p-1 rounded hover:bg-[var(--gray-3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  >
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                </header>

                {/* Scroll area */}
                <div className="p-4 overflow-y-auto">
                  <DpiSettings value={dpiProp} onChange={onChangeDpi} />
                </div>

                <footer className="p-4 border-t flex justify-end">
                  {/* Extra safety: also close via state in case custom Button doesn’t forward refs */}
                  <Dialog.Close asChild>
                    <Button type="button" variant="settings" onClick={() => setSettingsOpen(false)}>
                      Close
                    </Button>
                  </Dialog.Close>
                </footer>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Watch Folder Settings dialog */}
        <Dialog.Root open={watchOpen} onOpenChange={setWatchOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[var(--gray-a8)] backdrop-blur-[2px] data-[state=open]:opacity-100 data-[state=closed]:opacity-0" />
            {/* Card is the content itself (not full-screen) so outside click closes */}
            <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,720px)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl border bg-[var(--surface-1)] text-[var(--gray-12)] border-[var(--gray-a6)] focus:outline-none">
              <div className="relative flex flex-col max-h-[85vh]">
                <header className="p-4 border-b">
                  <Dialog.Title className="text-lg font-semibold">
                    Watch Folder Settings
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Configure server-side watch folder, recipe, and output directory. Includes optional per-watcher overrides.
                  </Dialog.Description>
                  {/* Close icon in header */}
                  <Dialog.Close
                    aria-label="Close"
                    className="absolute right-3 top-3 p-1 rounded hover:bg-[var(--gray-3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  >
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                </header>

                {/* Scroll area */}
                <div className="p-4 overflow-y-auto">
                  <p className="text-sm opacity-80 mb-3">
                    These are <b>server</b> paths. If your API runs in Docker or on another machine,
                    use paths that exist there (e.g., mounted volumes or UNC shares like <code>\\server\scans</code>).
                  </p>

                  <div className="grid gap-3">
                    <label className="text-sm">Default watch folder</label>
                    <input
                      className="w-full rounded border px-3 py-2 break-all"
                      value={form.default_watch_folder}
                      onChange={(e) => setForm((s) => ({ ...s, default_watch_folder: e.target.value }))}
                      placeholder="C:\\Docufy\\Inbox"
                      autoComplete="off"
                    />

                    <label className="text-sm mt-2">Default recipe id</label>
                    <input
                      className="w-full rounded border px-3 py-2 break-all"
                      value={form.default_recipe_id}
                      onChange={(e) => setForm((s) => ({ ...s, default_recipe_id: e.target.value }))}
                      placeholder="default"
                      autoComplete="off"
                    />

                    <label className="text-sm mt-2">Output folder</label>
                    <input
                      className="w-full rounded border px-3 py-2 break-all"
                      value={form.out_dir}
                      onChange={(e) => setForm((s) => ({ ...s, out_dir: e.target.value }))}
                      placeholder="C:\\Docufy\\Outbox"
                      autoComplete="off"
                    />

                    {/* Optional overrides for this watcher only */}
                    <div className="mt-4 rounded-lg border p-3">
                      <div className="text-sm font-medium mb-2">Per-watcher overrides (optional)</div>

                      <label className="text-sm">Recipe file (server path or UNC)</label>
                      <input
                        className="w-full rounded border px-3 py-2 break-all"
                        value={recipePath}
                        onChange={(e) => setRecipePath(e.target.value)}
                        placeholder="C:\\Docufy\\Recipes\\invoices_v3.json"
                        autoComplete="off"
                      />
                      <p className="text-xs opacity-70 mt-1">
                        If set, this overrides the recipe id above.
                      </p>

                      <label className="text-sm mt-3">Watcher output folder override</label>
                      <input
                        className="w-full rounded border px-3 py-2 break-all"
                        value={outDirOverride}
                        onChange={(e) => setOutDirOverride(e.target.value)}
                        placeholder="C:\\Docufy\\Outbox\\Invoices"
                        autoComplete="off"
                      />
                      <p className="text-xs opacity-70 mt-1">
                        If set, results from this watcher will be written here instead of the global output folder.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={saveSettings} disabled={busy}>
                      <span className="whitespace-nowrap">Save defaults</span>
                    </Button>
                    <Button variant="secondary" onClick={startWatcher} disabled={busy}>
                      <span className="whitespace-nowrap">Start watcher with defaults/overrides</span>
                    </Button>
                    <Button variant="ghost" onClick={() => void refreshWatchers()}>
                      <span className="whitespace-nowrap">Refresh status</span>
                    </Button>
                  </div>

                  {msg && <p className="mt-2 text-sm" aria-live="polite">{msg}</p>}

                  <div className="mt-5 rounded-xl border p-3">
                    <div className="font-medium">Active watchers</div>
                    {activeWatchers.length === 0 ? (
                      <div className="text-sm opacity-70 mt-2">None</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {activeWatchers.map((k) => (
                          <li key={k} className="flex items-center justify-between gap-2 rounded border p-2">
                            <code className="text-xs break-all">{k}</code>
                            <Button variant="ghost" onClick={() => void stopWatcher(k)} disabled={busy}>
                              Stop
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <footer className="p-4 border-t flex justify-end gap-2">
                  {/* Extra safety: also close via state in case custom Button doesn’t forward refs */}
                  <Dialog.Close asChild>
                    <Button type="button" variant="settings" onClick={() => setWatchOpen(false)}>
                      Close
                    </Button>
                  </Dialog.Close>
                </footer>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Recipe Manager dialog (owns its own sizing/close behavior) */}
        <RecipeManager open={recipeMgrOpen} onOpenChange={setRecipeMgrOpen} />

        {/* Dropdown trigger & content */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="p-2 rounded hover:bg-[var(--gray-3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--surface-1)]"
              aria-label="More actions"
              aria-haspopup="menu"
            >
              <MoreVertical className="w-5 h-5 text-[var(--gray-12)]" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="min-w-[280px] rounded-md border shadow-md bg-[var(--surface-1)] text-[var(--gray-12)] border-[var(--gray-a6)] p-1"
            >
              {/* Capture */}
              <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--gray-10)]">
                Capture
              </DropdownMenu.Label>

              <DropdownMenu.Item
                onSelect={() => void takeScreenshot()}
                className={menuItemBase}
                disabled={isCapturing}
                aria-disabled={isCapturing}
                aria-busy={isCapturing}
              >
                <Camera className="w-4 h-4" />
                <span>{isCapturing ? "Capturing…" : "Take a screenshot…"}</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--gray-a6)]" />

              {onManageConnections && (
                <>
                  <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--gray-10)]">
                    Connections
                  </DropdownMenu.Label>
                  <DropdownMenu.Item onSelect={() => onManageConnections()} className={menuItemBase}>
                    <Plug className="w-4 h-4" />
                    <span>Connect services…</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--gray-a6)]" />
                </>
              )}

              {/* Recipes manager */}
              <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--gray-10)]">
                Recipes
              </DropdownMenu.Label>
              <DropdownMenu.Item onSelect={() => setRecipeMgrOpen(true)} className={menuItemBase}>
                <FileCog className="w-4 h-4" />
                <span>Manage recipes…</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--gray-a6)]" />

              {/* Watch folder settings (opens dialog) */}
              <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--gray-10)]">
                Automation
              </DropdownMenu.Label>
              <DropdownMenu.Item onSelect={() => setWatchOpen(true)} className={menuItemBase}>
                <Folder className="w-4 h-4" />
                <span>Watch folder settings…</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--gray-a6)]" />

              {/* Advanced (DPI) Settings opener */}
              <DropdownMenu.Item onSelect={() => setSettingsOpen(true)} className={menuItemBase}>
                <SettingsIcon className="w-4 h-4" />
                <span>Settings</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--gray-a6)]" />

              {/* Theme */}
              <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--gray-10)]">
                Theme
              </DropdownMenu.Label>

              <DropdownMenu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                <DropdownMenu.RadioItem
                  value="system"
                  className={`${menuItemBase} data-[state=checked]:font-medium`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>System</span>
                  <DropdownMenu.ItemIndicator className="ml-auto">
                    <Check className="w-4 h-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>

                <DropdownMenu.RadioItem
                  value="light"
                  className={`${menuItemBase} data-[state=checked]:font-medium`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                  <DropdownMenu.ItemIndicator className="ml-auto">
                    <Check className="w-4 h-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>

                <DropdownMenu.RadioItem
                  value="dark"
                  className={`${menuItemBase} data-[state=checked]:font-medium`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark</span>
                  <DropdownMenu.ItemIndicator className="ml-auto">
                    <Check className="w-4 h-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--gray-a6)]" />

              <DropdownMenu.Item onSelect={onReset} className={menuItemBase}>
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </section>
  );
}
