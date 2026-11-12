import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic request-time rendering. Every owner page reads SQLite on each
  // request, so the Cache Components model would only add `use cache`
  // ceremony without a benefit at this size.
  cacheComponents: false,
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
