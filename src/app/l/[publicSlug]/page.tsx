import Script from "next/script";
import { notFound } from "next/navigation";

import { PublicLandingView } from "@/components/public-landing-view";
import { getLandingByPublicSlug } from "@/server/landing-service";

type PublicLandingPageProps = {
  params: Promise<{ publicSlug: string }>;
};

export default async function PublicLandingPage({ params }: PublicLandingPageProps) {
  const { publicSlug } = await params;
  const landing = await getLandingByPublicSlug(publicSlug);

  if (!landing || landing.status !== "published") {
    notFound();
  }

  return (
    <>
      {landing.metaPixelId ? (
        <>
          <Script id={`meta-pixel-${landing.id}`} strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${landing.metaPixelId}');
fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${landing.metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
      <PublicLandingView landing={landing} />
    </>
  );
}
