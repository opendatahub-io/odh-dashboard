# AutoX Shared Library Package

**Package**: `@odh-dashboard/autox`  
**Description**: Shared library providing common BFF and Frontend utilities for AutoML, AutoRAG, and related packages.  
**Status**: 🚧 Under Active Development

---

## Overview

AutoX is a shared library package that extracts and consolidates duplicate code from AutoML and AutoRAG packages. It provides:

- **Frontend**: React hooks, UI components, utilities, and TypeScript types
- **BFF (Backend For Frontend)**: Go packages for Kubernetes, S3, Pipeline Server integrations, and common models

**Key Principle**: AutoX exports low-level primitives. Consumer packages (AutoML, AutoRAG) compose them into domain-specific features.

---

## Package Structure

```text
packages/autox-core/
├── frontend/                # Frontend shared library
│   └── src/
│       ├── hooks/           # React hooks (usePipelineRuns, useNotification, useS3ListFiles)
│       ├── components/      # UI primitives (FileExplorer, PipelineRunsTable)
│       ├── utils/           # Utilities (validation, formatting, helpers)
│       └── types/           # TypeScript types (PipelineRun, S3Object, RuntimeStateKF)
│
└── bff/                     # BFF shared library
    └── kubernetes/
    ├── pipelines/
    └── s3/
```

---

## Usage

### Frontend Import Patterns

```typescript
// Import hooks
import { usePipelineRuns, useNotification, useS3ListFiles } from '@odh-dashboard/autox/hooks';

// Import components
import { FileExplorer, PipelineRunsTable } from '@odh-dashboard/autox/components';

// Import types
import type { PipelineRun, S3Object, RuntimeStateKF } from '@odh-dashboard/autox/types';

// Import utilities
import { isPipelineRunning, isValidK8sName } from '@odh-dashboard/autox/utils';
```

### BFF Import Patterns

```go
// Import models
import "github.com/opendatahub-io/odh-dashboard/packages/autox/bff/internal/models"

// Import integrations
import k8s "github.com/opendatahub-io/odh-dashboard/packages/autox/bff/internal/integrations/kubernetes"
import s3 "github.com/opendatahub-io/odh-dashboard/packages/autox/bff/internal/integrations/s3"
import ps "github.com/opendatahub-io/odh-dashboard/packages/autox/bff/internal/integrations/pipelineserver"

// Import repositories
import "github.com/opendatahub-io/odh-dashboard/packages/autox/bff/internal/repositories"

// Import API utilities
import "github.com/opendatahub-io/odh-dashboard/packages/autox/bff/internal/api"
```

---

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Go >= 1.24.3

### Installation

```bash
# From repository root
npm install

# Set up Go workspaces
go work init
go work use packages/autox/bff
go work use packages/automl/bff
go work use packages/autorag/bff
go work sync
```

### Verify Setup

**Frontend**:

```bash
cd packages/autox/frontend
npm run type-check  # Should succeed with no errors
```

**BFF**:

```bash
cd packages/autox/bff
go build ./...  # Should succeed with no errors
```

---

## Testing

### Frontend

```bash
cd packages/autox/frontend
npm run test        # Run all tests (lint + type-check + unit)
npm run test:unit   # Run unit tests only
npm run lint        # Run linting
npm run lint:fix    # Fix linting errors
```

### BFF

```bash
cd packages/autox/bff
go test ./...       # Run all tests
go test -v ./...    # Run with verbose output
```

---

## Consumer Integration

AutoX is designed to be consumed by AutoML, AutoRAG, and similar packages. See the [quickstart guide](../../specs/002-autox-shared-library/quickstart.md) for detailed integration instructions.

### Module Federation Setup

Add AutoX as a shared singleton in your package's webpack config:

```javascript
// packages/{your-package}/frontend/config/moduleFederation.js
module.exports = {
  name: 'yourPackage',
  shared: {
    '@odh-dashboard/autox': {
      singleton: true,
      requiredVersion: dependencies['@odh-dashboard/autox'],
    },
  },
};
```

---

## Documentation

- **[Quickstart Guide](../../specs/002-autox-shared-library/quickstart.md)** - Developer setup and usage guide
- **[Data Model](../../specs/002-autox-shared-library/data-model.md)** - Key entities and relationships
- **[BFF API Contracts](../../specs/002-autox-shared-library/contracts/bff-api.md)** - BFF exported interfaces
- **[UI API Contracts](../../specs/002-autox-shared-library/contracts/ui-api.md)** - UI exported hooks and components
- **[Research Findings](../../specs/002-autox-shared-library/research.md)** - Code duplication analysis

---

## Contributing

### Adding New Utilities

1. **Frontend**: Add to `frontend/src/hooks/`, `frontend/src/components/`, or `frontend/src/utils/`
2. **BFF**: Add to `bff/internal/models/`, `bff/internal/integrations/`, or `bff/internal/repositories/`
3. **Tests**: Add unit tests adjacent to implementation (`__tests__/` directory)
4. **Documentation**: Update contracts documentation

### Extraction Guidelines

- Extract **perfect duplicates** first (100% identical code)
- Extract **high-value refactoring** next (95-99% similar)
- Use **base + extension pattern** for domain-specific differences
- Maintain backward compatibility for consumer packages

---

## Version

**Current Version**: 0.0.0 (Pre-release)

AutoX follows semantic versioning. Major version increments indicate breaking changes for consumer packages.

---

## License

Apache-2.0

---

## Maintainers

ODH Dashboard Purple Team

For questions or issues, open an issue with the `autox` label on GitHub.
