import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents (React "use cache") is incompatible with `export const dynamic`.
  // KinList reads the DB on every request for personalized pages, so we disable it.
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
