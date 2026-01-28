# RHOAI Assistant

AI-powered assistant for Red Hat OpenShift AI. A floating chatbot widget that helps users navigate the platform, answer questions, and perform actions.

## Features

- **Contextual Help**: Knows which page you're on and suggests relevant actions
- **Quick Actions**: Pre-configured prompts for common tasks
- **Tool Calling**: (Coming) Execute actions like creating projects, deploying models

## Structure

```
packages/rhoai-assistant/
├── bff/                    # Go backend (connects to LLM + MCP)
│   ├── cmd/main.go         # Entry point
│   └── internal/api/       # HTTP handlers
└── package.json            # Workspace config
```

The frontend widget lives in: `frontend/src/components/RHOAIAssistantWidget/`

## Development

### Frontend Widget
The widget is imported directly in `frontend/src/app/App.tsx` and appears on all pages.

### BFF (Backend)
```bash
cd packages/rhoai-assistant/bff
go build -o bin/bff ./cmd
./bin/bff
```
