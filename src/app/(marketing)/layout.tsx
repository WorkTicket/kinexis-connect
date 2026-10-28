import Link from "next/link";
import Image from "next/image";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0A1230]">
      <header className="connect-header">
        <div className="connect-container connect-header__inner">
          <Link href="/" className="flex items-center">
            <Image src="/assets/connect/brand/connect-logo-horizontal.webp" alt="KINEXIS Connect" width={180} height={60} className="h-10 w-auto" priority />
          </Link>
          <nav className="connect-nav" aria-label="Main navigation">
            <Link href="#features" className="hover:text-[#0B3DFF]">Features</Link>
            <Link href="/pricing" className="hover:text-[#0B3DFF]">Pricing</Link>
            <Link href="/login" className="hover:text-[#0B3DFF]">Log in</Link>
            <Link href="/signup" className="nav-cta">Start now</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="connect-container connect-footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/sms-policy">SMS Policy</Link>
        <span className="ml-auto">© KINEXIS Digital</span>
      </footer>
    </div>
  );
}
