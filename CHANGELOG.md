# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- README generation from SourceDocs.AI
- Generation time tracking for all API routes
- Enhanced webhook logging capabilities
- Survey completion status tracking for users
- Stripe payment integration for Pro upgrades
- User survey modal with database storage
- GitHub OAuth authentication system
- Supabase usage tracking with free tier (1 generation per month)
- LICENSE and CODE_OF_CONDUCT document generation
- CONTRIBUTING.md generation feature
- Changelog generation functionality
- Vercel Analytics and Speed Insights integration
- Premium README preview with enhanced styling
- HTML rendering support in markdown preview

### Changed
- Rename `/api/generate` endpoint to `/api/readme` for consistency
- Improve README formatting and spacing
- Enhance prompt quality for better documentation generation
- Update React and Next.js to latest versions
- Fix Tailwind v4 CSS compatibility
- Update README generation prompts to level 11 quality

### Fixed
- Pro status display after account upgrade
- Upgrade detection to verify from database instead of URL
- Survey completion status persistence from database
- Stripe API version compatibility
- TypeScript compilation errors in auth.ts and github.ts
- Code of conduct email placeholder formatting
- Footer JSX syntax issues
- License detection to not assume MIT by default

### Security
- Add user authentication and authorization
- Implement secure payment processing with Stripe
- Add database-backed user session management
