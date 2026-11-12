import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic request-time rendering. Every owner page reads SQLite on each
  // request, so the Cache Components model would only add `use cache`
  // ceremony without a benefit at this size.
  cacheComponents: false,
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // Photos go through the uploadPhotoAction Server Action (MAX_PHOTO_BYTES
      // = 12 MB). Next caps action bodies at 1 MB by default, which would reject
      // most phone photos before the action's own size check could run.
      // 13 MB leaves room for multipart overhead.
      bodySizeLimit: "13mb",
    },
  },
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
