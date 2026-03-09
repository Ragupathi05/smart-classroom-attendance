"use client"

import { useEffect, useState } from "react"
import { Bell, User, Shield, School, CalendarDays, Users } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "react-toastify"

export function Settings() {
  const { user, setCurrentPage, appSettings, updateAppSettings, updateUserProfile } = useAppStore()
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")

  useEffect(() => {
    setName(user?.name || "")
    setEmail(user?.email || "")
  }, [user?.name, user?.email])

  const handleSaveProfile = () => {
    const result = updateUserProfile({ name, email })
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
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
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" onClick={() => toast.info("Avatar upload will be enabled soon")}>Change Avatar</Button>
            </div>
          </div>
          
          <Separator className="bg-border" />
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Full Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="bg-input"
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
          
          <Button onClick={handleSaveProfile}>Save Changes</Button>
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
            <Button variant="outline" size="sm" onClick={() => toast.info("Password reset flow will be connected to backend")}>Change</Button>
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

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <CalendarDays className="h-5 w-5" />
            Timetable Management
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Open the timetable editor to add, edit, or delete schedule entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setCurrentPage("timetable-editor")}>Open Timetable Editor</Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="h-5 w-5" />
            Student Management
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Open student manager to add, edit, delete, or import class list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setCurrentPage("student-manager")}>Open Student Manager</Button>
        </CardContent>
      </Card>
    </div>
  )
}
