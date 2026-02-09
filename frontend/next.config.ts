import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

let exportedConfig: NextConfig = nextConfig;

if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
  const { withSentryConfig } = require("@sentry/nextjs");
  exportedConfig = withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  });
}

export default exportedConfig;
