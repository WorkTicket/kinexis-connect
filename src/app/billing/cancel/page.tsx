import Image from "next/image";
import Link from "next/link";

export default function Cancel() {
  return <main className="billing-result"><Image src="/assets/connect/empty-states/empty-billing.svg" alt="" width={400} height={300} priority /><p className="eyebrow">Checkout canceled</p><h1>No billing changes were made.</h1><p>You can compare plans again or return to your dashboard.</p><div><Link className="brand-button" href="/pricing">Return to pricing</Link><Link className="outline-button" href="/app">Go to dashboard</Link></div></main>;
}
