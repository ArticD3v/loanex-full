/**
 * Vercel serverless entry for the LoanEx Express API.
 * Uses the compiled app from `dist/` and waits for json-db hydration.
 */
const { createApp } = require('../dist/app');
const { jsonDb } = require('../dist/config/json-db');

const app = createApp();

module.exports = async (req, res) => {
  const waitStarted = Date.now();
  await jsonDb.ready;
  const waitMs = Date.now() - waitStarted;
  // waitMs is ~0 on warm instances; non-trivial waits indicate cold-start hydrate.
  if (waitMs > 50) {
    console.info(
      `[perf] cold-start wait=${waitMs}ms hydrateMs=${jsonDb.lastHydrateMs || 0} path=${req.url || ''}`,
    );
  }
  return app(req, res);
};
