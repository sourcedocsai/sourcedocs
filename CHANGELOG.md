# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Create PR button to push generated documentation directly to GitHub
- Ability to create pull requests for generated markdown files
- Code comments generator to main page

### Changed
- Publish sourcedocs-mcp version 1.0.1

### Fixed
- API and MCP capabilities for comment generation
- Header references in generated documentation
- Spacing between code declarations
- Multiple compilation errors
- Various bug fixes for improved stability

## [1.0.1] - 2025-12-12

### Added
- Stripe Customer Portal for subscription plan management
- Admin dashboard with comprehensive metrics including source and plan breakdowns
- API key management system with improved error messages
- Public API routes with authentication
- Pricing UI with plan selection
- Admin badge in header for administrative access

### Changed
- Make raw markdown format the default output, with JSON as optional
- Update all API routes to support plan-based access control
- Improve checkout API to handle empty requests with default plan

### Fixed
- JSX parsing issues in settings page
- Parameter naming in user creation functions
- Tailwind class parsing issues in admin interface
- Doc types query to use correct result variable

## [1.0.0] - 2025-12-12

### Added
- Initial release of SourceDocs platform
- Core documentation generation functionality
- MCP (Model Context Protocol) package
- Generation time tracking for all API routes
- Webhook logging system
- User survey completion and Stripe integration fields
- LICENSE and Commercial License Agreement
- Generated project documentation (README, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT)
- Dependency management with automated security updates

[Unreleased]: https://github.com/sourcedocsai/sourcedocs/compare/1.0.1...HEAD
[1.0.1]: https://github.com/sourcedocsai/sourcedocs/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/sourcedocsai/sourcedocs/commits/1.0.0