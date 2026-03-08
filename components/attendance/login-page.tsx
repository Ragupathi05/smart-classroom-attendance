"use client"

import { useState } from "react"
import { GraduationCap, Eye, EyeOff, Users, BookOpen, Shield } from "lucide-react"
import { useAppStore, type UserRole } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export function LoginPage() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("cr")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const login = useAppStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!userId || !password) {
      setError("Please fill in all fields")
      return
    }
    
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    
    const success = login(userId, password, role)
    if (!success) {
      setError("Invalid credentials")
    }
    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Gradient Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-3xl" />
      </div>
      
      {/* Grid Pattern Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Logo and Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AttendEase
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Smart Classroom Attendance System
          </p>
        </div>

        <Card className="border-border/40 bg-card/90 shadow-xl shadow-black/10 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to manage classroom attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="userId">User ID</FieldLabel>
                  <Input
                    id="userId"
                    type="text"
                    placeholder="Enter your user ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="bg-input/50 transition-colors focus:bg-input"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-input/50 pr-10 transition-colors focus:bg-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger id="role" className="bg-input/50 transition-colors focus:bg-input">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cr">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Class Representative (CR)
                        </span>
                      </SelectItem>
                      <SelectItem value="lr">
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Ladies Representative (LR)
                        </span>
                      </SelectItem>
                      <SelectItem value="faculty">
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          Faculty / Admin
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {error && (
                <p className="text-sm text-destructive animate-fade-in-up">{error}</p>
              )}

              <Button 
                type="submit" 
                className="w-full shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Demo: Enter any User ID and Password
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: "60+ Students" },
            { icon: BookOpen, label: "8 Subjects" },
            { icon: Shield, label: "Secure" },
          ].map((feature, i) => (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-card/50 p-3 text-center backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/80"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <feature.icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
