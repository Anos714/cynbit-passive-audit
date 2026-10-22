// snippets/analytics.tsx
// A nonce-aware replacement for the current GoogleAnalytics component.
//
// Why: if middleware enforces 'strict-dynamic', the GTM bootstrap script must
// carry the same nonce as the page. next/third-parties does not guarantee that
// for every version. This small server component makes the nonce explicit.
//
// Place under app/components/analytics.tsx and render it in the root layout.

import Script from 'next/script';
import { headers } from 'next/headers';

export async function Analytics({ gaId }: { gaId: string }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga-init" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
