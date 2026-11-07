import type { NextConfig } from "next";

const apiBase = process.env.INCIDENTMIND_API_BASE_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiBase.replace(/\/$/, "")}/:path*` }];
  },
};

export default nextConfig;
