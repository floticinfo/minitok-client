"use strict";

const TOOLS = [
  {
    name: "minitok_knowledge_query",
    description: "Query past MINITOK evolution outcomes",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max outcomes to return" },
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
    description: "Show MINITOK entitlement and knowledge status",
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

async function getToolHandler(name, args, services) {
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
      const entitlement = services.entitlement.status();
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
