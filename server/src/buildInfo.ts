export const GIT_SHA = process.env.GIT_SHA ?? "unknown";
export const DEPLOY_ENV = process.env.DEPLOY_ENV ?? process.env.NODE_ENV ?? "development";
export const SERVER_STARTED_AT = Date.now();
