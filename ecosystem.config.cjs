module.exports = {
  apps: [
    {
      name: "sgo-api",
      script: "server/index.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
