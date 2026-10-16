module.exports = {
  apps: [
    {
      name: 'quannguyens-store',
      script: 'server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      error_file: 'server/data/pm2-error.log',
      out_file: 'server/data/pm2-out.log',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
