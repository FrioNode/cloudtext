module.exports = {
  apps: [
    {
      name: 'cloudtext-api',
      cwd: '/home/admin/cloudtext/api',
      script: 'node',
      args: 'dist/main.js',
      env: {
        PORT: 3002,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'cloudtext-web',
      cwd: '/home/admin/cloudtext/web',
      script: 'pnpm',
      args: 'start',
      env: {
        PORT: 3003,
        NODE_ENV: 'production'
      }
    }
  ]
}
