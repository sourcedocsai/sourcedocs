# Contributing to sourcedocs

Thank you for your interest in contributing to sourcedocs! 🎉 We welcome contributions from developers of all experience levels. Whether you're fixing a bug, adding a feature, or improving documentation, your help makes this project better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Style Guide](#style-guide)
- [Recognition](#recognition)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- **Be respectful**: Treat everyone with respect and kindness
- **Be collaborative**: We're all working together to make this project better
- **Be inclusive**: Welcome newcomers and help them get started

For the full Code of Conduct, please see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js
- **Git**: For version control

### Fork & Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sourcedocs.git
   cd sourcedocs
   ```

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

<details>
<summary>Environment Setup (Click to expand)</summary>

You may need to set up environment variables for full functionality. Check if there's a `.env.example` file in the repository and copy it to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required values based on the services you're working with.

</details>

## Development Workflow

### Branch Naming

Create descriptive branch names using these prefixes:

- `feature/add-user-dashboard` — New features
- `fix/authentication-bug` — Bug fixes
- `docs/update-contributing` — Documentation updates
- `refactor/cleanup-api` — Code refactoring
- `chore/update-dependencies` — Maintenance tasks

### Code Quality

Before committing your changes:

1. **Run the linter**:
   ```bash
   npm run lint
   ```

2. **Fix linting issues**:
   ```bash
   npm run lint:fix
   ```

### Commit Messages

Write clear commit messages that describe what your changes do:

```
feat: add user authentication endpoint
fix: resolve login redirect issue
docs: update API documentation
refactor: simplify database queries
```

## Pull Request Process

### Before Submitting

Make sure your PR is ready:

- [ ] I have read these contributing guidelines
- [ ] My code follows the project's style guidelines
- [ ] I have tested my changes locally
- [ ] All linting checks pass (`npm run lint`)
- [ ] I have updated documentation as needed
- [ ] My branch is up to date with the main branch

### PR Description Template

When creating your pull request, please include:

```markdown
## What does this PR do?
Brief description of the changes

## How to test
Steps to test the changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks**: ESLint and other checks will run automatically
2. **Code review**: A maintainer will review your code
3. **Feedback**: Address any feedback or requested changes
4. **Merge**: Once approved, your PR will be merged!

## Issue Guidelines

### Bug Reports

When reporting bugs, please include:

- **Description**: What happened vs what you expected
- **Steps to reproduce**: Detailed steps to recreate the issue
- **Environment**: Browser, Node.js version, OS
- **Screenshots**: If applicable

### Feature Requests

For new features:

- **Use case**: Describe why this feature would be valuable
- **Proposed solution**: Your ideas for implementation
- **Alternatives**: Other solutions you've considered

### Good First Issues

Look for issues labeled `good first issue` or `beginner friendly`. These are perfect for new contributors and maintainers are happy to provide extra guidance!

## Style Guide

### Code Style

- **TypeScript**: Use proper typing throughout
- **Naming**: Use descriptive variable and function names
- **Comments**: Add comments for complex logic
- **ESLint**: Follow the rules defined in `eslint.config.mjs`

### File Organization

- **API routes**: Place in `app/api/` following Next.js conventions
- **Components**: Reusable components go in `components/`
- **Utilities**: Helper functions in `lib/`

### API Endpoints

Follow REST conventions:
- `GET` for retrieving data
- `POST` for creating resources
- `PUT`/`PATCH` for updates
- `DELETE` for removing resources

<details>
<summary>TypeScript Guidelines (Click to expand)</summary>

- Always define types for function parameters and return values
- Use interfaces for object shapes
- Prefer `const assertions` where appropriate
- Use proper error handling with try/catch blocks

```typescript
interface UserData {
  id: string;
  email: string;
  name?: string;
}

async function createUser(userData: UserData): Promise<User> {
  // Implementation
}
```

</details>

## Recognition

### All Contributors Welcome

We believe that all contributions matter, whether you:
- Fix a typo in documentation
- Report a bug
- Add a major feature
- Improve performance
- Help other contributors

### How We Recognize Contributors

- **GitHub**: Your contributions will be visible in the repository's commit history
- **Changelog**: Significant contributions are mentioned in our [CHANGELOG.md](CHANGELOG.md)
- **Community**: We celebrate contributions in our community discussions

---

## Questions?

If you have questions about contributing, feel free to:

- Open an issue with the `question` label
- Start a discussion in the repository's Discussions tab
- Reach out to the maintainers

Thank you for contributing to sourcedocs! 🚀
