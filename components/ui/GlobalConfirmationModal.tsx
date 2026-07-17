import React from "react"
import { useConfirmStore } from "@/store/confirmStore"
import { Button } from "./button"

export function GlobalConfirmationModal() {
  const { isOpen, options, close } = useConfirmStore()

  if (!isOpen || !options) return null

  const { title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm } = options

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-scale-up">
        <div className="space-y-2">
          <h3 className="text-base font-black text-foreground uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={close}
            className="text-xs font-bold rounded-xl h-9 px-4 border-border hover:bg-muted"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => {
              onConfirm()
              close()
            }}
            className="text-xs font-bold rounded-xl h-9 px-4 uppercase tracking-wider"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
