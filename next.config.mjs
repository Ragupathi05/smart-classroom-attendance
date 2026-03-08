/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/smart-classroom-attendance",
  assetPrefix: "/smart-classroom-attendance/",
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
