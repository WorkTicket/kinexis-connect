import Image from "next/image";
import Link from "next/link";

export { homePageMetadata as metadata } from "@/lib/seo-metadata";

const features = [
  { icon: "missed-call-detection.svg", title: "Know when a call is missed", body: "Answered, busy, no-answer, and failed calls are tracked accurately." },
  { icon: "instant-text-back.svg", title: "Respond automatically", body: "Send a helpful follow-up while the customer is still looking for service." },
  { icon: "two-way-inbox.svg", title: "Keep replies together", body: "Continue customer conversations from one focused business inbox." },
  { icon: "call-routing.svg", title: "Keep your current workflow", body: "Forward only unanswered calls from your existing business phone to its dedicated Connect number." },
  { icon: "lead-analytics.svg", title: "See what gets recovered", body: "Measure missed calls, sent texts, customer replies, and reply rate." },
  { icon: "consent-compliance.svg", title: "Built around consent", body: "Respect opt-outs, registration status, cooldowns, and quiet hours." },
];

export default function Home() {
  return (
    <>
      <section className="connect-hero">
        <div className="connect-container connect-hero__grid">
          <div className="connect-hero__copy">
            <p className="eyebrow">Missed-call text-back for service businesses</p>
            <h1><span>Turn Missed Calls</span><span className="connect-hero__headline-accent">Into New Leads</span></h1>
            <p className="connect-lead">Automatically follow up when you cannot answer, receive customer replies, and keep recovered opportunities organized.</p>
            <div className="connect-actions">
              <Link href="/signup" className="brand-button">Start now</Link>
              <Link href="/pricing" className="outline-button">View pricing</Link>
            </div>
            <ul className="connect-checks">
              <li><span className="connect-checks__mark" aria-hidden="true">✓</span><span>No new phone habits for your team</span></li>
              <li><span className="connect-checks__mark" aria-hidden="true">✓</span><span>Two-way customer inbox</span></li>
              <li><span className="connect-checks__mark" aria-hidden="true">✓</span><span>Consent-aware messaging controls</span></li>
            </ul>
          </div>
          <div className="connect-hero__art">
            <Image src="/assets/connect/illustrations/connect-hero-flow.svg" alt="A missed call followed by an automatic text and customer response" width={1400} height={1200} priority />
          </div>
        </div>
      </section>

      <section id="features" className="connect-section">
        <div className="connect-container">
          <div className="section-heading">
            <p className="eyebrow">Everything in one follow-up system</p>
            <h2>Stay responsive—even when you cannot answer.</h2>
            <p>Connect handles the first follow-up and gives your team a clear place to continue the conversation.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <Image src={`/assets/connect/icons/${feature.icon}`} alt="" width={96} height={96} />
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="connect-section connect-section--tint">
        <div className="connect-container">
          <div className="section-heading section-heading--center">
            <p className="eyebrow">How it works</p>
            <h2>From unanswered call to active conversation.</h2>
          </div>
          <div className="workflow-steps">
            <picture className="workflow-art">
              <source media="(max-width: 640px)" srcSet="/assets/connect/illustrations/missed-call-workflow-mobile.svg" />
              <Image src="/assets/connect/illustrations/missed-call-workflow.svg" alt="Four steps: missed call, automatic text, customer response, and recovered opportunity" width={1800} height={700} />
            </picture>
            <ol className="workflow-labels">
              <li><strong>Call missed</strong><span>Connect detects the unanswered attempt.</span></li>
              <li><strong>Text prepared</strong><span>Your approved follow-up is queued.</span></li>
              <li><strong>Customer replies</strong><span>The response appears in your inbox.</span></li>
              <li><strong>Opportunity recovered</strong><span>Your team continues the conversation.</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="connect-section connect-cta">
        <div className="connect-container connect-cta__grid">
          <div>
            <p className="eyebrow eyebrow--light">Keep the connection</p>
            <h2>Stop letting a missed ring end the conversation.</h2>
            <p>Set up your business, choose a plan, and connect your phone workflow.</p>
            <Link href="/signup" className="brand-button">Create your account</Link>
          </div>
          <Image src="/assets/connect/illustrations/connect-cta-conversation.svg" alt="An incoming customer message becoming a booked opportunity" width={900} height={700} />
        </div>
      </section>
    </>
  );
}
