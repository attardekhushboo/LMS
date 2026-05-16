"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Trash2, Loader2, Users, GraduationCap, BookOpen, Building2, CheckCircle, XCircle } from "lucide-react"

interface User {
  id: string; name: string; email: string; role: string; is_approved: boolean; created_at: string
}

const roleColors: Record<string, string> = {
  student: "bg-violet-100 text-violet-700",
  teacher: "bg-cyan-100 text-cyan-700",
  admin: "bg-emerald-100 text-emerald-700",
  institution: "bg-amber-100 text-amber-700",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const res = await fetch("/api/admin/users")
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return
    setDeleting(userId)
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    setDeleting(null)
    fetchUsers()
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === "all" || u.role === roleFilter
    return matchSearch && matchRole
  })

  const counts = { all: users.length, student: users.filter(u => u.role === "student").length, teacher: users.filter(u => u.role === "teacher").length, institution: users.filter(u => u.role === "institution").length }

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-800">All Users</h1>
        <p className="text-gray-500">Manage all registered users on the platform</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.all, icon: Users, color: "from-emerald-500 to-teal-500" },
          { label: "Students", value: counts.student, icon: GraduationCap, color: "from-violet-500 to-purple-500" },
          { label: "Teachers", value: counts.teacher, icon: BookOpen, color: "from-cyan-500 to-blue-500" },
          { label: "Institutions", value: counts.institution, icon: Building2, color: "from-amber-500 to-orange-500" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl bg-gradient-to-br ${stat.color} p-5 text-white shadow-lg`}>
            <stat.icon className="mb-2 h-6 w-6 opacity-80" />
            <p className="text-3xl font-extrabold">{stat.value}</p>
            <p className="text-sm opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="teacher">Teachers</SelectItem>
            <SelectItem value="institution">Institutions</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 bg-white/80 shadow-xl backdrop-blur">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Joined</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((user, i) => (
                  <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={roleColors[user.role] || "bg-gray-100 text-gray-700"}>{user.role}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_approved ? (
                        <span className="flex items-center gap-1 text-sm font-medium text-emerald-600"><CheckCircle className="h-4 w-4" />Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm font-medium text-amber-600"><XCircle className="h-4 w-4" />Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {user.role !== "admin" && (
                        <Button
                          variant="ghost" size="sm"
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => handleDelete(user.id)}
                          disabled={deleting === user.id}
                        >
                          {deleting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-500">No users found</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
