import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default async function InstitutionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "institution") {
    redirect(`/${session.user.role}`)
  }

  if (!session.user.isApproved) {
    redirect("/pending-approval")
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
