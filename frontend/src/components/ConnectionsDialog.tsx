import React from "react";
import DocumentViewerDialog from "./DocumentViewerDialog";
import Button from "./ui/Button";
import { Loader2, CheckCircle2 } from "lucide-react";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    connected: { sharepoint: boolean };
    onConnectSharePoint: () => Promise<void>;
    onDisconnectSharePoint: () => Promise<void>;
    spAccountEmail?: string;
    spVerifiedAt?: string;
};

export default function ConnectionsDialog({
    open,
    onOpenChange,
    connected,
    onConnectSharePoint,
    onDisconnectSharePoint,
    spAccountEmail,
    spVerifiedAt,
}: Props) {
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const connectedLine = connected.sharepoint
        ? `Connected${spAccountEmail ? ` as ${spAccountEmail}` : ""}`
        : "Not connected";

    return (
        <DocumentViewerDialog open={open} onOpenChange={onOpenChange} title="Connected services">
            <div className="space-y-4">
                {error && (
                    <div
                        role="alert"
                        className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded px-2 py-1"
                    >
                        {error}
                    </div>
                )}

                <div className="flex items-center gap-3 border rounded-lg p-3 border-[color:var(--gray-a6)]">
                    <img src="/sharepoint.svg" alt="" className="h-5 w-5" />
                    <div className="flex-1">
                        <div className="text-sm font-medium">Microsoft SharePoint</div>
                        <div id="sp-status" className="text-xs text-[color:var(--gray-11)]">
                            {busy ? "Connecting to SharePoint…" : connectedLine}
                        </div>

                        {connected.sharepoint && !busy && (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--mint-10)]">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>
                                    Connected{spVerifiedAt ? ` · verified ${new Date(spVerifiedAt).toLocaleString()}` : ""}
                                </span>
                            </div>
                        )}
                    </div>

                    {connected.sharepoint ? (
                        <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={async () => {
                                setError(null);
                                setBusy(true);
                                try {
                                    await onDisconnectSharePoint();
                                } catch (e) {
                                    setError("Could not disconnect SharePoint.");
                                    // eslint-disable-next-line no-console
                                    console.error(e);
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            {busy ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Disconnecting…
                                </span>
                            ) : (
                                "Disconnect"
                            )}
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            aria-describedby="sp-status"
                            disabled={busy}
                            onClick={async () => {
                                setError(null);
                                setBusy(true);
                                try {
                                    await onConnectSharePoint();
                                } catch (e) {
                                    setError("Could not connect SharePoint.");
                                    // eslint-disable-next-line no-console
                                    console.error(e);
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            {busy ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Connecting…
                                </span>
                            ) : (
                                "Connect"
                            )}
                        </Button>
                    )}
                </div>

                <span className="sr-only" role="status" aria-live="polite">
                    {busy
                        ? "Connecting to SharePoint…"
                        : connected.sharepoint
                            ? "SharePoint connection established."
                            : error
                                ? "SharePoint connection failed."
                                : ""}
                </span>
            </div>
        </DocumentViewerDialog>
    );
}
