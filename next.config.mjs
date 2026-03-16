/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', '@libsql/client', '@prisma/adapter-libsql', '@prisma/client'],
  },
};
export default nextConfig;
