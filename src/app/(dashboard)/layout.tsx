import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";
import { DashboardShell } from "@/components/DashboardShell";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/register");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true, emailVerified: true, email: true, banned: true },
  });

  if (!user) {
    redirect("/api/auth/force-signout");
  }

  if (user.banned) {
    redirect("/banned");
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  const showVerificationBanner =
    !user.emailVerified &&
    user.email &&
    !user.email.endsWith("@fitsched.guest")

  return (
    <DashboardShell>
      {showVerificationBanner && <EmailVerificationBanner />}
      <main className="dashboard-main flex-1 overflow-y-auto pb-[94px]" data-dashboard-scroll>
        {children}
      </main>
      <DashboardNav />
    </DashboardShell>
  );
}
