module.exports = {
  apps: [
    {
      name: 'jurnal-magang-backend',
      script: 'node',
      args: 'dist/server.js',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5005,
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'jurnal-magang-super-secret-key-12345'
      }
    },
    {
      name: 'jurnal-magang-frontend',
      script: 'npm',
      args: 'run start',
      cwd: './frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      }
    }
  ]
};
