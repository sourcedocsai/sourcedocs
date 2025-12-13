#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = "https://www.sourcedocs.ai/api/v1";
const API_KEY = process.env.SOURCEDOCS_API_KEY;

if (!API_KEY) {
  console.error("Error: SOURCEDOCS_API_KEY environment variable is required");
  console.error("Get your API key at https://www.sourcedocs.ai/settings");
  process.exit(1);
}

const DOC_TYPES = ["readme", "changelog", "contributing", "license", "codeofconduct", "comments"];

// Create server
const server = new Server(
  {
    name: "sourcedocs-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_docs",
        description: "Generate documentation for a GitHub repository. Supports README, CHANGELOG, CONTRIBUTING, LICENSE, and CODE_OF_CONDUCT.",
        inputSchema: {
          type: "object",
          properties: {
            repo_url: {
              type: "string",
              description: "GitHub repository URL (e.g., https://github.com/owner/repo)",
            },
            doc_type: {
              type: "string",
              enum: ["readme", "changelog", "contributing", "license", "codeofconduct"],
              description: "Type of documentation to generate",
            },
          },
          required: ["repo_url", "doc_type"],
        },
      },
      {
        name: "generate_comments",
        description: "Add documentation comments to a source code file from GitHub. Supports JSDoc, TSDoc, docstrings, GoDoc, Javadoc, and 20+ languages.",
        inputSchema: {
          type: "object",
          properties: {
            file_url: {
              type: "string",
              description: "GitHub file URL (e.g., https://github.com/owner/repo/blob/main/src/file.ts)",
            },
          },
          required: ["file_url"],
        },
      },
      {
        name: "check_usage",
        description: "Check your SourceDocs API usage and remaining quota",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "generate_docs") {
      const { repo_url, doc_type } = args as { repo_url: string; doc_type: string };

      // Validate inputs
      if (!repo_url || !repo_url.includes("github.com")) {
        throw new McpError(ErrorCode.InvalidParams, "Invalid GitHub URL");
      }
      if (!["readme", "changelog", "contributing", "license", "codeofconduct"].includes(doc_type)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid doc_type. Must be one of: readme, changelog, contributing, license, codeofconduct`
        );
      }

      // Call SourceDocs API
      const response = await fetch(API_BASE + "/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repo_url, doc_type }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new McpError(
          ErrorCode.InternalError,
          `API error (${response.status}): ${error.error || 'Unknown error'}`
        );
      }

      const data = await response.json() as { content: string; repo: string; doc_type: string };

      return {
        content: [
          {
            type: "text",
            text: data.content,
          },
        ],
      };
    }

    if (name === "generate_comments") {
      const { file_url } = args as { file_url: string };

      // Validate input
      if (!file_url || !file_url.includes("github.com/") || !file_url.includes("/blob/")) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid GitHub file URL. Expected format: https://github.com/owner/repo/blob/branch/path/to/file.ext"
        );
      }

      // Call SourceDocs API
      const response = await fetch(API_BASE + "/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_url, doc_type: "comments" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new McpError(
          ErrorCode.InternalError,
          `API error (${response.status}): ${error.error || 'Unknown error'}`
        );
      }

      const data = await response.json() as { 
        content: string; 
        file: { name: string; path: string; repo: string };
      };

      return {
        content: [
          {
            type: "text",
            text: `// File: ${data.file.name}\n// Path: ${data.file.path}\n// Repo: ${data.file.repo}\n\n${data.content}`,
          },
        ],
      };
    }

    if (name === "check_usage") {
      const response = await fetch(API_BASE + "/status", {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new McpError(ErrorCode.InternalError, "Failed to check usage");
      }

      const data = await response.json() as {
        plan: string;
        api_calls: {
          used: number;
          limit: number;
          remaining: number;
          resets_at: string;
        };
      };

      return {
        content: [
          {
            type: "text",
            text: `Plan: ${data.plan}\nAPI calls used: ${data.api_calls.used}/${data.api_calls.limit}\nRemaining: ${data.api_calls.remaining}\nResets: ${new Date(data.api_calls.resets_at).toLocaleDateString()}`,
          },
        ],
      };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SourceDocs MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
