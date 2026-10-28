import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth/membership";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!(await isPlatformAdmin(user.id))) redirect("/app");
  const links = [["Overview", "/admin"], ["Businesses", "/admin/businesses"], ["Billing", "/admin/billing"], ["Provider activity", "/admin/activity"], ["Audit logs", "/admin/audit-logs"]];
  return <div className="admin-shell"><aside><Link href="/admin"><Image src="/assets/connect/brand/connect-logo-horizontal.webp" alt="KINEXIS Connect" width={180} height={60} /></Link><span className="admin-label">Platform admin</span><nav>{links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav><div><p>{user.email}</p><LogoutButton /></div></aside><main>{children}</main></div>;
}
