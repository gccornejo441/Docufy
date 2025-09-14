import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { twMerge } from "tailwind-merge";
import {
    Trash2,
    Plus,
    Save,
    Download,
    Upload,
    PencilLine,
    Folder,
    Sparkles,
} from "lucide-react";
import Button from "../ui/Button";
import {
    listRecipes,
    readRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    listPresets,
    createFromPreset,
} from "../../lib/recipes";
import type {
    RecipeIndexItem,
    RecipeContent,
    RecipePreset,
} from "../../lib/recipes";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

function getErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    try {
        return JSON.stringify(e);
    } catch {
        return String(e);
    }
}

export default function RecipeManager({ open, onOpenChange }: Props) {
    const [items, setItems] = React.useState<RecipeIndexItem[]>([]);
    const [presets, setPresets] = React.useState<RecipePreset[]>([]);
    const [selectedId, setSelectedId] = React.useState<string>("");
    const [editor, setEditor] = React.useState<string>(
        "{\n  \"name\": \"New recipe\",\n  \"language\": \"eng\",\n  \"preprocess\": { \"dpi\": 360 }\n}"
    );
    const [loading, setLoading] = React.useState<boolean>(false);
    const [dirty, setDirty] = React.useState<boolean>(false);
    const [msg, setMsg] = React.useState<string>("");

    async function refreshList() {
        try {
            setLoading(true);
            const rows = await listRecipes();
            setItems(rows);
            if (selectedId && !rows.find((r) => r.id === selectedId)) {
                setSelectedId("");
            }
        } catch (e: unknown) {
            setMsg(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    async function refreshPresets() {
        try {
            const ps = await listPresets();
            setPresets(ps);
        } catch (e: unknown) {
            setMsg(getErrorMessage(e));
        }
    }

    async function loadRecipe(id: string) {
        try {
            setLoading(true);
            const data = await readRecipe(id);
            setSelectedId(id);
            setEditor(JSON.stringify(data, null, 2));
            setDirty(false);
            setMsg("");
        } catch (e: unknown) {
            setMsg(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    function onChangeEditor(v: string) {
        setEditor(v);
        setDirty(true);
    }

    function parseEditor(): RecipeContent | null {
        try {
            const parsed = JSON.parse(editor) as RecipeContent;
            return parsed;
        } catch (e) {
            setMsg("Invalid JSON: " + getErrorMessage(e));
            return null;
        }
    }

    async function onSave() {
        const data = parseEditor();
        if (!data) return;

        try {
            setLoading(true);
            if (selectedId) {
                await updateRecipe(selectedId, data);
                setDirty(false);
                setMsg("Saved.");
            } else {
                const id = window.prompt(
                    "Enter a recipe id (filename without .json):",
                    "new_recipe"
                );
                if (!id) return;
                await createRecipe(id, data);
                setSelectedId(id);
                setDirty(false);
                setMsg("Created.");
                await refreshList();
            }
        } catch (e: unknown) {
            setMsg(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    async function onDelete(id: string) {
        if (!window.confirm(`Delete recipe "${id}"? This cannot be undone.`)) return;
        try {
            setLoading(true);
            await deleteRecipe(id);
            setMsg("Deleted.");
            setSelectedId("");
            setEditor(
                "{\n  \"name\": \"New recipe\",\n  \"language\": \"eng\",\n  \"preprocess\": { \"dpi\": 360 }\n}"
            );
            setDirty(false);
            await refreshList();
        } catch (e: unknown) {
            setMsg(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    function onDownload() {
        const id = selectedId || "recipe";
        const blob = new Blob([editor], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${id}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function onUploadFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result ?? "");
            setEditor(text);
            setDirty(true);
            setMsg(`Loaded ${file.name}. Review and Save to store on server.`);
        };
        reader.onerror = () => setMsg("Failed to read file.");
        reader.readAsText(file);
    }

    async function onUsePreset(preset: RecipePreset) {
        const id = window.prompt(
            `Create recipe from “${preset.name}”. Enter a new recipe id:`,
            preset.id
        );
        if (!id) return;
        try {
            setLoading(true);
            await createFromPreset(preset.id, id);
            setMsg(`Created “${id}” from ${preset.name}.`);
            await refreshList();
            await loadRecipe(id);
        } catch (e: unknown) {
            setMsg(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    React.useEffect(() => {
        if (open) {
            void refreshList();
            void refreshPresets();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-[var(--gray-a8)] backdrop-blur-[2px] transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(96vw,1000px)] h-[min(92vh,760px)] rounded-2xl shadow-2xl border bg-[var(--surface-1)] text-[var(--gray-12)] border-[var(--gray-a6)] focus:outline-none p-0 overflow-hidden">
                    <Tooltip.Provider delayDuration={200}>
                        <div className="flex h-full min-w-0 min-h-0">
                            {/* Sidebar */}
                            <aside className="w-[260px] sm:w-[300px] md:w-[340px] border-r p-4 flex flex-col gap-3 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Folder className="w-5 h-5 shrink-0" />
                                    <h2 className="font-semibold truncate">Recipes</h2>
                                </div>

                                {/* Starter templates */}
                                <div className="rounded-xl border p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 shrink-0" />
                                        <span className="font-medium">Starter templates</span>
                                    </div>
                                    {presets.length === 0 ? (
                                        <div className="text-sm opacity-70">Loading…</div>
                                    ) : (
                                        <ul className="grid gap-3">
                                            {presets.map((p) => (
                                                <li key={p.id} className="rounded border p-3">
                                                    <div className="font-medium">{p.name}</div>
                                                    <div className="text-sm opacity-80 mt-1">{p.summary}</div>
                                                    <div className="mt-2">
                                                        <div className="text-xs font-semibold">Use on</div>
                                                        <ul className="text-xs list-disc ml-5">
                                                            {p.use_on.slice(0, 2).map((u) => (
                                                                <li key={u}>{u}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className="mt-2">
                                                        <button
                                                            className="mt-1 text-sm underline hover:opacity-80 whitespace-nowrap"
                                                            onClick={() => void onUsePreset(p)}
                                                        >
                                                            Use template…
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            setSelectedId("");
                                            setEditor(
                                                "{\n  \"name\": \"New recipe\",\n  \"language\": \"eng\",\n  \"preprocess\": { \"dpi\": 360 }\n}"
                                            );
                                            setDirty(true);
                                            setMsg("");
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="whitespace-nowrap">New</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => void refreshList()}
                                        disabled={loading}
                                        title="Refresh"
                                    >
                                        <span className="whitespace-nowrap">Refresh</span>
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-auto rounded border min-h-0">
                                    {items.length === 0 ? (
                                        <div className="p-3 text-sm opacity-70">No recipes yet.</div>
                                    ) : (
                                        <ul>
                                            {items.map((it) => (
                                                <li
                                                    key={it.id}
                                                    className={twMerge(
                                                        "px-3 py-2 text-sm cursor-pointer hover:bg-[var(--gray-3)] flex items-center justify-between gap-2",
                                                        it.id === selectedId && "bg-[var(--gray-3)] font-medium"
                                                    )}
                                                >
                                                    <button
                                                        className="text-left flex-1 truncate min-w-0"
                                                        onClick={() => void loadRecipe(it.id)}
                                                        title={it.path}
                                                    >
                                                        <span className="truncate block">{it.name || it.id}</span>
                                                        <div className="text-xs opacity-60 truncate">{it.path}</div>
                                                    </button>

                                                    {/* Delete */}
                                                    <Tooltip.Root>
                                                        <Tooltip.Trigger asChild>
                                                            <button
                                                                className="p-1 rounded hover:bg-[var(--gray-4)] shrink-0"
                                                                onClick={() => void onDelete(it.id)}
                                                                aria-label={`Delete ${it.name || it.id}`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </Tooltip.Trigger>
                                                        <Tooltip.Portal>
                                                            <Tooltip.Content
                                                                side="top"
                                                                sideOffset={6}
                                                                className="rounded-md px-2 py-1 text-xs bg-[var(--gray-12)] text-[var(--gray-1)] shadow"
                                                            >
                                                                Delete
                                                                <Tooltip.Arrow className="fill-[var(--gray-12)]" />
                                                            </Tooltip.Content>
                                                        </Tooltip.Portal>
                                                    </Tooltip.Root>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="text-xs opacity-70">
                                    Files are stored on the server (e.g., <code>/backend/recipes</code>).
                                </div>
                            </aside>

                            {/* Editor */}
                            <main className="flex-1 flex flex-col min-w-0 min-h-0">
                                {/* HEADER */}
                                <header className="p-4 border-b flex items-center gap-2 flex-wrap">
                                    <PencilLine className="w-5 h-5 shrink-0" />
                                    <div className="font-medium min-w-0 truncate">
                                        {selectedId ? `Editing: ${selectedId}.json` : "New recipe (unsaved)"}
                                    </div>
                                    {dirty && (
                                        <span className="ml-2 text-xs rounded bg-yellow-200/50 px-2 py-0.5 text-yellow-900 shrink-0">
                                            Unsaved
                                        </span>
                                    )}

                                    {/* Action group (tooltips) */}
                                    <div className="ml-auto flex gap-2 flex-wrap sm:flex-nowrap overflow-x-auto sm:overflow-visible max-w-full">
                                        {/* Upload */}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger asChild>
                                                <label
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-[var(--gray-3)] shrink-0 whitespace-nowrap"
                                                    aria-label="Load from file"
                                                    title=""
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Load from file…</span>
                                                    <input
                                                        type="file"
                                                        accept="application/json"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const f = e.currentTarget.files?.[0];
                                                            if (f) onUploadFile(f);
                                                            e.currentTarget.value = "";
                                                        }}
                                                    />
                                                </label>
                                            </Tooltip.Trigger>
                                            <Tooltip.Portal>
                                                <Tooltip.Content
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className="rounded-md px-2 py-1 text-xs bg-[var(--gray-12)] text-[var(--gray-1)] shadow"
                                                >
                                                    Load from file
                                                    <Tooltip.Arrow className="fill-[var(--gray-12)]" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>

                                        {/* Download */}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger asChild>
                                                <span>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={onDownload}
                                                        disabled={!editor}
                                                        aria-label="Download recipe JSON"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        <span className="hidden sm:inline whitespace-nowrap">
                                                            Download
                                                        </span>
                                                    </Button>
                                                </span>
                                            </Tooltip.Trigger>
                                            <Tooltip.Portal>
                                                <Tooltip.Content
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className="rounded-md px-2 py-1 text-xs bg-[var(--gray-12)] text-[var(--gray-1)] shadow"
                                                >
                                                    Download JSON
                                                    <Tooltip.Arrow className="fill-[var(--gray-12)]" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>

                                        {/* Save */}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger asChild>
                                                <span>
                                                    <Button
                                                        onClick={() => void onSave()}
                                                        disabled={loading}
                                                        aria-label="Save recipe"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        <span className="hidden sm:inline whitespace-nowrap">Save</span>
                                                    </Button>
                                                </span>
                                            </Tooltip.Trigger>
                                            <Tooltip.Portal>
                                                <Tooltip.Content
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className="rounded-md px-2 py-1 text-xs bg-[var(--gray-12)] text-[var(--gray-1)] shadow"
                                                >
                                                    Save changes
                                                    <Tooltip.Arrow className="fill-[var(--gray-12)]" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>
                                    </div>
                                </header>

                                <div className="flex-1 min-h-0">
                                    <textarea
                                        className="w-full h-full p-4 font-mono text-sm outline-none resize-none min-w-0 min-h-0"
                                        spellCheck={false}
                                        value={editor}
                                        onChange={(e) => onChangeEditor(e.target.value)}
                                    />
                                </div>

                                <footer className="p-3 border-t flex items-center justify-between">
                                    <div className="text-sm truncate min-w-0">{msg}</div>

                                    {/* Close (tooltip optional; leaving as-is since it's descriptive) */}
                                    <Dialog.Close asChild>
                                        <Button variant="settings">
                                            <span className="whitespace-nowrap">Close</span>
                                        </Button>
                                    </Dialog.Close>
                                </footer>
                            </main>
                        </div>
                    </Tooltip.Provider>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
