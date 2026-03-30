import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full px-3.5 py-3 bg-input border border-bdr rounded-xl text-sm text-txt min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent focus:bg-surface transition-all placeholder:text-txt-m",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
