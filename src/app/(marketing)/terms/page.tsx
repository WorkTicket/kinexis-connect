import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "KINEXIS Connect terms of service (draft pending legal review).",
  robots: { index: false, follow: true },
};

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-2xl font-bold text-[#0A1230]">Terms of Service (Draft)</h1>
      <p className="mt-4 text-[#65718C]">Draft terms requiring lawyer/business review.</p>
    </div>
  );
}
