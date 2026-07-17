"use client"

import { useEffect, useState } from "react"
import { Bell, User, Shield, School } from "lucide-react"
import { useAuthStore, useSettingsStore, useConfirmStore } from "@/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "react-toastify"

export function Settings() {
  const { user, updateUserProfile, changeUserPassword } = useAuthStore()
  const { appSettings, updateAppSettings } = useSettingsStore()
  const confirm = useConfirmStore((state) => state.confirm)
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isProfileConfirmed, setIsProfileConfirmed] = useState(false)

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const res = changeUserPassword(user.id, currentPassword, newPassword)
    if (res.success) {
      toast.success(res.message)
      setShowPasswordDialog(false)
      setCurrentPassword("")
      setNewPassword("")
    } else {
      toast.error(res.message)
    }
  }

  const isProfileDirty =
    name.trim() !== (user?.name || "").trim() ||
    email.trim().toLowerCase() !== (user?.email || "").trim().toLowerCase()

  useEffect(() => {
    setName(user?.name || "")
    setEmail(user?.email || "")
    setIsEditingProfile(false)
    setIsProfileConfirmed(false)
  }, [user?.name, user?.email])

  const handleStartProfileEdit = () => {
    setIsEditingProfile(true)
    setIsProfileConfirmed(false)
  }

  const handleCancelProfileEdit = () => {
    setName(user?.name || "")
    setEmail(user?.email || "")
    setIsEditingProfile(false)
    setIsProfileConfirmed(false)
  }

  const handleConfirmProfile = () => {
    if (!isProfileDirty) {
      toast.info("No changes to confirm")
      return
    }

    confirm({
      title: "Confirm Profile Changes",
      message: "Are you sure you want to confirm these changes to your profile settings?",
      confirmText: "Confirm",
      onConfirm: () => {
        setIsProfileConfirmed(true)
        toast.success("Changes confirmed. Click Save to apply.")
      }
    })
  }

  const handleSaveProfile = () => {
    if (!isEditingProfile) return
    if (!isProfileConfirmed) {
      toast.warning("Please confirm changes before saving")
      return
    }

    const result = updateUserProfile({ name, email })
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setIsEditingProfile(false)
    setIsProfileConfirmed(false)
  }

  const handleToggle = (key: keyof typeof appSettings, value: boolean) => {
    updateAppSettings({ [key]: value })
    toast.success("Settings updated")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Click Edit Profile to unlock fields, then Confirm and Save
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => toast.info("Avatar upload will be enabled soon")} className="flex-1 sm:flex-initial">Change Avatar</Button>
              {!isEditingProfile ? (
                <Button size="sm" onClick={handleStartProfileEdit} className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground">Edit Profile</Button>
              ) : null}
            </div>
          </div>
          
          <Separator className="bg-border" />
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => {
                  setIsProfileConfirmed(false)
                  setName(event.target.value)
                }}
                disabled={!isEditingProfile}
                className={isEditingProfile ? "bg-input" : "bg-muted"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                placeholder="e.g. name@mits.ac.in"
                onChange={(event) => {
                  setIsProfileConfirmed(false)
                  setEmail(event.target.value)
                }}
                disabled={!isEditingProfile}
                className={isEditingProfile ? "bg-input" : "bg-muted"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground">Role</Label>
              <Input
                id="role"
                defaultValue={
                  user?.role === "cr"
                    ? "Class Representative"
                    : user?.role === "lr"
                    ? "Ladies Representative"
                    : "Faculty"
                }
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class" className="text-foreground">Class</Label>
              <Input id="class" defaultValue={user?.className} disabled className="bg-muted" />
            </div>
          </div>
          
          {isEditingProfile ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleCancelProfileEdit} className="flex-1 sm:flex-initial">Cancel</Button>
              <Button variant="secondary" onClick={handleConfirmProfile} className="flex-1 sm:flex-initial">
                Confirm
              </Button>
              <Button onClick={handleSaveProfile} disabled={!isProfileConfirmed || !isProfileDirty} className="flex-1 sm:flex-initial">
                Save
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Class Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <School className="h-5 w-5" />
            Class Settings
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure class-related settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Auto-select Present</p>
              <p className="text-sm text-muted-foreground">
                Automatically mark all students as present by default
              </p>
            </div>
            <Switch
              checked={appSettings.autoSelectPresent}
              onCheckedChange={(checked) => handleToggle("autoSelectPresent", checked)}
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Allow Late Modifications</p>
              <p className="text-sm text-muted-foreground">
                Allow attendance modifications within 1 hour after submission
              </p>
            </div>
            <Switch
              checked={appSettings.allowLateModifications}
              onCheckedChange={(checked) => handleToggle("allowLateModifications", checked)}
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Require Confirmation</p>
              <p className="text-sm text-muted-foreground">
                Show confirmation dialog before submitting attendance
              </p>
            </div>
            <Switch
              checked={appSettings.requireConfirmation}
              onCheckedChange={(checked) => handleToggle("requireConfirmation", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Class Reminders</p>
              <p className="text-sm text-muted-foreground">
                Get notified 5 minutes before each class
              </p>
            </div>
            <Switch
              checked={appSettings.classReminders}
              onCheckedChange={(checked) => handleToggle("classReminders", checked)}
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Attendance Alerts</p>
              <p className="text-sm text-muted-foreground">
                Alert when attendance drops below 75%
              </p>
            </div>
            <Switch
              checked={appSettings.attendanceAlerts}
              onCheckedChange={(checked) => handleToggle("attendanceAlerts", checked)}
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email Reports</p>
              <p className="text-sm text-muted-foreground">
                Receive weekly attendance reports via email
              </p>
            </div>
            <Switch
              checked={appSettings.emailReports}
              onCheckedChange={(checked) => handleToggle("emailReports", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your account security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Change Password</p>
              <p className="text-sm text-muted-foreground">
                Update your account password
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>Change</Button>
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle("twoFactorEnabled", !appSettings.twoFactorEnabled)}
            >
              {appSettings.twoFactorEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl text-xs font-bold">
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Change Password</h3>
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                  }}
                  placeholder="Enter current password"
                  className="h-9 text-xs font-semibold rounded-lg text-foreground bg-input/40 border border-border"
                  required
                />
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                  }}
                  placeholder="Enter new password (min. 4 chars)"
                  className="h-9 text-xs font-semibold rounded-lg text-foreground bg-input/40 border border-border"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordDialog(false)
                    setCurrentPassword("")
                    setNewPassword("")
                  }}
                  className="text-xs font-bold rounded-lg h-9"
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-xs font-bold rounded-lg h-9">
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
