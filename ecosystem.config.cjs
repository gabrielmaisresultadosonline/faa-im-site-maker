module.exports = {
  apps: [
    {
      name: 'lovblack-app',
      script: './.output/server/index.mjs',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Secrets should be loaded from .env file or system env vars
      // to avoid hardcoding here.
    },
  ],
};
