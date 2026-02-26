# Contributing to KubeAtlas

First off, thank you for considering contributing to KubeAtlas! It's people like you that make KubeAtlas such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@kubeatlas.io](mailto:conduct@kubeatlas.io).

## Getting Started

### Prerequisites

- Go 1.21+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Make

### Development Setup

1. **Fork the repository**

   Click the "Fork" button at the top right of this page.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/kubeatlas.git
   cd kubeatlas
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/kubeatlas/kubeatlas.git
   ```

4. **Start development environment**

   ```bash
   # Start PostgreSQL
   docker-compose -f docker-compose.dev.yml up -d postgres

   # Backend
   cd backend
   cp ../.env.example .env
   go mod download
   go run ./cmd/api

   # Frontend (new terminal)
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**

   - Frontend: http://localhost:3000
   - API: http://localhost:8080
   - API Docs: http://localhost:8080/swagger/index.html

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates.

When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, browser, versions)

Use the bug report template when creating an issue.

### Suggesting Features

Feature requests are welcome! Please:

- Check existing issues/discussions first
- Provide a clear use case
- Explain why this feature would be useful
- Consider if it fits the project scope

### Code Contributions

1. **Find an issue** to work on, or create one
2. **Comment on the issue** to let others know you're working on it
3. **Create a branch** from `main`
4. **Make your changes**
5. **Write/update tests**
6. **Submit a pull request**

#### Good First Issues

Look for issues labeled `good first issue` - these are great for newcomers!

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**

   - Write clean, readable code
   - Add comments where necessary
   - Update documentation if needed

3. **Run tests**

   ```bash
   # Backend
   cd backend
   make test

   # Frontend
   cd frontend
   npm run test
   npm run lint
   ```

4. **Commit your changes**

   Follow [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git commit -m "feat: add cluster sync status indicator"
   git commit -m "fix: resolve namespace filter not working"
   git commit -m "docs: update installation guide"
   ```

   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

5. **Push and create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

   Then create a Pull Request on GitHub.

6. **PR Requirements**

   - Clear description of changes
   - Link to related issue(s)
   - All tests passing
   - No merge conflicts
   - Code review approval

## Style Guidelines

### Go (Backend)

- Follow [Effective Go](https://golang.org/doc/effective_go)
- Use `gofmt` for formatting
- Run `golangci-lint` before committing
- Write table-driven tests

```go
// Good
func (s *ClusterService) Sync(ctx context.Context, id uuid.UUID) error {
    cluster, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return fmt.Errorf("get cluster: %w", err)
    }
    // ...
}

// Avoid
func (s *ClusterService) Sync(ctx context.Context, id uuid.UUID) error {
    cluster, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return err // No context
    }
}
```

### TypeScript (Frontend)

- Use TypeScript strict mode
- Follow React best practices
- Use functional components with hooks
- Run `eslint` and `prettier` before committing

```tsx
// Good
interface ClusterCardProps {
  cluster: Cluster;
  onSync: (id: string) => void;
}

export function ClusterCard({ cluster, onSync }: ClusterCardProps) {
  // ...
}

// Avoid
export function ClusterCard(props: any) {
  // ...
}
```

### Commit Messages

```
<type>(<scope>): <subject>

<body>

<footer>
```

Examples:
```
feat(clusters): add sync status indicator

- Show real-time sync status on cluster card
- Add loading spinner during sync
- Display last sync time

Closes #123
```

### Documentation

- Use clear, concise language
- Include code examples
- Keep README up to date
- Document breaking changes

## Project Structure

```
kubeatlas/
├── backend/           # Go API
│   ├── cmd/          # Entry points
│   ├── internal/     # Private packages
│   └── pkg/          # Public packages
├── frontend/         # React UI
│   ├── src/
│   │   ├── api/      # API client
│   │   ├── components/
│   │   ├── pages/
│   │   └── store/
├── database/         # SQL schemas
├── deploy/           # Deployment configs
├── docs/             # Documentation
└── helm/             # Helm charts
```

## Community

- **Discussions**: [GitHub Discussions](https://github.com/kubeatlas/kubeatlas/discussions)
- **Issues**: [GitHub Issues](https://github.com/kubeatlas/kubeatlas/issues)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉
