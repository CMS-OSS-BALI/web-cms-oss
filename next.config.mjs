/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
      "/api/**": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },

  async rewrites() {
    return [
      // URL tetap "/" tapi konten diambil dari /user/landing-page
      { source: "/", destination: "/user/landing-page" },
    ];
  },

  // (Opsional) Biar canonical ke root: akses /user/landing-page diarahkan ke "/"
  // Hapus blok ini jika kamu masih ingin path /user/landing-page bisa dibuka langsung.
  // async redirects() {
  //   return [
  //     { source: "/user/landing-page", destination: "/", permanent: false },
  //   ];
  // },
};

export default nextConfig;
