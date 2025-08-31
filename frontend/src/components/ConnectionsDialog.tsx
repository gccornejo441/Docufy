// components/ConnectionsDialog.tsx
import React from "react";
import DocumentViewerDialog from "./DocumentViewerDialog";
import Button from "./ui/Button";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    connected: { sharepoint: boolean };
    onConnectSharePoint: () => Promise<void>;
    onDisconnectSharePoint: () => Promise<void>;
};

export default function ConnectionsDialog({
    open, onOpenChange, connected,
    onConnectSharePoint, onDisconnectSharePoint
}: Props) {
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    return (
        <DocumentViewerDialog open={open} onOpenChange={onOpenChange} title="Connected services">
            <div className="space-y-4">
                {error && (
                    <div role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded px-2 py-1">
                        {error}
                    </div>
                )}

                <div className="flex items-center gap-3 border rounded-lg p-3 border-[color:var(--gray-a6)]">
                    <img src="/sharepoint.svg" alt="" className="h-5 w-5" />
                    <div className="flex-1">
                        <div className="text-sm font-medium">Microsoft SharePoint</div>
                        <div className="text-xs text-[color:var(--gray-11)]">
                            {connected.sharepoint ? "Connected to your work account" : "Not connected"}
                        </div>
                    </div>
                    {connected.sharepoint ? (
                        <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={async () => {
                                setError(null); setBusy(true);
                                try { await onDisconnectSharePoint(); }
                                catch (e) { setError("Could not disconnect SharePoint."); console.error(e); }
                                finally { setBusy(false); }
                            }}
                        >
                            Disconnect
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            disabled={busy}
                            onClick={async () => {
                                setError(null); setBusy(true);
                                try { await onConnectSharePoint(); }
                                catch (e) { setError("Could not connect SharePoint."); console.error(e); }
                                finally { setBusy(false); }
                            }}
                        >
                            Connect
                        </Button>
                    )}
                </div>
            </div>
        </DocumentViewerDialog>
    );
}
