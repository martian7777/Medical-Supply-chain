import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * postgres.js must not be bundled.
   *
   * Bundled, its connection handling misbehaves under the dev server: the same six
   * queries that take ~100ms each from a plain Node script took 25 SECONDS inside a
   * Server Component. Marking it external hands it to Node's own require, and the page
   * renders in well under a second.
   */
  serverExternalPackages: ["postgres"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
