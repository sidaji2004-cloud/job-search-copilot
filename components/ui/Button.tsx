"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 font-medium text-button rounded-md transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus/60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-focus",
        secondary:
          "bg-surface-1 text-ink border border-hairline hover:bg-surface-2 hover:border-hairline-strong",
        tertiary: "bg-transparent text-ink hover:bg-surface-1",
        ghost: "bg-transparent text-ink-subtle hover:text-ink hover:bg-surface-1",
        danger: "bg-transparent text-ink-subtle hover:text-[#e5484d] hover:bg-surface-1",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-[14px]",
        lg: "h-10 px-4",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
