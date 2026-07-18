import { useState, useEffect } from "react"
import { GraduationCap, Eye, EyeOff, Shield, Mail, KeyRound, ArrowLeft } from "lucide-react"
import { useAuthStore } from "@/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { toast } from "react-toastify"
import { supabase } from "@/lib/supabase/client"

// Page modes
type Mode = "login" | "register" | "forgot" | "reset"

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("login")

  // Login
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Registration
  const [canRegisterHOD, setCanRegisterHOD] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [deptName, setDeptName] = useState("")
  const [deptCode, setDeptCode] = useState("")
  const [setupCode, setSetupCode] = useState("")

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotSetupCode, setForgotSetupCode] = useState("")

  // Reset password (after clicking email link)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Secret code baked in at build time from GitHub Secret
  const HOD_SETUP_CODE = process.env.NEXT_PUBLIC_HOD_SETUP_CODE || ""

  const login = useAuthStore((state) => state.login)
  const registerHOD = useAuthStore((state) => state.registerHOD)

  // Detect password recovery token in URL hash (from Supabase reset email link)
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes("type=recovery")) {
      setMode("reset")
      // Clean the hash from the URL without reloading
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [])

  // Check if any HOD exists in DB → show/hide register link
  useEffect(() => {
    async function checkHODs() {
      try {
        const { count, error } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("role", "HOD")
        if (!error) setCanRegisterHOD(count === 0)
      } catch (err) {
        console.error("Failed to check existing HOD accounts:", err)
      }
    }
    checkHODs()
  }, [])

  const clearError = () => setError("")

  // ─── SUBMIT HANDLER ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    // ── LOGIN ──
    if (mode === "login") {
      if (!userId || !password) { setError("Please fill in all fields"); return }
      setIsLoading(true)
      await new Promise((r) => setTimeout(r, 600))
      const success = await login(userId, password, undefined as any)
      setIsLoading(false)
      if (!success) {
        setError("Invalid credentials. HOD/Faculty use email. CR/LR use RollNo-CR / RollNo-LR.")
        toast.error("Sign in failed. Check your credentials.")
      } else {
        toast.success("Signed in successfully!")
      }
      return
    }

    // ── REGISTER HOD ──
    if (mode === "register") {
      if (!canRegisterHOD) { setError("HOD account already exists. Registration is locked."); return }
      if (HOD_SETUP_CODE && setupCode.trim() !== HOD_SETUP_CODE) {
        setError("Invalid Institution Setup Code. Contact your IT administrator.")
        return
      }
      if (!fullName || !email || !password || !phone || !deptName || !deptCode) {
        setError("All fields are required")
        return
      }
      if (!email.endsWith("@mits.ac.in")) {
        setError("Email must be a college email ending with @mits.ac.in")
        return
      }
      setIsLoading(true)
      const res = await registerHOD(email, password, fullName, phone, deptName, deptCode)
      setIsLoading(false)
      if (res.success) toast.success(res.message)
      else { setError(res.message); toast.error(res.message) }
      return
    }

    // ── FORGOT PASSWORD ──
    if (mode === "forgot") {
      if (!forgotEmail) { setError("Please enter your email address"); return }
      if (!forgotEmail.includes("@")) { setError("Please enter a valid email address"); return }
      if (!forgotSetupCode) { setError("Please enter the institution setup code"); return }

      setIsLoading(true)
      try {
        const { data, error: resetErr } = await supabase.rpc('reset_user_password', {
          target_email: forgotEmail.trim().toLowerCase(),
          setup_code: forgotSetupCode.trim()
        })

        setIsLoading(false)
        if (resetErr) {
          setError(resetErr.message)
          toast.error("Reset failed: " + resetErr.message)
        } else if (data === false) {
          setError("Invalid email address or setup code.")
          toast.error("Reset failed. Invalid email address or setup code.")
        } else {
          setForgotSent(true)
          toast.success("Password reset successful!")
        }
      } catch (err: any) {
        setIsLoading(false)
        setError(err.message || "An unexpected error occurred.")
        toast.error("An unexpected error occurred.")
      }
      return
    }

    // ── RESET PASSWORD (after clicking email link) ──
    if (mode === "reset") {
      if (!newPassword || !confirmPassword) { setError("Please fill in both fields"); return }
      if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return }
      if (newPassword !== confirmPassword) { setError("Passwords do not match"); return }
      setIsLoading(true)
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      setIsLoading(false)
      if (updateErr) {
        setError(updateErr.message)
        toast.error("Password reset failed: " + updateErr.message)
      } else {
        toast.success("Password updated successfully! Please sign in with your new password.")
        setMode("login")
        setNewPassword("")
        setConfirmPassword("")
      }
      return
    }
  }

  // ─── CARD TITLE / DESCRIPTION ──────────────────────────────────
  const cardTitle = {
    login: "Sign In",
    register: "HOD Registration",
    forgot: "Forgot Password",
    reset: "Set New Password",
  }[mode]

  const cardDesc = {
    login: "Enter your registered credentials to sign in",
    register: "Setup a new HOD profile & department",
    forgot: "Enter your college email to receive a password reset link",
    reset: "Choose a new password for your account",
  }[mode]

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Background Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Logo */}
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
            <CardTitle className="text-lg font-black tracking-tight">{cardTitle}</CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground">{cardDesc}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup className="space-y-3.5">

                {/* ── LOGIN FORM ── */}
                {mode === "login" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="userId">Username / Email</FieldLabel>
                      <Input
                        id="userId"
                        type="text"
                        placeholder="e.g. hod@mits.ac.in or 21CSE001-CR"
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
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                  </>
                )}

                {/* ── REGISTER FORM ── */}
                {mode === "register" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="fullName">HOD Full Name</FieldLabel>
                      <Input id="fullName" type="text" placeholder="e.g. Dr. Ramesh Kumar"
                        value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="email">College Email ID</FieldLabel>
                      <Input id="email" type="email" placeholder="e.g. hod@mits.ac.in"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="regPassword">Account Password</FieldLabel>
                      <div className="relative">
                        <Input id="regPassword" type={showPassword ? "text" : "password"} placeholder="Min. 6 characters"
                          value={password} onChange={(e) => setPassword(e.target.value)}
                          className="bg-input/40 pr-10 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                      <Input id="phone" type="text" placeholder="e.g. 9876543210"
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="deptCode">Dept Code</FieldLabel>
                        <Input id="deptCode" type="text" placeholder="e.g. CSE"
                          value={deptCode} onChange={(e) => setDeptCode(e.target.value)}
                          className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="deptName">Department Name</FieldLabel>
                        <Input id="deptName" type="text" placeholder="e.g. Computer Science"
                          value={deptName} onChange={(e) => setDeptName(e.target.value)}
                          className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="setupCode" className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-amber-500" />
                        Institution Setup Code
                      </FieldLabel>
                      <Input id="setupCode" type="password" placeholder="Enter the secret setup code"
                        value={setupCode} onChange={(e) => setSetupCode(e.target.value)}
                        className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg border-amber-500/30 focus:border-amber-500/60" />
                      <p className="text-[10px] text-muted-foreground mt-1">Provided by your IT administrator at deployment.</p>
                    </Field>
                  </>
                )}

                {/* ── FORGOT PASSWORD FORM ── */}
                {mode === "forgot" && !forgotSent && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="forgotEmail" className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-primary" />
                        Your College Email
                      </FieldLabel>
                      <Input id="forgotEmail" type="email" placeholder="e.g. hod@mits.ac.in"
                        value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                        className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="forgotSetupCode" className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-amber-500" />
                        Institution Setup Code
                      </FieldLabel>
                      <Input id="forgotSetupCode" type="password" placeholder="Enter the secret setup code"
                        value={forgotSetupCode} onChange={(e) => setForgotSetupCode(e.target.value)}
                        className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg border-amber-500/30 focus:border-amber-500/60" />
                    </Field>
                  </>
                )}

                {/* ── FORGOT — EMAIL SENT CONFIRMATION ── */}
                {mode === "forgot" && forgotSent && (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                      <KeyRound className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-sm font-black text-foreground">Password Reset Success!</p>
                    <p className="text-xs text-muted-foreground">
                      Your password has been successfully reset to the default password:
                    </p>
                    <div className="bg-input/60 rounded-lg p-2 font-mono text-xs font-bold text-foreground">
                      MITS@HOD123 (for HOD) <br/>
                      Faculty@&lt;FacultyCode&gt;123 (for Faculty)
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      You can now sign in using this default password.
                    </p>
                  </div>
                )}

                {/* ── RESET PASSWORD FORM ── */}
                {mode === "reset" && (
                  <>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 mb-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <KeyRound className="h-3 w-3 text-primary flex-shrink-0" />
                        You clicked a password reset link. Enter your new password below.
                      </p>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                      <div className="relative">
                        <Input id="newPassword" type={showNewPassword ? "text" : "password"}
                          placeholder="Min. 6 characters"
                          value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-input/40 pr-10 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
                      <Input id="confirmPassword" type="password" placeholder="Re-enter new password"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-input/40 transition-colors focus:bg-input h-10 text-xs font-semibold rounded-lg" />
                    </Field>
                  </>
                )}

              </FieldGroup>

              {/* Remember Me + Forgot link (login mode only) */}
              {mode === "login" && (
                <div className="flex items-center justify-between text-xs font-bold pt-1.5 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
                    <input type="checkbox" checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer" />
                    <span>Remember Me</span>
                  </label>
                  <button type="button"
                    onClick={() => { clearError(); setForgotSent(false); setMode("forgot") }}
                    className="text-primary hover:underline">
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs font-bold text-destructive animate-fade-in-up mt-1">{error}</p>
              )}

              {/* Submit Button */}
              {!(mode === "forgot" && forgotSent) && (
                <Button type="submit"
                  className="w-full font-black text-xs h-10 rounded-lg shadow-md shadow-primary/10 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                  disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {{
                        login: "Authenticating...",
                        register: "Registering...",
                        forgot: "Resetting Password...",
                        reset: "Updating Password...",
                      }[mode]}
                    </span>
                  ) : (
                    {
                      login: "SIGN IN",
                      register: "CREATE HOD ACCOUNT",
                      forgot: "RESET PASSWORD TO DEFAULT",
                      reset: "SET NEW PASSWORD",
                    }[mode]
                  )}
                </Button>
              )}

              {/* Bottom navigation links */}
              <div className="space-y-2 text-center pt-1">
                {/* Back to login */}
                {(mode === "forgot" || mode === "register" || mode === "reset") && (
                  <button type="button"
                    onClick={() => { clearError(); setForgotSent(false); setMode("login") }}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mx-auto transition-colors">
                    <ArrowLeft className="h-3 w-3" />
                    Back to Sign In
                  </button>
                )}

                {/* Register link (only if no HOD exists yet) */}
                {mode === "login" && canRegisterHOD && (
                  <button type="button"
                    onClick={() => { clearError(); setMode("register") }}
                    className="text-xs font-bold text-primary hover:underline block w-full">
                    Need to set up the HOD account? Register here
                  </button>
                )}
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
