"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md bg-surface-1 px-3 text-body text-ink placeholder:text-ink-tertiary",
        "border border-hairline focus:border-hairline-strong focus:outline-none focus:ring-2 focus:ring-primary-focus/50",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md bg-surface-1 px-3 py-2 text-body text-ink placeholder:text-ink-tertiary",
      "border border-hairline focus:border-hairline-strong focus:outline-none focus:ring-2 focus:ring-primary-focus/50",
      "transition-colors resize-vertical",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
