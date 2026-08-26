"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { getBrowserTikTokPixelId } from "@/lib/tiktok/browser";

/**
 * Single production TikTok Pixel loader. Skips the internal /analytics dashboard.
 * Does not call ttq.identify and does not enable Automatic Advanced Matching.
 */
export default function TikTokPixel() {
  const pathname = usePathname();
  const pixelId = getBrowserTikTokPixelId();

  if (!pixelId) {
    return null;
  }

  if (pathname === "/analytics" || pathname.startsWith("/analytics/")) {
    return null;
  }

  const snippet = `!function (w, d, t) {
  w.TikTokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
  ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
  ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
  for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
  ttq.instance=function(t){for(
    var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++
  )ttq.setAndDefer(e,ttq.methods[n]);return e};
  ttq.load=function(e,n){
    var i="https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};
    var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
    var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a);
  };
  ttq.load(${JSON.stringify(pixelId)});
  ttq.page();
}(window, document, 'ttq');`;

  return (
    <Script id="tiktok-pixel" strategy="afterInteractive">
      {snippet}
    </Script>
  );
}
