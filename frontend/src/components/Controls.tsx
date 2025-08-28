import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Settings, RotateCcw, Sun, Moon, Monitor, Check } from "lucide-react";
import Button from "./ui/Button";
import { useTheme } from "../provider/useTheme";
import type { Theme } from "../provider/theme.types";
import DpiSettings from "./dpi/DpiSettings";

interface ControlsProps {
  onReset: () => void;
  onRun: () => void;
  isUploading: boolean;
  isDocReady: boolean;
  onOpenDoc: () => void;

  // Optional controlled DPI (pass both to control; omit to let DpiSettings persist itself)
  dpi?: number;
  onChangeDpi?: (dpi: number) => void;
}

export default function Controls({
  onReset,
  onRun,
  isUploading,
  isDocReady,
  onOpenDoc,
  dpi: dpiProp,
  onChangeDpi,
}: ControlsProps) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();

  // Unified Radix menu item styling (Item + RadioItem)
  const menuItemBase =
    "group px-3 py-2 text-sm rounded-md outline-none cursor-pointer flex items-center gap-2 " +
    "data-[highlighted]:bg-[var(--gray-3)] dark:data-[highlighted]:bg-neutral-800 " +
    "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none " +
    "focus-visible:ring-2 focus-visible:ring-[var(--mint-9)]";

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

      {/* Advanced Settings */}
      <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]
                       transition-opacity duration-200
                       data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       w-[min(92vw,600px)] rounded-2xl shadow-2xl border p-5
                       bg-white text-neutral-900
                       dark:bg-neutral-900 dark:text-neutral-50
                       border-neutral-200 dark:border-neutral-700"
          >
            <Dialog.Title className="text-lg font-semibold mb-4">Advanced Settings</Dialog.Title>

            <DpiSettings
              value={dpiProp}
              onChange={onChangeDpi}
            />

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="settings">Close</Button>
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
            className="min-w-[220px] rounded-md border shadow-md
                       bg-white text-neutral-900
                       dark:bg-neutral-900 dark:text-neutral-50
                       border-neutral-200 dark:border-neutral-700
                       p-1"
          >
            <DropdownMenu.Item onSelect={() => setSettingsOpen(true)} className={menuItemBase}>
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

            <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--gray-10)]">
              Theme
            </DropdownMenu.Label>

            <DropdownMenu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <DropdownMenu.RadioItem value="system" className={`${menuItemBase} data-[state=checked]:font-medium`}>
                <Monitor className="w-4 h-4" />
                <span>System</span>
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <Check className="w-4 h-4" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>

              <DropdownMenu.RadioItem value="light" className={`${menuItemBase} data-[state=checked]:font-medium`}>
                <Sun className="w-4 h-4" />
                <span>Light</span>
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <Check className="w-4 h-4" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>

              <DropdownMenu.RadioItem value="dark" className={`${menuItemBase} data-[state=checked]:font-medium`}>
                <Moon className="w-4 h-4" />
                <span>Dark</span>
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <Check className="w-4 h-4" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>

            <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

            <DropdownMenu.Item onSelect={onReset} className={menuItemBase}>
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </section>
  );
}
