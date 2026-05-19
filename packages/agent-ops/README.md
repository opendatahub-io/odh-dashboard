# Agent Ops

Agent Ops BFF module for the ODH Dashboard. Provides the backend-for-frontend and React frontend for managing agentic AI operations.

## Development

```bash
# Run with mocked backend
make dev-start-mock

# Run in federated mode (with host dashboard)
make dev-start-federated
```

## Ports

- Frontend (standalone): 9000 (default webpack dev server)
- Frontend (federated): 9111
- BFF (standalone): 4000
- BFF (federated): 4021
