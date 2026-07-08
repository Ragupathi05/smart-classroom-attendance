export async function copyTextRobust(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Continue to legacy fallback.
  }

  try {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.setAttribute("readonly", "")
    textArea.style.position = "fixed"
    textArea.style.opacity = "0"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand("copy")
    document.body.removeChild(textArea)
    return success
  } catch {
    return false
  }
}

export function tryOpenWindow(url: string): boolean {
  const opened = window.open(url, "_blank")
  return Boolean(opened)
}
