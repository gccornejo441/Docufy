import React from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "settings";
}

export default function Button({ variant = "primary", className, ...props }: ButtonProps) {
    const base =
        "px-4 py-2 rounded font-medium focus:outline-none focus:ring-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
        primary:
            "bg-[var(--mint-9)] text-[var(--gray-1)] hover:bg-[var(--mint-10)] focus:ring-[var(--mint-9)]",
        secondary:
            "bg-[var(--gray-5)] text-[var(--gray-12)] hover:bg-[var(--gray-6)] focus:ring-[var(--mint-9)]",
        settings:
            "bg-[var(--gray-3)] text-[var(--gray-12)] hover:bg-[var(--gray-4)] focus:ring-[var(--mint-9)]",
    };

    return <button className={twMerge(base, variants[variant], className)} {...props} />;
}
