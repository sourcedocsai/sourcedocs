<div align="center">

# SourceDocs

**Turn any GitHub repo into professional documentation in seconds.**

[See It Work](#-see-it-work) · [Features](#what-you-get) · [API](#api)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextjs&logoColor=white)](https://nextjs.org/)
[![Anthropic](https://img.shields.io/badge/Claude-3.5-orange)](https://www.anthropic.com/)

</div>

---

<p align="center">
  <i>Your AI tech writer that transforms messy codebases into polished documentation.</i>
</p>

---

## ⚡ See It Work

```bash
# Paste any GitHub URL
https://github.com/vercel/next.js

# Select document type → Generate
# Get professional README in 10 seconds
```

Works with **any** public repository. Zero setup required.

---

## What You Get

| Document Type | What It Does |
|:--------------|:-------------|
| **README** — Project overview that actually explains things | **CHANGELOG** — Version history with proper formatting |
| **CONTRIBUTING** — Guidelines that encourage contributions | **LICENSE** — Legal terms that make sense |
| **CODE OF CONDUCT** — Community standards done right | **Smart Analysis** — AI reads your entire codebase |

---

## How It Actually Works

**→ Repository Analysis**  
Claude 3.5 reads your package.json, file structure, and code patterns to understand what your project does.

**→ Context-Aware Generation**  
Creates documentation that matches your tech stack. React projects get React examples. API projects get endpoint docs.

**→ Professional Templates**  
Follows documentation best practices used by top open-source projects.

**→ Multiple Formats**  
More than README files. Generate the full documentation suite your project needs.

---

## Quick Start

1. **Sign in** with GitHub (required for API access)
2. **Paste** any public repository URL
3. **Choose** document type (README, CHANGELOG, etc.)
4. **Generate** → **Copy** → **Commit**

The AI analyzes:
- Dependencies and frameworks
- File organization patterns
- Code structure and complexity
- Repository metadata

---

## Usage Limits

| Plan | Documents/Month | Price |
|:-----|:----------------|:------|
| **Free** | 1 generation | $0 |
| **Web Pro** | Unlimited | $8/month |
| **API Pro** | 100 API calls | $15/month |
| **Bundle** | Unlimited + 100 API | $20/month |

Limits reset monthly. No hidden fees.

---

## API Reference

| Endpoint | Purpose | Method |
|:---------|:--------|:-------|
| `/api/readme` | Generate README documentation | POST |
| `/api/changelog` | Create version history | POST |
| `/api/contributing` | Build contributor guidelines | POST |
| `/api/license` | Generate license files | POST |
| `/api/codeofconduct` | Create community standards | POST |

```typescript
// Example API call
const response = await fetch('/api/readme', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://github.com/user/repo' })
})

const { content } = await response.json()
// → Professional README markdown
```

---

## Tech Stack

Built for reliability and speed:

```typescript
// Core
Next.js 16 + React 19 + TypeScript 5

// AI Integration  
Anthropic Claude 3.5 Sonnet

// Infrastructure
Supabase + NextAuth.js + Stripe + Vercel
```

---

## Why SourceDocs?

Documentation takes **hours to write**. We do it in **10 seconds**.

- **Actually Smart** — Understands your tech stack and project structure
- **GitHub Native** — Built for the GitHub workflow developers already use  
- **Multiple Formats** — Complete documentation suite, not just README files
- **Professional Quality** — Follows patterns from successful open-source projects

Stop writing documentation from scratch. Let AI handle the heavy lifting.

---

## Local Development

```bash
git clone https://github.com/username/sourcedocs
cd sourcedocs
npm install

# Set up environment variables
cp .env.example .env.local
# Add API keys for Anthropic, Supabase, etc.

npm run dev
# → http://localhost:3000
```

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/username/sourcedocs
npm install
npm run dev
```

---

<div align="center">

**[Generate Docs](https://sourcedocs.vercel.app)** · **[API Docs](#api)** · **[Support](mailto:support@sourcedocs.dev)**

Built with ❤️ for the developer community

</div>
