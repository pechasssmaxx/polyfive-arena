module.exports = {
  apps: [
    {
      name: 'polyfive',
      script: 'server/index.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx/esm',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Auto-restart on crash
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      // Logging
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Memory limit — restart if exceeds 1GB
      max_memory_restart: '1G',
    },
  ],
};
