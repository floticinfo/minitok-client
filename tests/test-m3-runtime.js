import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { createRuntimeServices } from '../src/runtime/index.js';
import { KnowledgeService } from '../src/runtime/knowledge.js';
import { AnalysisService } from '../src/runtime/analysis.js';
import { CompactService } from '../src/runtime/compact.js';
import { ObservationService, VALID_EVENT_TYPES } from '../src/runtime/observations.js';
import { RuntimeServer } from '../src/runtime/server.js';
import { getToolDefinitions, getToolHandler } from '../src/mcp/tools.js';
import auditModule from '../src/runtime/audit.js';
const { AuditService } = auditModule;

function httpFetch(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    }).on("error", (e) => resolve({ status: 0, error: e.message }));
  });
}

function httpPost(url, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request(url, { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } }, (res) => {
      let b = "";
      res.on("data", c => b += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: b }); }
      });
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.end(data);
  });
}

describe("M3 Runtime Services", () => {
  it("creates all 8 services", () => {
    const svc = createRuntimeServices();
    assert.ok(svc.knowledge instanceof KnowledgeService);
    assert.ok(svc.analysis instanceof AnalysisService);
    assert.ok(svc.compact instanceof CompactService);
    assert.ok(svc.evidence);
    assert.ok(svc.workspace);
    assert.ok(svc.audit);
    assert.ok(svc.entitlement);
    assert.ok(svc.observation instanceof ObservationService);
  });

  it("knowledge query returns outcomes", () => {
    const svc = createRuntimeServices();
    const r = svc.knowledge.query({ limit: 5 });
    assert.ok(Array.isArray(r.outcomes));
    assert.equal(typeof r.total, "number");
  });

  it("knowledge record stores outcome", () => {
    const svc = createRuntimeServices();
    const r = svc.knowledge.record({ goal: "test-m3-" + Date.now(), status: "success", cycles: 1, summary: "m3 test" });
    assert.equal(r.recorded, true);
    assert.equal(typeof r.total, "number");
    assert.ok(r.total > 0);
  });

  it("analysis analyze returns patterns", () => {
    const svc = createRuntimeServices();
    const r = svc.analysis.analyze();
    assert.ok(Array.isArray(r.patterns));
    assert.ok(Array.isArray(r.recommendations));
  });

  it("analysis recommend returns policy", () => {
    const svc = createRuntimeServices();
    const r = svc.analysis.recommend(null, { max_cycles: 3 });
    assert.ok(r.recommended);
    assert.ok(Array.isArray(r.reasons));
  });

  it("compact compacts long text", () => {
    const svc = createRuntimeServices();
    const text = "x".repeat(50000);
    const r = svc.compact.compact(text, { budget_chars: 1000 });
    assert.ok(r.compacted);
    assert.ok(r.text.length <= 1200);
    assert.equal(r.original_chars, 50000);
  });

  it("compact does not compact short text", () => {
    const svc = createRuntimeServices();
    const r = svc.compact.compact("hello", { budget_chars: 1000 });
    assert.equal(r.compacted, false);
    assert.equal(r.text, "hello");
  });

  it("entitlement status returns valid structure", () => {
    const svc = createRuntimeServices();
    const r = svc.entitlement.status();
    assert.equal(typeof r.allowed, "boolean");
    assert.equal(typeof r.state, "string");
    assert.equal(typeof r.message, "string");
  });

  it("audit service logs and reads", () => {
    const tmpFile = path.join(os.tmpdir(), "m3-test-audit-" + Date.now() + ".jsonl");
    try {
      const audit = new AuditService(tmpFile);
      audit.log({ action: "test", file: "test.js" });
      const entries = audit.recent(10);
      assert.ok(entries.length >= 1);
      assert.equal(entries[entries.length - 1].action, "test");
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  });
});

describe("M3 Observation Service", () => {
  it("ingests valid events", () => {
    const obs = new ObservationService({ storageDir: os.tmpdir() + "/m3-obs-test" });
    const r = obs.ingest({ project: "test-proj", events: [
      { type: "file_modified", path: "src/a.js", action: "modify" },
      { type: "test_result", command: "npm test", passed: true },
    ]});
    assert.equal(r.accepted, 2);
    assert.equal(r.errors.length, 0);
  });

  it("rejects invalid event types", () => {
    const obs = new ObservationService({ storageDir: os.tmpdir() + "/m3-obs-test2" });
    const r = obs.ingest({ events: [{ type: "invalid_type" }] });
    assert.equal(r.accepted, 0);
    assert.equal(r.errors.length, 1);
  });

  it("handles empty events array", () => {
    const obs = new ObservationService();
    const r = obs.ingest({ events: [] });
    assert.equal(r.accepted, 0);
  });

  it("validates all event types", () => {
    assert.ok(VALID_EVENT_TYPES.includes("file_modified"));
    assert.ok(VALID_EVENT_TYPES.includes("test_result"));
    assert.ok(VALID_EVENT_TYPES.includes("task_started"));
    assert.ok(VALID_EVENT_TYPES.includes("session_end"));
  });
});

describe("M3 HTTP Server", () => {
  let server;

  it("starts on localhost", async () => {
    server = new RuntimeServer({ port: 45999, knowledgePath: os.tmpdir() + "/m3-knowledge-test" });
    await server.start();
    assert.equal(server.port, 45999);
  });

  it("GET /health returns 200", async () => {
    const r = await httpFetch("http://127.0.0.1:45999/health");
    assert.equal(r.status, 200);
    assert.equal(r.data.status, "ok");
  });

  it("GET /api/v1/status returns entitlement + knowledge", async () => {
    const r = await httpFetch("http://127.0.0.1:45999/api/v1/status");
    assert.equal(r.status, 200);
    assert.equal(typeof r.data.entitlement.valid, "boolean");
    assert.equal(typeof r.data.knowledge.outcomes, "number");
  });

  it("POST /api/v1/knowledge/query works", async () => {
    const r = await httpPost("http://127.0.0.1:45999/api/v1/knowledge/query", {});
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.data.outcomes));
  });

  it("POST /api/v1/context/compact works", async () => {
    const r = await httpPost("http://127.0.0.1:45999/api/v1/context/compact", { text: "hello" });
    assert.equal(r.status, 200);
    assert.equal(r.data.text, "hello");
  });

  it("POST /api/v1/context/compact rejects missing text", async () => {
    const r = await httpPost("http://127.0.0.1:45999/api/v1/context/compact", {});
    assert.equal(r.status, 400);
  });

  it("POST /api/v1/observations/ingest works", async () => {
    const r = await httpPost("http://127.0.0.1:45999/api/v1/observations/ingest", {
      project: "test", events: [{ type: "file_modified", path: "a.js", action: "modify" }],
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.accepted, 1);
  });

  it("GET unknown route returns 404", async () => {
    const r = await httpFetch("http://127.0.0.1:45999/api/v1/unknown");
    assert.equal(r.status, 404);
  });

  it("stops cleanly", async () => {
    await server.stop();
  });
});

