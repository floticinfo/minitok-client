"use strict";

const TOOLS = [
  {
    name: "minitok_knowledge_query",
    description: "Query past minitok evolution outcomes",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max outcomes to return" },
        project: { type: "string", description: "Project scope" },
        filter: { type: "object", properties: { status: { type: "string" } } },
      },
    },
  },
  {
    name: "minitok_knowledge_record",
    description: "Record an evolution outcome",
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string" },
        status: { type: "string", enum: ["success", "failure", "partial"] },
        cycles: { type: "number" },
        summary: { type: "string" },
      },
      required: ["goal", "status"],
    },
  },
  {
    name: "minitok_analyze_failures",
    description: "Analyze failure patterns from stored outcomes",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "minitok_recommend_policy",
    description: "Get execution policy recommendations",
    inputSchema: {
      type: "object",
      properties: {
        current_policy: { type: "object", properties: { max_cycles: { type: "number" } } },
      },
    },
  },
  {
    name: "minitok_compact_context",
    description: "Compact text to fit within a token budget",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        budget_chars: { type: "number" },
      },
      required: ["text"],
    },
  },
  {
    name: "minitok_collect_evidence",
    description: "Collect test/lint evidence from a project",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project root path" },
      },
      required: ["project"],
    },
  },
  {
    name: "minitok_status",
    description: "Show minitok entitlement and knowledge status",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "minitok_observe",
    description: "Submit observation events from an external agent",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        events: { type: "array", items: { type: "object" } },
      },
      required: ["events"],
    },
  },
];

function getToolDefinitions() { return TOOLS; }

function validateArgs(name, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("arguments must be an object");
  const limits = {
    minitok_knowledge_query: { limit: "number", project: "string" },
    minitok_knowledge_record: { goal: "string", status: "string" },
    minitok_compact_context: { text: "string", budget_chars: "number" },
    minitok_collect_evidence: { project: "string" },
    minitok_observe: { events: "array" },
  };
  const schema = limits[name] || {};
  for (const [key, type] of Object.entries(schema)) {
    if (args[key] === undefined) continue;
    const valid = type === "array" ? Array.isArray(args[key]) : typeof args[key] === type;
    if (!valid) throw new Error(`${key} must be ${type}`);
  }
  if (["minitok_knowledge_record", "minitok_compact_context", "minitok_collect_evidence", "minitok_observe"].includes(name)) {
    const required = { minitok_knowledge_record: ["goal", "status"], minitok_compact_context: ["text"], minitok_collect_evidence: ["project"], minitok_observe: ["events"] }[name];
    for (const key of required) if (args[key] === undefined) throw new Error(`${key} is required`);
  }
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 0 || args.limit > 1000)) throw new Error("limit must be an integer from 0 to 1000");
  if (args.budget_chars !== undefined && (!Number.isInteger(args.budget_chars) || args.budget_chars < 100 || args.budget_chars > 1000000)) throw new Error("budget_chars is out of range");
  if (args.events && args.events.length > 100) throw new Error("events must contain at most 100 items");
  if (args.project !== undefined && (args.project.length === 0 || args.project.length > 4096)) throw new Error("project is out of range");
  if (name === "minitok_knowledge_record" && (!args.goal || args.goal.length > 2000)) throw new Error("goal is required and must be at most 2000 characters");
  if (name === "minitok_knowledge_record" && !["success", "failure", "partial"].includes(args.status)) throw new Error("status is invalid");
  return args;
}

async function getToolHandler(name, args, services) {
  if (!TOOLS.some((tool) => tool.name === name)) throw new Error(`Unknown tool: ${name}`);
  validateArgs(name, args);
  switch (name) {
    case "minitok_knowledge_query": {
      const r = services.knowledge.query(args);
      return { content: [{ type: "text", text: JSON.stringify(r) }] };
    }
    case "minitok_knowledge_record": {
      const r = services.knowledge.record(args);
      return { content: [{ type: "text", text: JSON.stringify(r) }] };
    }
    case "minitok_analyze_failures": {
      const r = services.analysis.analyze(args?.project);
      return { content: [{ type: "text", text: JSON.stringify(r) }] };
    }
    case "minitok_recommend_policy": {
      const r = services.analysis.recommend(args?.project, args?.current_policy);
      return { content: [{ type: "text", text: JSON.stringify(r) }] };
    }
    case "minitok_compact_context": {
      if (!args.text) throw new Error("text is required");
      const r = services.compact.compact(args.text, args);
      return { content: [{ type: "text", text: JSON.stringify(r) }] };
    }
    case "minitok_collect_evidence": {
      if (!args.project) throw new Error("project is required");
      const r = services.evidence.collect(args.project);
      return { content: [{ type: "text", text: JSON.stringify(r) }] };
    }
    case "minitok_status": {
      const entitlement = await services.entitlement.status();
      const knowledge = services.knowledge.query({ limit: 0 });
      return { content: [{ type: "text", text: JSON.stringify({ entitlement, knowledge: { total: knowledge.total } }) }] };
    }
    case "minitok_observe": {
      const r = services.observation.ingest(args);
      return { content: [{ type: "text", text: JSON.stringify(r) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

module.exports = { getToolDefinitions, getToolHandler };
