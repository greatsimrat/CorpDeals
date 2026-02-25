export default function VendorTermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-slate-900">CorpDeals Vendor Terms</h1>
      <p className="text-sm text-slate-600">
        These terms apply to all offers submitted in the vendor portal.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">1. Accuracy and authority</h2>
        <p className="text-sm text-slate-700">
          You confirm that submitted offer details are accurate and that you are authorized to
          publish and manage offers on behalf of your company.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">2. Policy responsibilities</h2>
        <p className="text-sm text-slate-700">
          You must provide complete Terms &amp; Conditions and Cancellation/Refund policy content
          for each offer, either by selecting platform defaults or providing custom policy text.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">3. Compliance review</h2>
        <p className="text-sm text-slate-700">
          CorpDeals may approve or reject submissions. Rejected offers require changes before they
          can be resubmitted.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">4. Enforcement</h2>
        <p className="text-sm text-slate-700">
          CorpDeals may disable offers that violate these terms, applicable laws, or policy
          commitments.
        </p>
      </section>
    </div>
  );
}
