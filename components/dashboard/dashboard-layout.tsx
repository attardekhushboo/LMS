"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  GraduationCap,
  BookOpen,
  Trophy,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  FileText,
  Award,
  CheckSquare,
  PlusCircle,
  ClipboardList,
  Building2,
  UserCheck,
  Sparkles,
  Bell,
  Clock,
} from "lucide-react"

interface NotificationItem {
  id: string
  title: string
  description: string
  type: "enrollment" | "submission" | "deadline"
  timestamp: string
  link: string
  read: boolean
}

function formatRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    if (diffMs < 0) return "just now"
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return "just now"
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    if (diffDays === 1) return "yesterday"
    return `${diffDays} days ago`
  } catch {
    return "recently"
  }
}

function NotificationBell() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string
  const isTeacher = role === "teacher"
  const isStudent = role === "student"
  const isInstitution = role === "institution"
  const isNotificationEnabled = isTeacher || isStudent || isInstitution
  const userId = session?.user?.id || ""

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<string[]>([])

  // Load read status list from localStorage
  useEffect(() => {
    if (userId) {
      const stored = localStorage.getItem(`read-notifications-${userId}`)
      if (stored) {
        try {
          setReadIds(JSON.parse(stored))
        } catch {
          setReadIds([])
        }
      } else {
        setReadIds([])
      }
    }
  }, [userId])

  const fetchNotifications = async () => {
    if (!isNotificationEnabled) return
    setLoading(true)
    setError(null)
    try {
      let fetchUrl = "/api/student/notifications"
      if (isTeacher) fetchUrl = "/api/teacher/notifications"
      if (isInstitution) fetchUrl = "/api/institution/notifications"
      
      const res = await fetch(fetchUrl)
      if (!res.ok) {
        throw new Error("Failed to load notifications")
      }
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch (e: any) {
      console.error(e)
      setError(e.message || "Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (isNotificationEnabled) {
      fetchNotifications()
    }
  }, [isNotificationEnabled])

  // Periodic poll every 30 seconds for real-time dashboard updates
  useEffect(() => {
    if (!isNotificationEnabled) return
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [isNotificationEnabled])

  const handleMarkAsRead = (id: string) => {
    if (!userId) return
    const updated = [...readIds, id]
    setReadIds(updated)
    localStorage.setItem(`read-notifications-${userId}`, JSON.stringify(updated))
  }

  const handleMarkAllAsRead = () => {
    if (!userId || notifications.length === 0) return
    const allIds = notifications.map((n) => n.id)
    const updated = Array.from(new Set([...readIds, ...allIds]))
    setReadIds(updated)
    localStorage.setItem(`read-notifications-${userId}`, JSON.stringify(updated))
    toast.success("All notifications marked as read")
  }

  // If not enabled, hide
  if (!isNotificationEnabled) {
    return null
  }

  const mappedNotifications = notifications.map((n) => ({
    ...n,
    read: readIds.includes(n.id),
  }))

  const unreadCount = mappedNotifications.filter((n) => !n.read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-gray-100/80 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-0 shadow-2xl border border-gray-100 bg-white/95 backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/80">
          <span className="font-extrabold text-gray-800 text-sm">Notifications</span>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
          {loading && (
            <div className="p-4 space-y-3.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 bg-slate-100 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                    <div className="h-2 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="py-6 px-4 text-center">
              <p className="text-xs text-rose-500 font-bold mb-2">{error}</p>
              <Button 
                size="sm" 
                onClick={fetchNotifications}
                className="h-7 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-[10px] font-bold text-white px-3"
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && mappedNotifications.length > 0 ? (
            mappedNotifications.map((n) => {
              let iconBg = "bg-blue-50 text-blue-500"
              let IconComponent = Clock
              if (n.type === "enrollment") {
                iconBg = "bg-emerald-50 text-emerald-500"
                IconComponent = Users
              } else if (n.type === "submission") {
                iconBg = "bg-orange-50 text-orange-500"
                IconComponent = FileText
              }

              return (
                <DropdownMenuItem 
                  key={n.id} 
                  asChild
                  onClick={() => handleMarkAsRead(n.id)}
                  className="focus:bg-transparent"
                >
                  <Link href={n.link} className={cn(
                    "flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left block w-full",
                    !n.read ? "bg-cyan-50/20 hover:bg-cyan-50/40" : "hover:bg-gray-50/50"
                  )}>
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", iconBg)}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-normal text-gray-700", !n.read ? "font-bold" : "font-medium")}>
                        {n.description}
                      </p>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-1">
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-cyan-500 shrink-0 mt-1.5" />
                    )}
                  </Link>
                </DropdownMenuItem>
              )
            })
          ) : (
            !loading && !error && (
              <div className="py-8 text-center text-gray-400 text-xs font-semibold px-4">
                You have no new notifications.
              </div>
            )
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  color: string
}

const roleNavItems: Record<string, NavItem[]> = {
  student: [
    { label: "Dashboard", href: "/dashboard/student", icon: Home, color: "text-violet-500" },
    { label: "My Courses", href: "/dashboard/student/courses", icon: BookOpen, color: "text-pink-500" },
    { label: "Quizzes", href: "/dashboard/student/quizzes", icon: CheckSquare, color: "text-cyan-500" },
    { label: "Assignments", href: "/dashboard/student/assignments", icon: FileText, color: "text-amber-500" },
    { label: "Certificates", href: "/dashboard/student/certificates", icon: Award, color: "text-emerald-500" },
  ],
  teacher: [
    { label: "Dashboard", href: "/dashboard/teacher", icon: Home, color: "text-violet-500" },
    { label: "My Courses", href: "/dashboard/teacher/courses", icon: BookOpen, color: "text-pink-500" },
    { label: "Create Course", href: "/dashboard/teacher/courses/new", icon: PlusCircle, color: "text-cyan-500" },
    { label: "Quizzes", href: "/dashboard/teacher/quizzes", icon: ClipboardList, color: "text-amber-500" },
    { label: "Assignments", href: "/dashboard/teacher/assignments", icon: FileText, color: "text-emerald-500" },
    { label: "Enrollments", href: "/dashboard/teacher/enrollments", icon: Users, color: "text-rose-500" },
  ],
  admin: [
    { label: "Dashboard", href: "/dashboard/admin", icon: Home, color: "text-violet-500" },
    { label: "Users", href: "/dashboard/admin/users", icon: Users, color: "text-pink-500" },
    { label: "Approvals", href: "/dashboard/admin/approvals", icon: UserCheck, color: "text-cyan-500" },
    { label: "Courses", href: "/dashboard/admin/courses", icon: BookOpen, color: "text-amber-500" },
    { label: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3, color: "text-emerald-500" },
    { label: "Settings", href: "/dashboard/admin/settings", icon: Settings, color: "text-rose-500" },
  ],
  institution: [
    { label: "Dashboard", href: "/dashboard/institution", icon: Home, color: "text-violet-500" },
    { label: "Students", href: "/dashboard/institution/students", icon: Users, color: "text-pink-500" },
    { label: "Performance", href: "/dashboard/institution/performance", icon: BarChart3, color: "text-cyan-500" },
    { label: "Courses", href: "/dashboard/institution/courses", icon: BookOpen, color: "text-amber-500" },
    { label: "Reports", href: "/dashboard/institution/reports", icon: FileText, color: "text-emerald-500" },
  ],
}

const roleGradients: Record<string, string> = {
  student: "from-violet-500 via-pink-500 to-rose-500",
  teacher: "from-cyan-500 via-blue-500 to-violet-500",
  admin: "from-emerald-500 via-teal-500 to-cyan-500",
  institution: "from-amber-500 via-orange-500 to-rose-500",
}

const roleBgGradients: Record<string, string> = {
  student: "from-violet-50 via-pink-50 to-rose-50",
  teacher: "from-cyan-50 via-blue-50 to-violet-50",
  admin: "from-emerald-50 via-teal-50 to-cyan-50",
  institution: "from-amber-50 via-orange-50 to-rose-50",
}

export function DashboardLayout({ children, role }: { children: React.ReactNode, role?: string }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeRole = role || ((session?.user as any)?.role as string) || "student"
  const navItems = roleNavItems[activeRole] || roleNavItems.student
  const gradient = roleGradients[activeRole] || roleGradients.student
  const bgGradient = roleBgGradients[activeRole] || roleBgGradients.student

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U"

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient}`}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-white/90 backdrop-blur-xl shadow-2xl transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-xl font-extrabold text-transparent`}>
                NextGen
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 px-4 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                    isActive
                      ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-white" : item.color)} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 p-3">
              <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
                <AvatarFallback className={`bg-gradient-to-br ${gradient} font-bold text-white`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800">{session?.user?.name}</p>
                <p className="truncate text-xs text-gray-500 capitalize">{activeRole}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/50 bg-white/70 px-4 backdrop-blur-xl lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
            </motion.div>
            <span className="text-sm font-medium text-gray-600">
              Welcome back, <span className="font-bold text-gray-800">{session?.user?.name?.split(" ")[0]}</span>!
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Header Notification Bell Dropdown */}
            {(activeRole === "teacher" || activeRole === "student" || activeRole === "institution") && (
              <NotificationBell />
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 ring-2 ring-violet-200">
                    <AvatarFallback className={`bg-gradient-to-br ${gradient} font-bold text-white`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/${activeRole}/settings`} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="cursor-pointer text-rose-600 focus:text-rose-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
