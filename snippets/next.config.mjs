// snippets/next.config.mjs
// Small, low-risk settings that complement the middleware.
//
// `poweredByHeader: false` removes the inconsistent x-powered-by: Next.js
// values observed on /contact, /careers, and /bitelevate.
//
// Do not add a second HSTS header here if Vercel project settings already set
// one; duplicate values are invalid. See SEC-02.

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
