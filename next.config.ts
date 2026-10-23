import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The menu is the front door; there is no separate landing page. A real redirect (not a page that
  // redirects) so there is no flash of content and search engines follow it.
  async redirects() {
    return [{ source: "/", destination: "/menu", permanent: false }];
  },
};

export default nextConfig;
