import Image from "next/image";
import Link from "next/link";

export default function Success() {
  return <main className="billing-result"><Image src="/assets/connect/onboarding/subscription-active.svg" alt="Subscription submitted" width={480} height={360} priority /><p className="eyebrow">Payment submitted</p><h1>PayPal is confirming your subscription.</h1><p>Your billing screen will update after PayPal sends the activation confirmation. This normally happens shortly after approval.</p><div><Link className="brand-button" href="/app/billing">Check billing status</Link><Link className="outline-button" href="/app/settings">Continue setup</Link></div></main>;
}
