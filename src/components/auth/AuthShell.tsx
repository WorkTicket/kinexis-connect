import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="How KINEXIS Connect works">
        <Link href="/" className="auth-logo" aria-label="KINEXIS Connect home">
          <Image src="/assets/connect/brand/connect-logo-horizontal.webp" alt="KINEXIS Connect" width={240} height={80} priority />
        </Link>
        <div className="auth-story__content">
          <p className="eyebrow eyebrow--light">Missed-call text-back</p>
          <h2>Every missed call can still become a customer.</h2>
          <Image className="auth-story__art" src="/assets/connect/illustrations/auth-side-panel.svg" alt="A missed call becoming a text conversation" width={1000} height={1400} priority />
          <ul className="auth-benefits">
            <li><Check size={18} /> Respond automatically in seconds</li>
            <li><Check size={18} /> Continue the conversation from one inbox</li>
            <li><Check size={18} /> See which missed calls turn into replies</li>
          </ul>
        </div>
        <p className="auth-story__footer">A product by KINEXIS Digital</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <Link href="/" className="auth-logo auth-logo--mobile" aria-label="KINEXIS Connect home">
            <Image src="/assets/connect/brand/connect-logo-horizontal.webp" alt="KINEXIS Connect" width={240} height={80} priority />
          </Link>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <div className={`auth-notice auth-notice--${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}
