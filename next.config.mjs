import path from "node:path"
import { fileURLToPath } from "node:url"

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production"
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  output: "export",
  basePath: isProd ? "/smart-classroom-attendance" : "",
  assetPrefix: isProd ? "/smart-classroom-attendance/" : "",
  trailingSlash: true,
  turbopack: {
    root: projectRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
