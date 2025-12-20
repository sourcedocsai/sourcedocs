<div align="center">

# SourceDocs

**Turn any GitHub repo into professional documentation in seconds.**

[See It Work](#-see-it-work) · [Quick Start](#quick-start) · [API Reference](#api-reference)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Claude](https://img.shields.io/badge/Claude-3.5-orange)](https://www.anthropic.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

> **The problem:** Great projects with terrible documentation die in obscurity.
> 
> **The solution:** AI that reads your codebase and writes docs that developers actually want to read.

---

## ⚡ See It Work

```bash
# Paste any GitHub URL
https://github.com/microsoft/vscode

# Select document type → Generate
# Professional docs in 10 seconds ✨
```

No setup. No configuration. Works with any public repository.

---

## What You Get

| Documentation Type | What It Does |
|:------------------|:-------------|
| **README** | Project overviews that explain what you actually built |
| **API Docs** | Endpoint documentation with real examples from your code |
| **CHANGELOG** | Version history that follows semantic formatting |
| **CONTRIBUTING** | Guidelines that make people want to contribute |
| **CODE COMMENTS** | JSDoc, docstrings, and inline docs for any source file |
| **LICENSE** | Legal files formatted for humans |

---

## How It Works

**→ Deep Code Analysis**  
Claude 3.5 reads your package.json, dependencies, file structure, and actual source code to understand your project's architecture.

**→ Context-Aware Generation**  
React projects get React examples. API projects get endpoint docs. Python gets proper docstrings. TypeScript gets JSDoc.

**→ Professional Templates**  
Follows documentation patterns from successful open-source projects with thousands of stars.

---

## Quick Start

```bash
# 1. Sign in with GitHub
# 2. Paste repository URL
https://github.com/your-username/your-repo

# 3. Choose document type
README | CHANGELOG | CONTRIBUTING | LICENSE | CODE COMMENTS

# 4. Generate → Copy → Commit
```

The AI analyzes your:
- Tech stack and dependencies
- Code architecture patterns  
- File organization structure
- Repository metadata and commit history

---

## API Reference

### Generate Documentation

```typescript
POST /api/v1/generate

{
  "url": "https://github.com/facebook/react",
  "type": "readme"
}

// Response
{
  "content": "# React\n\nA JavaScript library for building user interfaces...",
  "metadata": {
    "language": "JavaScript",
    "framework": "React",
    "dependencies": [...],
    "generated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Add Code Comments

```typescript
POST /api/comments

{
  "url": "https://github.com/vercel/next.js/blob/main/packages/next/src/server/app-render.tsx"
}

// Returns the same file with:
// - JSDoc comments
// - Type annotations  
// - Usage examples
// - Parameter descriptions
```

### Authentication

```typescript
const response = await fetch('/api/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://github.com/user/repo',
    type: 'readme'
  })
})

const { content } = await response.json()
```

---

## Supported Languages & Frameworks

| Language | Frameworks | Documentation Style |
|:---------|:-----------|:-------------------|
| **TypeScript** | Next.js, React, Node.js | JSDoc comments, interface docs |
| **JavaScript** | React, Vue, Express | JSDoc, inline examples |
| **Python** | Django, Flask, FastAPI | Docstrings, type hints |
| **Go** | Gin, Echo, stdlib | Go doc format |
| **Rust** | Axum, Rocket | Rustdoc comments |
| **Java** | Spring, Maven | Javadoc format |

---

## Pricing

| Plan | Web Generations | API Calls | Price |
|:-----|:---------------|:----------|:------|
| **Free** | 1/month | None | $0 |
| **Web Pro** | Unlimited | None | $8/month |
| **API Pro** | 1/month | 100/month | $15/month |
| **Bundle** | Unlimited | 100/month | $20/month |

No overage fees. Usage resets monthly.

---

## Why SourceDocs?

**→ Actually Reads Code**  
Analyzes your entire codebase structure, not just filenames. Understands frameworks, dependencies, and architectural patterns.

**→ Context-Aware Examples**  
Generated documentation includes examples using your actual dependencies and follows your project's conventions.

**→ Multiple Document Types**  
Complete documentation suite beyond just README files. Contributing guides, changelogs, API docs, and inline code comments.

**→ GitHub Native**  
Built for the GitHub workflow. Paste repository URLs, get markdown, commit directly to your repo.

**→ Production Quality**  
Uses patterns from successful open-source projects. No generic templates or corporate speak.

---

## Tech Stack

```typescript
// Frontend
Next.js 16 + React 19 + TypeScript 5
Tailwind CSS + Tailwind Typography

// AI & APIs  
Anthropic Claude 3.5 Sonnet
GitHub REST API + Raw Content API

// Backend
Supabase (Database + Authentication)
NextAuth.js (GitHub OAuth)
Stripe (Payments + Billing)

// Infrastructure  
Vercel (Hosting + Analytics)
Vercel Edge Runtime
```

---

## Local Development

```bash
git clone https://github.com/your-username/sourcedocs
cd sourcedocs
npm install
```

<details>
<summary>Environment Variables</summary>

```bash
cp .env.example .env.local
```

Required variables:
```env
ANTHROPIC_API_KEY=your_claude_api_key
GITHUB_ID=your_github_app_id
GITHUB_SECRET=your_github_app_secret
NEXTAUTH_SECRET=your_nextauth_secret
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret
```

</details>

```bash
npm run dev
# → http://localhost:3000
```

---

## API Usage Examples

### Generate README for Popular Repos

```javascript
// React
const react = await generateDocs('https://github.com/facebook/react', 'readme')

// Next.js  
const nextjs = await generateDocs('https://github.com/vercel/next.js', 'readme')

// Vue
const vue = await generateDocs('https://github.com/vuejs/vue', 'readme')
```

### Batch Process Multiple Files

```javascript
const files = [
  'https://github.com/microsoft/vscode/blob/main/src/vs/editor/editor.api.ts',
  'https://github.com/microsoft/vscode/blob/main/src/vs/platform/files/common/files.ts'
]

const documented = await Promise.all(
  files.map(url => addComments(url))
)
```

---

## Contributing

Found a bug? Want to add a feature? Contributions welcome.

```bash
git clone https://github.com/your-username/sourcedocs
cd sourcedocs
npm install
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

<div align="center">

**[Try SourceDocs](https://sourcedocs.dev)** · **[API Docs](https://docs.sourcedocs.dev)** · **[Examples](https://examples.sourcedocs.dev)**

Built with ❤️ for developers who deserve better documentation

</div>