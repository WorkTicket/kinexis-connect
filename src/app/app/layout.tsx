import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentUser } from "@/lib/auth/membership";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_MESSAGING_SERVICE_SID);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r border-[#E5EAF3] p-4 hidden md:flex md:flex-col">
        <Link href="/app" className="mb-6"><Image src="/assets/connect/brand/connect-logo-horizontal.webp" alt="KINEXIS Connect" width={180} height={60} className="h-9 w-auto" /></Link>
        <nav className="space-y-2 text-sm">
          {["Overview:/app","Inbox:/app/inbox","Calls:/app/calls","Contacts:/app/contacts","Analytics:/app/analytics","Settings:/app/settings","Billing:/app/billing"].map((x) => {
            const [label, href] = x.split(":");
            return <Link key={href} href={href} className="block px-3 py-2 rounded-lg hover:bg-[#F6F8FC]">{label}</Link>;
          })}
        </nav>
        <div className="mt-auto border-t border-[#E5EAF3] pt-3">
          <p className="truncate px-3 text-xs text-[#65718C]">{user.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#E5EAF3] bg-white px-4 py-3 md:hidden">
          <Link href="/app"><Image src="/assets/connect/brand/connect-logo-horizontal.webp" alt="KINEXIS Connect" width={150} height={50} className="h-8 w-auto" /></Link>
          <LogoutButton />
        </header>
        {!twilioConfigured ? <div className="provider-disabled-notice" role="status"><strong>Messaging is disabled.</strong> Twilio setup and phone verification must be completed before Connect can send or receive messages.</div> : null}
        <main className="max-w-[1440px] p-5 md:p-8">{children}</main>
        <nav className="mobile-app-nav" aria-label="Mobile dashboard navigation">
          {["Overview:/app","Inbox:/app/inbox","Calls:/app/calls","Settings:/app/settings"].map((item) => { const [label, href] = item.split(":"); return <Link href={href} key={href}>{label}</Link>; })}
        </nav>
      </div>
    </div>
  );
}
