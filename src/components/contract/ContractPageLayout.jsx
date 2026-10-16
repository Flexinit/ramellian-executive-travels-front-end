import React from 'react';

/**
 * The contract pages' layout: on the left, a column that floats — the way back (`back`, e.g. "Back to payment"),
 * the page's title and what to do — staying in view under the top bar while the contract scrolls, with the page
 * itself beside it. On a narrow screen that column simply sits above the page.
 *
 * @param {React.ReactNode} back
 * @param {string} title
 * @param {React.ReactNode} [intro]
 * @param {React.ReactNode} children
 */
export default function ContractPageLayout({ back, title, intro, children }) {
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        {back}
        <div>
          <h1 className="font-heading text-brand-white text-2xl font-bold">{title}</h1>
          {intro && <p className="text-brand-grey text-sm mt-1.5 leading-relaxed">{intro}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-6 min-w-0">{children}</div>
    </div>
  );
}
