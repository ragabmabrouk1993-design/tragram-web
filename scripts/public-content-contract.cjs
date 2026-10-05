#!/usr/bin/env node
/* GET-only checks: never submit forms or call account/payment/trading APIs. */
const fs = require('node:fs');
const path = require('node:path');

function arg(name, fallback) { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; }
const base = new URL(arg('--base-url', 'http://localhost:3002'));
const billingDisabled = process.argv.includes('--billing-disabled');
const manifest = fs.readFileSync(path.resolve(__dirname, '../src/content/public/route-manifest.ts'), 'utf8');
const routes = [...manifest.matchAll(/"path":"([^"]+)"/g)].map(m => m[1]);
if (routes.length !== 35) throw new Error('Expected the 35-route public manifest');
const failures = [];
const report = [];
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1].toLowerCase(),m[2].replaceAll('&amp;','&')]));
async function get(url) { return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) }); }

async function run() {
  for (const locale of ['en','ar']) for (const route of routes) {
    const pathname = `/${locale}${route === '/' ? '' : route}`;
    const response = await get(new URL(pathname, base));
    const html = await response.text();
    const expected = billingDisabled && route === '/pricing' ? 404 : 200;
    if (response.status !== expected) failures.push(`${pathname}: status ${response.status}, expected ${expected}`);
    if (expected === 404) continue;
    if(/(?:NEXT_LOCALE|tragram-locale)=/.test(response.headers.get('set-cookie') ?? '')) failures.push(`${pathname}: public response changes locale preferences`);
    const links = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0]));
    const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(m => attrs(m[0]));
    const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(m => attrs(m[0]));
    const meta = name => metas.find(m => m.name === name || m.property === name)?.content;
    const schemas = [];
    for (const script of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try { schemas.push(JSON.parse(script[1])); } catch { failures.push(`${pathname}: invalid JSON-LD`); }
    }
    const h1s = [...html.matchAll(/<h1\b/g)].length;
    const canonical = links.find(l=>l.rel === 'canonical')?.href;
    const languages = links.filter(l=>l.rel === 'alternate' && l.hreflang).map(l=>l.hreflang).sort();
    if (h1s !== 1) failures.push(`${pathname}: ${h1s} H1 headings`);
    if (!canonical || new URL(canonical).pathname.replace(/\/$/,'') !== pathname) failures.push(`${pathname}: incorrect canonical`);
    if (languages.join(',') !== 'ar,en,x-default') failures.push(`${pathname}: inconsistent hreflang ${languages}`);
    if (!meta('description') || !meta('og:title') || !meta('twitter:card')) failures.push(`${pathname}: missing social/description metadata`);
    const socialImage = meta('og:image');
    const acceptsLocalHttp = ['localhost', '127.0.0.1'].includes(base.hostname);
    const absoluteSocialPattern = acceptsLocalHttp ? /^https?:\/\// : /^https:\/\//;
    if (!absoluteSocialPattern.test(socialImage ?? '')) failures.push(`${pathname}: missing absolute social image`);
    if (socialImage) {
      try {
        const socialPath = new URL(socialImage).pathname;
        if ((socialPath.startsWith('/images/') || socialPath.startsWith('/brand/')) && !fs.existsSync(path.resolve(__dirname, '../public', `.${socialPath}`))) {
          failures.push(`${pathname}: missing social asset ${socialPath}`);
        }
      } catch {
        failures.push(`${pathname}: invalid social image URL`);
      }
    }
    if (route.startsWith('/blog/') && meta('og:type') !== 'article') failures.push(`${pathname}: wrong article social type`);
    const schemaText = JSON.stringify(schemas);
    if (billingDisabled && /"@type":"(?:Offer|AggregateOffer)"/.test(schemaText)) failures.push(`${pathname}: free-mode purchasable Offer`);
    const storeLinks = anchors.map(a=>a.href).filter(h=>/^https:\/\/(apps\.apple\.com|play\.google\.com)\//.test(h ?? ''));
    for (const href of storeLinks) if (!['https://apps.apple.com/us/app/tragram/id6759307940','https://play.google.com/store/apps/details?id=com.tragram.app'].includes(href)) failures.push(`${pathname}: unexpected app-store destination ${href}`);
    if (billingDisabled && anchors.some(a=>/\/(pricing|profile\/subscription|profile\/invoices)(?:[/?#]|$)/.test(a.href??''))) failures.push(`${pathname}: actionable billing link`);
    for (const image of [...html.matchAll(/<img\b[^>]*>/g)].map(m=>attrs(m[0]))) {
      let src = image.src ?? '';
      if(src.startsWith('/_next/image?')) src = new URL(src,base).searchParams.get('url') ?? '';
      if (!src.startsWith('/images/') && !src.startsWith('/brand/')) continue;
      if (!fs.existsSync(path.resolve(__dirname, '../public', '.' + src))) failures.push(`${pathname}: missing asset ${src}`);
    }
    report.push({ pathname, status: response.status, h1s, canonical, languages, title: html.match(/<title>(.*?)<\/title>/s)?.[1], description:meta('description'), socialImage:meta('og:image'), schemaTypes:schemas.flatMap(s=>s['@graph']?.map(entry=>entry['@type']) ?? [s['@type']]).filter(Boolean), storeLinks:[...new Set(storeLinks)], internalLinks:[...new Set(anchors.map(a=>a.href).filter(h=>h?.startsWith('/')))] });
  }
  for (const alias of ['tr','ar-EG','en-US']) {
    const response = await get(new URL(`/${alias}/features?ref=contract`,base));
    const location = response.headers.get('location');
    if (response.status !== 308 || !location?.endsWith(`/${alias.startsWith('ar')?'ar':'en'}/features?ref=contract`)) failures.push(`Alias ${alias}: redirect/query failure`);
  }
  const missing = await get(new URL('/en/this-route-should-404',base));
  if (missing.status !== 404) failures.push(`Unknown route: ${missing.status}`);
  if (billingDisabled) for (const route of ['/profile/subscription','/profile/invoices','/profile/invoices/contract']) {
    const response = await get(new URL('/en'+route,base));
    if (response.status !== 404) failures.push(`Disabled ${route}: ${response.status}`);
  }
  const sitemap = await get(new URL('/sitemap.xml',base));
  if (sitemap.status === 200) {
    const xml = await sitemap.text();
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
    if (billingDisabled && (locations.length !== 68 || locations.some(l=>l.includes('/pricing')))) failures.push(`Sitemap: expected 68 non-billing URLs, found ${locations.length}`);
    if (locations.some(l=>!/^\/(en|ar)(?:\/|$)/.test(new URL(l).pathname))) failures.push('Sitemap: unexpected content locale');
  } else failures.push(`Sitemap: status ${sitemap.status}`);
  // Exercise indexing headers locally; this does not contact or deploy staging.
  for (const [pathname,status] of [['/en/features',200],['/tr/features?ref=contract',308],['/robots.txt',200],['/sitemap.xml',404],...(billingDisabled?[['/en/pricing',404],['/ar/profile/invoices/contract',404]]:[])]) {
    const response = await fetch(new URL(pathname,base),{redirect:'manual',headers:{'x-forwarded-host':'staging.tragram.app'},signal:AbortSignal.timeout(30000)});
    if(response.status !== status || !response.headers.get('x-robots-tag')?.includes('noindex')) failures.push(`Staging host ${pathname}: status/indexing contract`);
    if(pathname==='/robots.txt' && !(await response.text()).includes('Disallow: /')) failures.push('Staging robots: missing disallow');
    if(billingDisabled && /pricing|invoices/.test(pathname) && !response.headers.get('cache-control')?.includes('no-store')) failures.push(`Staging billing ${pathname}: cache policy`);
  }
  console.log(JSON.stringify({ pages: report, failures },null,2));
  process.exitCode = failures.length ? 1 : 0;
}
run().catch(error=>{ console.error(error.message); process.exitCode=1; });
