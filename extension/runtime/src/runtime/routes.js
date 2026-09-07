"use strict";

const MAX_LIMIT = 1000;
const MAX_DEPTH = 8;
const MAX_ARRAY_LENGTH = 1000;
const MAX_RECORD_BYTES = 200000;

function depth(value, level = 0) {
  if (level > MAX_DEPTH) return true;
  if (Array.isArray(value)) return value.length > MAX_ARRAY_LENGTH || value.some(item => depth(item, level + 1));
  if (value && typeof value === "object") return Object.values(value).some(item => depth(item, level + 1));
  return false;
}

function parseLimit(value, defaultValue = 100) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_LIMIT) return { error: `limit must be an integer from 0 to ${MAX_LIMIT}` };
  return parsed;
}

function createRoutes(services) {
  const objectBody = body => body && typeof body === "object" && !Array.isArray(body) && !depth(body) && Buffer.byteLength(JSON.stringify(body)) <= MAX_RECORD_BYTES ? body : null;
  const boundedText = (value, field, max = 2000) => {
    if (typeof value !== "string" || value.length === 0 || value.length > max) return { error: `${field} is invalid` };
    return null;
  };
  return {
    "GET /health": async () => ({
      status: 200,
      data: { status: "ok", uptime_ms: process.uptime() * 1000 | 0 },
    }),

    "GET /readyz": async () => ({
      status: 200,
      data: { status: "ready", uptime_ms: process.uptime() * 1000 | 0 },
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
      const input = objectBody(body) || {};
      if (input.project !== undefined && boundedText(input.project, "project", 4096)) return { status: 400, data: { error: "Invalid project" } };
      const limit = parseLimit(input.limit);
      if (typeof limit !== "number") return { status: 400, data: { error: limit.error } };
      const result = services.knowledge.query({ ...input, limit });
      return { status: 200, data: result };
    },

    "POST /api/v1/knowledge/record": async ({ body }) => {
      const input = objectBody(body);
      if (!input || !input.outcome || depth(input.outcome) || Buffer.byteLength(JSON.stringify(input.outcome)) > MAX_RECORD_BYTES) return { status: 400, data: { error: "Invalid outcome" } };
      const result = services.knowledge.record(body.outcome);
      return { status: 200, data: result };
    },

    "POST /api/v1/knowledge/analyze": async ({ body }) => {
      if (body?.project !== undefined && boundedText(body.project, "project", 4096)) return { status: 400, data: { error: "Invalid project" } };
      const result = services.analysis.analyze(body?.project);
      return { status: 200, data: result };
    },

    "POST /api/v1/context/compact": async ({ body }) => {
      const input = objectBody(body);
      if (!input || boundedText(input.text, "text", 100000)) return { status: 400, data: { error: "Invalid text" } };
      const result = services.compact.compact(input.text, input);
      return { status: 200, data: result };
    },

    "POST /api/v1/evidence/collect": async ({ body }) => {
      const input = objectBody(body);
      if (!input || boundedText(input.project, "project")) return { status: 400, data: { error: "Invalid project" } };
      const result = services.evidence.collect(input.project, input);
      return { status: 200, data: result };
    },

    "POST /api/v1/observations/ingest": async ({ body }) => {
      const input = objectBody(body) || {};
      if (input.limit !== undefined) {
        const limit = parseLimit(input.limit);
        if (typeof limit !== "number") return { status: 400, data: { error: limit.error } };
      }
      const result = services.observation.ingest(input);
      return { status: 200, data: result };
    },

    "POST /api/v1/observations/query": async ({ body }) => {
      const input = objectBody(body) || {};
      const limit = parseLimit(input.limit);
      if (typeof limit !== "number") return { status: 400, data: { error: limit.error } };
      const result = services.observation.query(input.project, { ...input, limit });
      return { status: 200, data: result };
    },

    "GET /api/v1/audit/recent": async ({ params }) => {
      const limit = parseLimit(params.limit);
      if (typeof limit !== "number") return { status: 400, data: { error: limit.error } };
      const entries = services.audit.recent(limit);
      return { status: 200, data: { entries } };
    },
  };
}

module.exports = { createRoutes, parseLimit, MAX_LIMIT };
