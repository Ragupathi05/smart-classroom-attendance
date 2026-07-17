import React from "react"
import { Button } from "./button"

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-scale-up">
        <div className="space-y-2">
          <h3 className="text-base font-black text-foreground uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="text-xs font-bold rounded-xl h-9 px-4 border-border hover:bg-muted"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={onConfirm}
            className="text-xs font-bold rounded-xl h-9 px-4 uppercase tracking-wider"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
