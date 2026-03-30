import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 bg-surface shadow-xl transition-all duration-200",
        // Mobile: bottom sheet
        "inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] overflow-y-auto safe-area-bottom",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        // Desktop: centered dialog
        "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
        "sm:rounded-2xl sm:w-full sm:max-w-lg sm:max-h-[85vh]",
        "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0",
        "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("sticky top-0 bg-surface border-b border-bdr-l px-4 py-3 flex items-center justify-between rounded-t-2xl z-10", className)} {...props}>
      <div className="flex-1 min-w-0">{children}</div>
      <DialogPrimitive.Close className="p-2 -mr-2 text-txt-m hover:text-txt rounded-lg hover:bg-surface-hover min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors">
        <X size={20} />
      </DialogPrimitive.Close>
    </div>
  )
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <DialogPrimitive.Title className={cn("text-lg font-bold text-txt truncate", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <DialogPrimitive.Description className={cn("text-sm text-txt-s", className)} {...props} />
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
}
