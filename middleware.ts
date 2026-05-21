import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

// Use a separate NextAuth instance for middleware that doesn't include the full providers setup.
// This avoids importing Node-specific modules like better-sqlite3 in the Edge runtime.
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role
  const isApproved = req.auth?.user?.isApproved

  const isAdminDashboardRoute = nextUrl.pathname.startsWith('/admin/') || nextUrl.pathname === '/admin'
  const isAdminLoginRoute = nextUrl.pathname === '/admin-login'
  const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard/')
  const isLoginRoute = nextUrl.pathname === '/login'
  const isPendingApprovalRoute = nextUrl.pathname === '/pending-approval'
  const isSetupRoute = nextUrl.pathname === '/setup'

  // 1. Strict protection for legacy admin routes
  if (isAdminDashboardRoute) {
    if (!isLoggedIn || role !== 'admin') {
      return NextResponse.redirect(new URL('/admin-login', nextUrl))
    }
  }

  if (isSetupRoute) {
    if (!isLoggedIn || role !== 'admin') {
      return NextResponse.redirect(new URL('/admin-login', nextUrl))
    }
  }

  // 2. Protect App Router dashboards by role segment: /dashboard/student, /dashboard/teacher, etc.
  if (isDashboardRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', nextUrl))
    }

    const requestedRole = nextUrl.pathname.split('/')[2]
    const validRoles = ['student', 'teacher', 'admin', 'institution']

    if (!role || !validRoles.includes(role)) {
      return NextResponse.redirect(new URL('/login', nextUrl))
    }

    if (requestedRole && validRoles.includes(requestedRole) && role !== requestedRole) {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, nextUrl))
    }

    if ((role === 'teacher' || role === 'institution') && !isApproved && !isPendingApprovalRoute) {
      return NextResponse.redirect(new URL('/pending-approval', nextUrl))
    }
  }

  // 3. Prevent logged-in admins from seeing login pages, unless forceLogin is requested
  if (isAdminLoginRoute && isLoggedIn && role === 'admin') {
    if (nextUrl.searchParams.get('forceLogin') !== 'true') {
      return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
    }
  }

  if (isLoginRoute && isLoggedIn && role === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
