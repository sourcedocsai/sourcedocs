#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const API_BASE = "https://www.sourcedocs.ai/api/v1";
const API_KEY = process.env.SOURCEDOCS_API_KEY;
if (!API_KEY) {
    console.error("Error: SOURCEDOCS_API_KEY environment variable is required");
    console.error("Get your API key at https://www.sourcedocs.ai/settings");
    process.exit(1);
}
// Create server
const server = new index_js_1.Server({
    name: "sourcedocs-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
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
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "generate_docs") {
            const { repo_url, doc_type } = args;
            if (!repo_url || !repo_url.includes("github.com")) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, "Invalid GitHub URL");
            }
            if (!["readme", "changelog", "contributing", "license", "codeofconduct"].includes(doc_type)) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, "Invalid doc_type. Must be one of: readme, changelog, contributing, license, codeofconduct");
            }
            const response = await fetch(API_BASE + "/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ repo_url, doc_type }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `API error (${response.status}): ${errorData.error || 'Unknown error'}`);
            }
            const data = await response.json();
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
            const { file_url } = args;
            if (!file_url || !file_url.includes("github.com/") || !file_url.includes("/blob/")) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, "Invalid GitHub file URL. Expected format: https://github.com/owner/repo/blob/branch/path/to/file.ext");
            }
            const response = await fetch(API_BASE + "/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ file_url, doc_type: "comments" }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `API error (${response.status}): ${errorData.error || 'Unknown error'}`);
            }
            const data = await response.json();
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
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, "Failed to check usage");
            }
            const data = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: `Plan: ${data.plan}\nAPI calls used: ${data.api_calls.used}/${data.api_calls.limit}\nRemaining: ${data.api_calls.remaining}\nResets: ${new Date(data.api_calls.resets_at).toLocaleDateString()}`,
                    },
                ],
            };
        }
        throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    catch (error) {
        if (error instanceof types_js_1.McpError) {
            throw error;
        }
        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, error instanceof Error ? error.message : "Unknown error");
    }
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("SourceDocs MCP server running");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
