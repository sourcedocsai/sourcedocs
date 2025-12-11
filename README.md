<div align="center">

# SourceDocs

**Generate professional documentation for your GitHub repos in seconds.**

[Quick Start](#quick-start) · [Features](#features) · [API](#api)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextjs&logoColor=white)](https://nextjs.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

<p align="center">
  <i>Your AI tech writer that turns messy codebases into polished documentation.</i>
</p>

---

## ⚡ Quick Start

Drop in any GitHub URL and get instant documentation:

```bash
# Visit the app
https://sourcedocs.vercel.app

# Enter your repo URL
https://github.com/username/project

# Generate → Copy → Done
```

Works with any public repository. No setup required.

---

## What You Get

| | |
|:--|:--|
| **README** — Professional project documentation | **CHANGELOG** — Version history and releases |
| **CONTRIBUTING** — Guidelines for contributors | **LICENSE** — Legal terms and permissions |
| **CODE OF CONDUCT** — Community standards | **Smart Analysis** — Context-aware content |

---

## Features

**→ AI-Powered Analysis**  
Uses Claude 3.5 to understand your codebase structure, dependencies, and purpose.

**→ Multiple Document Types**  
Generate README, CHANGELOG, CONTRIBUTING guides, LICENSE files, and CODE OF CONDUCT.

**→ GitHub Integration**  
Sign in with GitHub. Automatically fetches repository data and file structure.

**→ Professional Templates**  
Creates documentation that follows industry best practices and conventions.

**→ Instant Copy-Paste**  
Generated markdown ready to commit directly to your repository.

---

## How It Works

1. **Authenticate** with your GitHub account
2. **Paste** any public repository URL
3. **Select** document type (README, CHANGELOG, etc.)
4. **Generate** with AI analysis
5. **Copy** and commit to your repo

The AI analyzes your:
- Package.json dependencies
- File structure and organization  
- Code patterns and frameworks
- Repository metadata

---

## Tech Stack

Built with modern tools for reliability and speed:

```typescript
// Core Framework
Next.js 16 + React 19 + TypeScript 5

// AI Integration
Anthropic Claude 3.5 Sonnet

// Authentication & Database
NextAuth.js + Supabase

// Payments & Analytics
Stripe + Vercel Analytics
```

---

## API

The service provides REST endpoints for programmatic access:

| Endpoint | Purpose |
|:---------|:--------|
| `/api/readme` | Generate README documentation |
| `/api/changelog` | Create version history |
| `/api/contributing` | Build contributor guidelines |
| `/api/license` | Generate license files |
| `/api/codeofconduct` | Create community standards |

---

## Usage Limits

| Plan | Documents/Month | Price |
|:-----|:----------------|:------|
| **Free** | 10 generations | $0 |
| **Pro** | Unlimited | $5/month |

Rate limits reset monthly. Upgrade anytime for unlimited access.

---

## Local Development

```bash
# Clone and install
git clone https://github.com/username/sourcedocs
cd sourcedocs
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys for Claude, Supabase, etc.

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

---

## Why SourceDocs?

Writing good documentation takes hours. We do it in seconds.

- **Context-Aware** — Understands your tech stack and project structure
- **Professional Quality** — Follows documentation best practices
- **Multiple Formats** — More than just README files
- **GitHub Native** — Built for the GitHub workflow

Stop spending hours on documentation. Let AI handle the heavy lifting.

---

## Contributing

Contributions welcome! Please check out our [contributing guidelines](CONTRIBUTING.md).

```bash
git clone https://github.com/username/sourcedocs
npm install
npm run dev
```

---

<div align="center">

**[Website](https://sourcedocs.vercel.app)** · **[Documentation](./docs)** · **[Issues](https://github.com/username/sourcedocs/issues)**

Built with ❤️ by developers, for developers

</div>
