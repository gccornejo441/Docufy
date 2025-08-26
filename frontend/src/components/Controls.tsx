import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Settings, RotateCcw } from "lucide-react";
import Button from "./ui/Button";

interface ControlsProps {
  onReset: () => void;
  onRun: () => void;
  isUploading: boolean;
  isDocReady: boolean;
  onOpenDoc: () => void;
}

export default function Controls({
  onReset,
  onRun,
  isUploading,
  isDocReady,
  onOpenDoc,
}: ControlsProps) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <section className="flex flex-wrap gap-4 items-end w-full">
      <div className="ml-auto flex gap-3 items-center">

        <Button variant="primary" onClick={onOpenDoc} disabled={!isDocReady}>
          Open Viewer
        </Button>

        <Button variant="primary" onClick={onRun} disabled={isUploading}>
          {isUploading ? "Processing…" : "Run OCR"}
        </Button>
      </div>

      <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]
                       transition-opacity duration-200
                       data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       w-[min(92vw,520px)] rounded-2xl shadow-2xl border p-5
                       bg-white text-neutral-900
                       dark:bg-neutral-900 dark:text-neutral-50
                       border-neutral-200 dark:border-neutral-700"
          >
            <Dialog.Title className="text-lg font-semibold mb-2">Advanced Settings</Dialog.Title>
            <p className="text-sm text-[var(--gray-10)]">
              Configure advanced options here (e.g., clarity, language, DPI) when needed.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="secondary">Close</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="p-2 rounded hover:bg-[var(--gray-3)] focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5 text-[var(--gray-12)]" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="min-w-[180px] rounded-md border shadow-md
                         bg-white text-neutral-900
                         dark:bg-neutral-900 dark:text-neutral-50
                         border-neutral-200 dark:border-neutral-700
                         p-1"
          >
            <DropdownMenu.Item
              onSelect={() => setSettingsOpen(true)}
              className="px-3 py-2 text-sm rounded cursor-pointer
                           hover:bg-[var(--gray-3)] dark:hover:bg-neutral-800
                           flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

            <DropdownMenu.Item
              onSelect={onReset}
              className="px-3 py-2 text-sm rounded cursor-pointer
                           hover:bg-[var(--gray-3)] dark:hover:bg-neutral-800
                           flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

    </section>
  );
}
