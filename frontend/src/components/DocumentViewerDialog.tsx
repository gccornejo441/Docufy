import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

interface DocumentViewerDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title?: string;
    children: ReactNode;
}

export default function DocumentViewerDialog({
    open,
    onOpenChange,
    title = "Document Viewer",
    children,
}: DocumentViewerDialogProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 data-[state=open]:animate-fade-in" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[95vw] max-w-6xl h-[85vh]
                     rounded-xl shadow-xl border
                     bg-[var(--color-panel-solid)]
                     text-[var(--gray-12)]
                     p-4 flex flex-col gap-3"
                >
                    <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-medium">{title}</Dialog.Title>
                        <Dialog.Close
                            className="px-3 py-1 rounded border hover:bg-[var(--gray-3)] focus:outline-none"
                            aria-label="Close"
                        >
                            Close
                        </Dialog.Close>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 min-h-0 overflow-auto rounded bg-[var(--color-panel)] p-2">
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
