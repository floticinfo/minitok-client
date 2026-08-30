"use strict";

function createRoutes(services) {
  return {
    "GET /health": async () => ({
      status: 200,
      data: { status: "ok", uptime_ms: process.uptime() * 1000 | 0 },
    }),

    "GET /api/v1/status": async () => {
      const entitlement = await services.entitlement.status();
      return {
        status: 200,
        data: {
          entitlement: { plan: entitlement.entitlement?.plan_id || null, valid: entitlement.allowed, state: entitlement.state },
          knowledge: { outcomes: services.knowledge.size },
          uptime_ms: process.uptime() * 1000 | 0,
        },
      };
    },

    "POST /api/v1/knowledge/query": async ({ body }) => {
      const result = services.knowledge.query(body || {});
      return { status: 200, data: result };
    },

    "POST /api/v1/knowledge/record": async ({ body }) => {
      if (!body || !body.outcome) return { status: 400, data: { error: "Missing outcome" } };
      const result = services.knowledge.record(body.outcome);
      return { status: 200, data: result };
    },

    "POST /api/v1/knowledge/analyze": async ({ body }) => {
      const result = services.analysis.analyze(body?.project);
      return { status: 200, data: result };
    },

    "POST /api/v1/context/compact": async ({ body }) => {
      if (!body || typeof body.text !== "string") return { status: 400, data: { error: "Missing text" } };
      const result = services.compact.compact(body.text, body);
      return { status: 200, data: result };
    },

    "POST /api/v1/evidence/collect": async ({ body }) => {
      if (!body || !body.project) return { status: 400, data: { error: "Missing project" } };
      const result = services.evidence.collect(body.project, body);
      return { status: 200, data: result };
    },

    "POST /api/v1/observations/ingest": async ({ body }) => {
      const result = services.observation.ingest(body || {});
      return { status: 200, data: result };
    },

    "POST /api/v1/observations/query": async ({ body }) => {
      const result = services.observation.query(body?.project, body);
      return { status: 200, data: result };
    },

    "GET /api/v1/audit/recent": async ({ params }) => {
      const limit = parseInt(params.limit, 10) || 100;
      const entries = services.audit.recent(limit);
      return { status: 200, data: { entries } };
    },
  };
}

module.exports = { createRoutes };
