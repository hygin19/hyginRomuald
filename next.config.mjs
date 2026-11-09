/**
 * Sandbox preview note:
 * Everything in `previewOverrides` only applies when BASE44_PREVIEW_MODE is
 * exactly "1" (the sandbox sets it). Without that flag the app keeps its
 * original, production behaviour: no extra dev origins are trusted.
 */
const previewMode = process.env.BASE44_PREVIEW_MODE === "1";
const previewOrigins = [
  process.env.BASE44_PUBLIC_HOST_SUFFIX && `3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`,
  process.env.BASE44_PUBLIC_HOST_SUFFIX && `*.${process.env.BASE44_PUBLIC_HOST_SUFFIX}`,
  process.env.BASE44_SANDBOX_HOST_DOMAIN && `*.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`,
].filter(Boolean);

const authTarget = process.env.AUTH_INTERNAL_URL || "http://auth:9999";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg"],
  // Self-hosted Supabase Auth (GoTrue) is mounted under /auth/v1 so the same
  // @supabase/ssr client works here and against a hosted Supabase project.
  async rewrites() {
    return [
      { source: "/auth/v1/:path*", destination: `${authTarget}/:path*` },
    ];
  },
};

if (previewMode && previewOrigins.length > 0) {
  nextConfig.allowedDevOrigins = previewOrigins;
}

export default nextConfig;
