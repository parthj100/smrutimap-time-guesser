"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const gradientButtonVariants = cva(
  [
    "gradient-button",
    "inline-flex items-center justify-center",
    "rounded-[11px]",
    "text-white font-sans font-bold",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "mobile-touch-target",
    "transition-all duration-300",
  ],
  {
    variants: {
      variant: {
        default: "",
        variant: "gradient-button-variant",
        blue: "gradient-button-blue",
        purple: "gradient-button-purple",
      },
      size: {
        default: ["px-12 py-5", "text-xl", "min-w-[180px]", "min-h-[64px]", "md:px-10 md:py-4", "md:text-lg", "md:min-w-[160px]", "md:min-h-[56px]", "sm:px-8 sm:py-3", "sm:text-base", "sm:min-w-[140px]", "sm:min-h-[48px]"],
        sm: ["px-8 py-3", "text-lg", "min-w-[140px]", "min-h-[48px]", "md:px-6 md:py-2", "md:text-base", "md:min-w-[120px]", "md:min-h-[44px]", "sm:px-4 sm:py-2", "sm:text-sm", "sm:min-w-[100px]", "sm:min-h-[40px]"],
        lg: ["px-16 py-6", "text-2xl", "min-w-[220px]", "min-h-[72px]", "md:px-14 md:py-5", "md:text-xl", "md:min-w-[200px]", "md:min-h-[64px]", "sm:px-10 sm:py-4", "sm:text-lg", "sm:min-w-[160px]", "sm:min-h-[56px]"],
        icon: ["h-14 w-14", "p-3", "min-w-[56px]", "md:h-12 md:w-12", "md:p-2", "md:min-w-[48px]", "sm:h-10 sm:w-10", "sm:p-2", "sm:min-w-[40px]"],
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants } 