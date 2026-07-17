"use client"

import { useState } from "react"
import { GraduationCap, Eye, EyeOff, Users, BookOpen, Shield } from "lucide-react"
import { useAuthStore } from "@/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { toast } from "react-toastify"

export function LoginPage() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!userId || !password) {
      setError("Please fill in all fields")
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Call login with auto-detection (pass role as undefined/empty, which triggers store auto-detect)
    const success = await login(userId, password, undefined as any)
    if (!success) {
      setError("Invalid User ID or Password")
      toast.error("Sign in failed. Check credentials.")
    } else {
      toast.success("Signed in successfully!")
    }
    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* logo and Institution Title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/10 transition-transform duration-300 hover:scale-105">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground uppercase tracking-wider">
            MITS • AttendEase
          </h1>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Smart Attendance & Classroom Management
          </p>
        </div>

        <Card className="border-border/60 bg-card/90 shadow-xl shadow-black/5 backdrop-blur-sm rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-black tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground">
              Auto-detects HOD, Faculty, CR, or LR workspaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup className="space-y-3.5">
                <Field>
                  <FieldLabel htmlFor="userId">User ID / Username</FieldLabel>
                  <Input
                    id="userId"
                    type="text"
                    placeholder="e.g. III-CSE-A-CR or CSE-HOD or dr-kumar"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-input/40 pr-10 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </FieldGroup>

              {/* Remember Me & Forgot Password Toggles */}
              <div className="flex items-center justify-between text-xs font-bold pt-1.5 pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Password resets must be requested via HOD Workspace.")}
                  className="text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {error && (
                <p className="text-xs font-bold text-destructive animate-fade-in-up mt-1">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full font-black text-xs h-10 rounded-lg shadow-md shadow-primary/10 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Authenticating...
                  </span>
                ) : (
                  "SIGN IN"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Hints Footer */}
        <div className="mt-5 rounded-2xl border border-border bg-card/65 p-4 backdrop-blur-sm space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">
            Demo Credentials (Auto-Role detection)
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground/80">
            <div className="flex items-center gap-1.5 bg-secondary/30 p-2 rounded-lg">
              <span className="text-primary">💼 HOD:</span>
              <code className="text-foreground">CSE-HOD</code>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary/30 p-2 rounded-lg">
              <span className="text-primary">🎓 CR:</span>
              <code className="text-foreground">III-CSE-A-CR</code>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary/30 p-2 rounded-lg">
              <span className="text-primary">👩‍🎓 LR:</span>
              <code className="text-foreground">III-CSE-A-LR</code>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary/30 p-2 rounded-lg">
              <span className="text-primary">🏫 Faculty:</span>
              <code className="text-foreground">dr-kumar</code>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground/60 text-center font-semibold italic mt-1">
            *Use any non-empty string for password.
          </p>
        </div>
      </div>
    </div>
  )
}
