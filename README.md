<div align="center">

# SourceDocs

**Turn any GitHub repo into professional documentation in seconds.**

[See It Work](#-see-it-work) · [Quick Start](#quick-start) · [API](#api-reference)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Claude](https://img.shields.io/badge/Claude-3.5-orange)](https://www.anthropic.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

<p align="center">
  <i>Your AI tech writer that reads codebases and generates documentation that doesn't suck.</i>
</p>

---

## ⚡ See It Work

```bash
# Paste any GitHub URL
https://github.com/vercel/next.js

# Choose document type → Hit generate
# Get professional docs in 10 seconds
```

Works with **any** public repository. Zero configuration. Zero setup time.

---

## What You Get

| | |
|:--|:--|
| **README** — Project overviews that explain what you actually built | **CHANGELOG** — Version history with proper semantic formatting |
| **CONTRIBUTING** — Guidelines that make people want to contribute | **LICENSE** — Legal files that make sense to humans |
| **CODE OF CONDUCT** — Community standards without the corporate speak | **CODE COMMENTS** — JSDoc, docstrings, and inline docs for any file |

---

## How It Actually Works

**→ Deep Repository Analysis**  
Claude 3.5 reads your package.json, dependencies, file structure, and actual source code to understand your project.

**→ Context-Aware Generation**  
React projects get React examples. API projects get endpoint documentation. Python gets docstrings. TypeScript gets JSDoc.

**→ Professional Templates**  
Follows documentation patterns from successful open-source projects with thousands of stars.

**→ Multiple Output Formats**  
More than just README files. Generate the complete documentation suite your project needs.

---

## Quick Start

1. **Sign in** with GitHub (required for repository access)
2. **Paste** any public repository URL
3. **Select** document type from the dropdown
4. **Generate** → **Copy** → **Commit to your repo**

The AI analyzes your:
- Tech stack and dependencies
- Code architecture patterns  
- File organization structure
- Repository metadata and history

---

## Usage Examples

### Generate a README

```typescript
// POST /api/readme
{
  "url": "https://github.com/microsoft/vscode"
}

// Returns professional README with:
// - Project description
// - Installation instructions  
// - Usage examples
// - API documentation
// - Contributing guidelines
```

### Add Code Comments

```typescript  
// POST /api/comments
{
  "url": "https://github.com/facebook/react/blob/main/packages/react/src/React.js"
}

// Returns the same file with:
// - JSDoc comments
// - Type annotations
// - Usage examples
// - Parameter descriptions
```

---

## API Reference

| Endpoint | Purpose | Input |
|:---------|:--------|:------|
| `/api/readme` | Generate README documentation | Repository URL |
| `/api/changelog` | Create version history from commits | Repository URL |
| `/api/contributing` | Build contributor guidelines | Repository URL |
| `/api/license` | Generate formatted license files | Repository URL |
| `/api/codeofconduct` | Create community standards | Repository URL |
| `/api/comments` | Add documentation to source files | File URL |

### Authentication

```typescript
// All API endpoints require authentication
const response = await fetch('/api/readme', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    url: 'https://github.com/user/repo' 
  })
})

const { content } = await response.json()
// → Professional markdown documentation
```

---

## Pricing

| Plan | Generations | API Access | Price |
|:-----|:------------|:-----------|:------|
| **Free** | 1/month | ❌ | $0 |
| **Web Pro** | Unlimited | ❌ | $8/month |
| **API Pro** | 1 web + 100 API | ✅ | $15/month |
| **Bundle** | Unlimited + 100 API | ✅ | $20/month |

Usage resets monthly. No overage fees.

---

## Tech Stack

Built for reliability at scale:

```typescript
// Frontend
Next.js 16 + React 19 + TypeScript 5
TailwindCSS + Tailwind Typography

// AI & APIs  
Anthropic Claude 3.5 Sonnet
GitHub REST API + Raw Content API

// Backend
Supabase (Database + Auth)
NextAuth.js (GitHub OAuth)
Stripe (Payments + Billing Portal)

// Infrastructure
Vercel (Hosting + Analytics + Speed Insights)
Vercel Edge Runtime
```

---

## Why SourceDocs?

**The Problem:** Writing documentation takes hours. Keeping it updated takes more hours. Most repos have terrible or outdated docs.

**The Solution:** AI that actually understands code and generates documentation that developers want to read.

**→ Actually Smart**  
Reads your entire codebase, not just the README. Understands frameworks, patterns, and project structure.

**→ Context-Aware**  
Generates examples using your actual dependencies. API docs include your real endpoints.

**→ Multiple Formats**  
Complete documentation suite. README, contributing guidelines, changelogs, code comments.

**→ GitHub Native**  
Built for the GitHub workflow. Paste URLs, get markdown, commit to your repo.

---

## Local Development

```bash
git clone https://github.com/username/sourcedocs
cd sourcedocs
npm install
```

<details>
<summary>Environment Setup</summary>

```bash
cp .env.example .env.local
```

Required environment variables:
- `ANTHROPIC_API_KEY` — Claude API access
- `GITHUB_ID` & `GITHUB_SECRET` — OAuth app credentials  
- `NEXTAUTH_SECRET` — NextAuth.js encryption key
- `SUPABASE_URL` & `SUPABASE_ANON_KEY` — Database access
- `STRIPE_SECRET_KEY` — Payment processing

</details>

```bash
npm run dev
# → http://localhost:3000
```

---

## Contributing

Found a bug? Want to add a feature? Contributions welcome.

```bash
git clone https://github.com/username/sourcedocs
cd sourcedocs  
npm install
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

<div align="center">

**[Try SourceDocs](https://sourcedocs.dev)** · **[Documentation](https://docs.sourcedocs.dev)** · **[API Docs](https://docs.sourcedocs.dev/api)**

Built with ❤️ for developers who deserve better docs

</div>