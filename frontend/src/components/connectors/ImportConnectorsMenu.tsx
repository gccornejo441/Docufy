import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ConnectorDescriptor } from "../../types/connectors";

type Props = {
    connectors: ConnectorDescriptor[];
    disabled?: boolean;
    menuItemBase: string;
};

export default function ImportConnectorsMenu({ connectors, disabled, menuItemBase }: Props) {
    if (!connectors.length) return null;

    return (
        <>
            <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--gray-10)]">
                Import
            </DropdownMenu.Label>

            {connectors.map((c) => (
                <DropdownMenu.Item
                    key={c.id}
                    onSelect={() => c.onSelect()}
                    disabled={disabled}
                    className={menuItemBase}
                >
                    <img src={c.iconSrc} alt="" aria-hidden="true" className="h-5 w-5" />
                    <span>{c.label}</span>
                </DropdownMenu.Item>
            ))}

            <DropdownMenu.Separator className="my-1 h-px bg-[var(--gray-a6)]" />
        </>
    );
}
