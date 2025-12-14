#!/usr/bin/env node

/**
 * SourceDocs MCP Server
 * 
 * This Model Context Protocol server enables AI assistants like Claude to
 * generate documentation for GitHub repositories. It provides tools for
 * generating README files, changelogs, contributing guides, code comments,
 * class diagrams, and more.
 * 
 * Configuration:
 * Set the SOURCEDOCS_API_KEY environment variable to your SourceDocs API key.
 * Get your key at https://www.sourcedocs.ai/settings
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// API configuration
const API_BASE = "https://www.sourcedocs.ai/api/v1";
const API_KEY = process.env.SOURCEDOCS_API_KEY;

// Validate API key is present
if (!API_KEY) {
  console.error("Error: SOURCEDOCS_API_KEY environment variable is required");
  console.error("Get your API key at https://www.sourcedocs.ai/settings");
  process.exit(1);
}

/**
 * Create the MCP server instance with tool capabilities
 */
const server = new Server(
  {
    name: "sourcedocs-mcp",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 * 
 * This handler returns the schema for all tools provided by this server.
 * Each tool has a name, description, and JSON Schema for its parameters.
 */
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
        name: "generate_class_diagram",
        description: "Generate a Mermaid class diagram showing classes, interfaces, and their relationships for a GitHub repository. The diagram can be embedded in README or documentation files.",
        inputSchema: {
          type: "object",
          properties: {
            repo_url: {
              type: "string",
              description: "GitHub repository URL (e.g., https://github.com/owner/repo)",
            },
            focus_directory: {
              type: "string",
              description: "Optional: Only analyze files in this directory (e.g., 'src/models')",
            },
            max_classes: {
              type: "number",
              description: "Optional: Maximum number of classes to include (default: 20)",
            },
          },
          required: ["repo_url"],
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

/**
 * Handle tool execution requests
 * 
 * This handler executes the requested tool with the provided arguments
 * and returns the results to the AI assistant.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Tool: generate_docs
    // Generate standard documentation files (README, CHANGELOG, etc.)
    if (name === "generate_docs") {
      const { repo_url, doc_type } = args as { repo_url: string; doc_type: string };

      // Validate GitHub URL
      if (!repo_url || !repo_url.includes("github.com")) {
        throw new McpError(ErrorCode.InvalidParams, "Invalid GitHub URL. Expected format: https://github.com/owner/repo");
      }

      // Validate document type
      const validTypes = ["readme", "changelog", "contributing", "license", "codeofconduct"];
      if (!validTypes.includes(doc_type)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid doc_type "${doc_type}". Must be one of: ${validTypes.join(", ")}`
        );
      }

      // Call the SourceDocs API
      const response = await fetch(API_BASE + "/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repo_url, doc_type }),
      });

      // Handle API errors
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new McpError(
          ErrorCode.InternalError,
          `SourceDocs API error (${response.status}): ${errorData.error || "Unknown error"}`
        );
      }

      const data = await response.json() as { content: string; repo: string; doc_type: string };

      // Return the generated documentation
      return {
        content: [
          {
            type: "text",
            text: data.content,
          },
        ],
      };
    }

    // Tool: generate_comments
    // Add documentation comments to a source code file
    if (name === "generate_comments") {
      const { file_url } = args as { file_url: string };

      // Validate GitHub file URL format
      if (!file_url || !file_url.includes("github.com/") || !file_url.includes("/blob/")) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid GitHub file URL. Expected format: https://github.com/owner/repo/blob/branch/path/to/file.ext"
        );
      }

      // Call the SourceDocs API
      const response = await fetch(API_BASE + "/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_url, doc_type: "comments" }),
      });

      // Handle API errors
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new McpError(
          ErrorCode.InternalError,
          `SourceDocs API error (${response.status}): ${errorData.error || "Unknown error"}`
        );
      }

      const data = await response.json() as {
        content: string;
        file: { name: string; path: string; repo: string };
      };

      // Return the documented code with file information
      return {
        content: [
          {
            type: "text",
            text: `// File: ${data.file.name}\n// Path: ${data.file.path}\n// Repo: ${data.file.repo}\n\n${data.content}`,
          },
        ],
      };
    }

    // Tool: generate_class_diagram
    // Generate a Mermaid class diagram from repository source code
    if (name === "generate_class_diagram") {
      const { repo_url, focus_directory, max_classes } = args as {
        repo_url: string;
        focus_directory?: string;
        max_classes?: number;
      };

      // Validate GitHub URL
      if (!repo_url || !repo_url.includes("github.com")) {
        throw new McpError(ErrorCode.InvalidParams, "Invalid GitHub URL. Expected format: https://github.com/owner/repo");
      }

      // Build the request body with optional parameters
      const requestBody: Record<string, any> = {
        repo_url,
        doc_type: "classdiagram",
        options: {},
      };

      if (focus_directory) {
        requestBody.options.focus_directory = focus_directory;
      }
      if (max_classes) {
        requestBody.options.max_classes = max_classes;
      }

      // Call the SourceDocs API
      const response = await fetch(API_BASE + "/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Handle API errors
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new McpError(
          ErrorCode.InternalError,
          `SourceDocs API error (${response.status}): ${errorData.error || "Unknown error"}`
        );
      }

      const data = await response.json() as {
        content: string;
        repo: string;
        classes: number;
        relationships: number;
        language: string | null;
      };

      // Return the diagram wrapped in a Mermaid code fence
      // Also include metadata about the analysis
      const metaInfo = [
        `Repository: ${data.repo}`,
        `Classes found: ${data.classes}`,
        `Relationships: ${data.relationships}`,
        data.language ? `Primary language: ${data.language}` : null,
      ].filter(Boolean).join("\n");

      return {
        content: [
          {
            type: "text",
            text: `# Class Diagram\n\n${metaInfo}\n\n\`\`\`mermaid\n${data.content}\n\`\`\``,
          },
        ],
      };
    }

    // Tool: check_usage
    // Check API usage and remaining quota
    if (name === "check_usage") {
      const response = await fetch(API_BASE + "/status", {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new McpError(ErrorCode.InternalError, "Failed to check API usage status");
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

      // Format the usage information
      const resetDate = new Date(data.api_calls.resets_at).toLocaleDateString();
      
      return {
        content: [
          {
            type: "text",
            text: [
              `SourceDocs API Status`,
              `--------------------`,
              `Plan: ${data.plan}`,
              `API calls used: ${data.api_calls.used}/${data.api_calls.limit}`,
              `Remaining: ${data.api_calls.remaining}`,
              `Resets: ${resetDate}`,
            ].join("\n"),
          },
        ],
      };
    }

    // Unknown tool requested
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);

  } catch (error) {
    // Re-throw MCP errors as-is
    if (error instanceof McpError) {
      throw error;
    }
    
    // Wrap other errors in MCP error format
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  }
});

/**
 * Start the MCP server
 * 
 * The server uses stdio transport to communicate with the AI assistant.
 * Status messages are written to stderr so they don't interfere with
 * the protocol communication on stdout.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SourceDocs MCP server v1.1.0 running");
  console.error("Available tools: generate_docs, generate_comments, generate_class_diagram, check_usage");
}

// Handle startup errors
main().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
