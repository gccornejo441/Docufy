import * as Toast from "@radix-ui/react-toast";

interface ToasterProps {
open: boolean; onOpenChange: (open: boolean) => void;
title?: string; description?: string;
}


export default function Toaster({ open, onOpenChange, title = "Error", description = "" }: ToasterProps) {
return (
<Toast.Provider swipeDirection="right">
<Toast.Root open={open} onOpenChange={onOpenChange} className="bg-white border shadow rounded p-3 max-w-sm">
<Toast.Title className="font-medium">{title}</Toast.Title>
{description && <Toast.Description className="text-sm text-gray-700 mt-1">{description}</Toast.Description>}
</Toast.Root>
<Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 outline-none" />
</Toast.Provider>
);
}