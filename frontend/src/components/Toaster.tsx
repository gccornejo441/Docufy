import * as Toast from "@radix-ui/react-toast";

interface ToasterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Toaster({
  open,
  onOpenChange,
  title = "Notice",
  description = "",
  actionLabel,
  onAction,
}: ToasterProps) {
  return (
    <Toast.Provider swipeDirection="right" duration={5000}>
      <Toast.Root
        open={open}
        onOpenChange={onOpenChange}
        className="
          relative grid gap-2 max-w-sm p-3 pr-10
          rounded-xl border shadow-[var(--shadow-4)]
          bg-[var(--color-panel-solid)] border-[var(--gray-a7)]
          text-[var(--gray-12)]
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[swipe=end]:animate-out
        "
      >
        <div className="text-sm font-medium">{title}</div>
        {description && (
          <Toast.Description className="text-sm text-[var(--gray-11)]">
            {description}
          </Toast.Description>
        )}

        {actionLabel && (
          <Toast.Action asChild altText={actionLabel}>
            <button
              type="button"
              onClick={onAction}
              className="
                mt-1 inline-flex items-center justify-center px-3 py-1.5 rounded
                bg-[var(--accent-9)] text-[var(--gray-1)]
                hover:bg-[var(--accent-10)]
                focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)]
              "
            >
              {actionLabel}
            </button>
          </Toast.Action>
        )}

        <Toast.Close
          aria-label="Close"
          className="
            absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center
            rounded bg-[var(--gray-5)] text-[var(--gray-12)]
            hover:bg-[var(--gray-6)]
            focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)]
          "
        >
          ×
        </Toast.Close>
      </Toast.Root>

      <Toast.Viewport
        className="
          fixed bottom-4 right-4 z-[100]
          m-0 flex w-[390px] max-w-[100vw] list-none flex-col gap-2 p-0 outline-none
        "
      />
    </Toast.Provider>
  );
}
