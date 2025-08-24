export function prettyBytes(n?: number | null): string {
if (!Number.isFinite(n as number)) return "";
const units = ["B", "KB", "MB", "GB", "TB"] as const;
const i = Math.floor(Math.log(n as number) / Math.log(1024));
return `${(((n as number) / Math.pow(1024, i))).toFixed(1)} ${units[i]}`;
}