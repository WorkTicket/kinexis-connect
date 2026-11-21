import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Policy",
  description: "KINEXIS Connect SMS messaging policy (draft pending legal review).",
  robots: { index: false, follow: true },
};

export default function SmsPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-2xl font-bold text-[#0A1230]">SMS Policy (Draft)</h1>
      <p className="mt-4 text-[#65718C]">Draft SMS policy requiring lawyer/business review. Not legal advice.</p>
    </div>
  );
}
