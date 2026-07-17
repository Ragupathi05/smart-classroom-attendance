"use client"

import { useEffect, useState } from "react"
import { Mail, Shield, BookOpen, GraduationCap, Phone, UserCircle2 } from "lucide-react"
import { useProfileStore } from "@/store"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "react-toastify"

export function ProfilePage() {
  const { user, updateUserProfile } = useProfileStore()
  const isCRLR = user?.role === "cr" || user?.role === "lr"
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [department, setDepartment] = useState("")
  const [year, setYear] = useState("")
  const [section, setSection] = useState("")
  const [phone, setPhone] = useState("")
  const [mentor, setMentor] = useState("")

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setDepartment(user.department || "")
      setYear(user.year || "")
      setSection(user.section || "")
      setPhone(user.phone || "")
      setMentor(user.mentor || "")
    }
  }, [user])

  const isDirty =
    name.trim() !== (user?.name || "").trim() ||
    email.trim().toLowerCase() !== (user?.email || "").trim().toLowerCase() ||
    department.trim() !== (user?.department || "").trim() ||
    year.trim() !== (user?.year || "").trim() ||
    section.trim() !== (user?.section || "").trim() ||
    phone.trim() !== (user?.phone || "").trim() ||
    mentor.trim() !== (user?.mentor || "").trim()

  const handleSave = () => {
    const result = updateUserProfile({
      name,
      email,
      department,
      year,
      section,
      phone,
      mentor,
    })
    
    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success("Profile updated successfully")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your educational profile and contact information</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                {name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold text-foreground">{name || "User"}</p>
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
                placeholder="e.g. name@mits.ac.in"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-dept" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Department
              </Label>
              <Input
                id="profile-dept"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-year" className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                Year
              </Label>
              <Input
                id="profile-year"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-section">Section</Label>
              <Input
                id="profile-section"
                value={section}
                onChange={(event) => setSection(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone" className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-mentor" className="flex items-center gap-1">
                <UserCircle2 className="h-4 w-4" />
                Faculty Mentor
              </Label>
              <Input
                id="profile-mentor"
                value={mentor}
                onChange={(event) => setMentor(event.target.value)}
              />
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
