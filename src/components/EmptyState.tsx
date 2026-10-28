import Image from "next/image";
import Link from "next/link";

const illustrations = {
  inbox: "empty-inbox.svg",
  calls: "empty-calls.svg",
  contacts: "empty-contacts.svg",
  analytics: "empty-analytics.svg",
  billing: "empty-billing.svg",
  search: "empty-search.svg",
  phone: "setup-phone-number.svg",
  forwarding: "setup-forwarding.svg",
} as const;

export function EmptyState({
  illustration,
  title,
  description,
  action,
  href,
}: {
  illustration: keyof typeof illustrations;
  title: string;
  description: string;
  action?: string;
  href?: string;
}) {
  return (
    <section className="empty-state">
      <Image src={`/assets/connect/empty-states/${illustrations[illustration]}`} alt="" width={400} height={300} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action && href ? <Link className="brand-button empty-state__action" href={href}>{action}</Link> : null}
    </section>
  );
}
