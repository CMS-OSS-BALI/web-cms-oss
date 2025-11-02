/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
      "/api/**": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },

  // Gunakan redirect permanen agar hanya "/" yang terindeks
  async redirects() {
    return [
      {
        source: "/user/landing-page",
        destination: "/",
        permanent: true, // 308 (SEO setara 301)
      },
    ];
  },
};

export default nextConfig;
