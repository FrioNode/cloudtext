/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/android',
        destination: 'https://cloudtext.frionode.online',
        permanent: false,
      },
      // The invite itself lives behind cloudtext.frionode.online/discord, so it can rotate
      // in one place.
      {
        source: '/discord',
        destination: 'https://cloudtext.frionode.online/discord',
        permanent: false,
      },
    ]
  },
}



module.exports = nextConfig;
