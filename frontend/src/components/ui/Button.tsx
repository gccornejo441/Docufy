import React from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "settings";
}

export default function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 min-h-[36px] px-4 py-2 rounded-md " +
    "font-medium leading-5 transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "ring-offset-[var(--surface-1)] focus-visible:ring-[var(--focus-ring)] " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] " +
      "data-[contrast=more]:bg-[var(--btn-primary-bg-hc)] data-[contrast=more]:text-[var(--btn-primary-fg-hc)] " +
      "forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText] forced-colors:outline forced-colors:outline-[ButtonText]",
    secondary:
      "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)] hover:bg-[var(--btn-secondary-bg-hover)] " +
      "data-[contrast=more]:bg-[var(--btn-secondary-bg-hc)] data-[contrast=more]:text-[var(--btn-secondary-fg-hc)] " +
      "forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText] forced-colors:outline forced-colors:outline-[ButtonText]",
    settings:
      "bg-[var(--btn-settings-bg)] text-[var(--btn-settings-fg)] hover:bg-[var(--btn-settings-bg-hover)] " +
      "data-[contrast=more]:bg-[var(--btn-settings-bg-hc)] data-[contrast=more]:text-[var(--btn-settings-fg-hc)] " +
      "forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText] forced-colors:outline forced-colors:outline-[ButtonText]",
  };

  return <button className={twMerge(base, variants[variant], className)} {...props} />;
}
