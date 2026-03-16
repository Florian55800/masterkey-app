/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bcryptjs', '@libsql/client', '@prisma/adapter-libsql'],
};
export default nextConfig;
