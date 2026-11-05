module.exports = {
  apps: [
    {
      name: "erp-api",
      script: "./server/dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      max_restarts: 10,
      min_uptime: "10s",
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        SERVER_PORT: 3000,
      },
    },
  ],
};
