import app from '../server.js';

// Single Express entry point for all /api/* traffic. Express itself does the
// path matching (req.url) once a request reaches this function — vercel.json's
// rewrite is what forwards every /api/* request here in the first place.
//
// This replaced api/[...path].ts: Vercel's filesystem-based catch-all only
// routed single-segment paths (/api/health, /api/displays) correctly here —
// every path with 2+ segments after /api/ (/api/supabase/config,
// /api/displays/:code, /api/ai/generate-content, even nonexistent paths like
// /api/foo/bar) returned a Vercel-level 404 (no x-powered-by: Express header,
// meaning the function was never invoked at all) instead of reaching Express.
// An explicit rewrite is the well-established, documented pattern for "single
// Express app behind one Vercel function" and doesn't depend on that
// catch-all inference working correctly.
//
// api/keep-alive.ts stays untouched — the rewrite's source pattern excludes it
// so it keeps being served by its own dedicated function, not by this one.
export default app;
