"use client"

import { useEffect, useState } from "react"
import { Mail, Shield } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "react-toastify"

export function ProfilePage() {
  const { user, updateUserProfile } = useAppStore()
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")

  useEffect(() => {
    setName(user?.name || "")
    setEmail(user?.email || "")
  }, [user?.name, user?.email])

  const isDirty =
    name.trim() !== (user?.name || "").trim() ||
    email.trim().toLowerCase() !== (user?.email || "").trim().toLowerCase()

  const handleSave = () => {
    const result = updateUserProfile({ name, email })
    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success("Profile updated successfully")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your personal account details</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold text-foreground">{user?.name || "User"}</p>
              <p className="text-sm text-muted-foreground">
                {user?.role === "cr" ? "Class Representative" : user?.role === "lr" ? "Ladies Representative" : "Faculty"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email" className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-class">Class</Label>
              <Input id="profile-class" value={user?.className || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-role" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              <Input
                id="profile-role"
                value={user?.role === "cr" ? "Class Representative" : user?.role === "lr" ? "Ladies Representative" : "Faculty"}
                disabled
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!isDirty}>
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
