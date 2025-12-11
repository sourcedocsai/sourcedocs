# SourceDocs MCP Server

Generate professional documentation for GitHub repositories directly from Claude Desktop, Cursor, or Windsurf.

## Installation
```bash
npm install -g sourcedocs-mcp
```

## Setup

### 1. Get your API key

1. Go to [sourcedocs.ai](https://www.sourcedocs.ai)
2. Sign in with GitHub
3. Subscribe to API Pro ($15/mo) or Bundle ($20/mo)
4. Go to [Settings](https://www.sourcedocs.ai/settings)
5. Create an API key

### 2. Configure Claude Desktop

Edit your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
```json
{
  "mcpServers": {
    "sourcedocs": {
      "command": "sourcedocs-mcp",
      "env": {
        "SOURCEDOCS_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

## Usage

In Claude Desktop, you can now say:

- "Generate a README for https://github.com/owner/repo"
- "Create a changelog for https://github.com/owner/repo"
- "Generate contributing guidelines for https://github.com/owner/repo"
- "Check my SourceDocs API usage"

## Supported Document Types

| Type | Description |
|------|-------------|
| `readme` | Project README with features, installation, usage |
| `changelog` | CHANGELOG based on commits and releases |
| `contributing` | CONTRIBUTING guide with setup instructions |
| `license` | LICENSE file recommendation |
| `codeofconduct` | CODE_OF_CONDUCT (Contributor Covenant) |

## Pricing

| Plan | Price | API Calls |
|------|-------|-----------|
| API Pro | $15/month | 100/month |
| Bundle | $20/month | 100/month + unlimited web |

## Support

- Website: https://www.sourcedocs.ai
- Twitter: [@sourcedocsai](https://twitter.com/sourcedocsai)