describe("M3 MCP Tools", () => {
  it("defines 8 tools", () => {
    const tools = getToolDefinitions();
    assert.equal(tools.length, 8);
    const names = tools.map(t => t.name);
    assert.ok(names.includes("minitok_knowledge_query"));
    assert.ok(names.includes("minitok_knowledge_record"));
    assert.ok(names.includes("minitok_analyze_failures"));
    assert.ok(names.includes("minitok_recommend_policy"));
    assert.ok(names.includes("minitok_compact_context"));
    assert.ok(names.includes("minitok_collect_evidence"));
    assert.ok(names.includes("minitok_status"));
    assert.ok(names.includes("minitok_observe"));
  });

  it("each tool has inputSchema", () => {
    for (const tool of getToolDefinitions()) {
      assert.ok(tool.inputSchema, "Tool " + tool.name + " missing inputSchema");
      assert.equal(tool.inputSchema.type, "object");
    }
  });

  it("knowledge_query tool works", async () => {
    const svc = createRuntimeServices();
    const r = await getToolHandler("minitok_knowledge_query", {}, svc);
    assert.ok(r.content);
    assert.ok(r.content[0].text);
    const data = JSON.parse(r.content[0].text);
    assert.ok(Array.isArray(data.outcomes));
  });

  it("compact tool works", async () => {
    const svc = createRuntimeServices();
    const r = await getToolHandler("minitok_compact_context", { text: "hello world" }, svc);
    const data = JSON.parse(r.content[0].text);
    assert.equal(data.text, "hello world");
  });

  it("observe tool works", async () => {
    const svc = createRuntimeServices();
    const r = await getToolHandler("minitok_observe", { events: [{ type: "file_modified", path: "a.js", action: "modify" }] }, svc);
    const data = JSON.parse(r.content[0].text);
    assert.equal(data.accepted, 1);
  });

  it("unknown tool throws", async () => {
    const svc = createRuntimeServices();
    await assert.rejects(() => getToolHandler("unknown_tool", {}, svc), /Unknown tool/);
  });

  it("compact without text throws", async () => {
    const svc = createRuntimeServices();
    await assert.rejects(() => getToolHandler("minitok_compact_context", {}, svc), /text is required/);
  });
});
