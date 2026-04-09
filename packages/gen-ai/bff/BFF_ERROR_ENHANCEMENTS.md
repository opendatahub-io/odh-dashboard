# BFF Error Response Enhancements (Optional)

## Current State

The BFF already has a comprehensive error system:

- **EnhancedLlamaStackError** with categorization and user-friendly messages
- **ResponseErrorCategory** constants matching frontend error categories
- Error responses in mod-arch format: `{ error: { code, message } }`

## Recommended Enhancements

To fully align with the Playground Error States design spec, consider adding these fields to error responses:

### 1. Add `component` field

Indicates which component generated the error:

```go
type ErrorComponent string

const (
    ComponentModel      ErrorComponent = "model"
    ComponentLlamaStack ErrorComponent = "llama_stack"
    ComponentBFF        ErrorComponent = "bff"
    ComponentRAG        ErrorComponent = "rag"
    ComponentGuardrails ErrorComponent = "guardrails"
    ComponentMCP        ErrorComponent = "mcp"
    ComponentConfig     ErrorComponent = "config"
    ComponentNetwork    ErrorComponent = "network"
)
```

### 2. Add `retriable` field

Boolean flag indicating if the error can be retried:

```go
func isRetriableError(category ResponseErrorCategory) bool {
    switch category {
    case CategoryModelTimeout, CategoryModelOverloaded:
        return true
    case CategoryInvalidModelConfig, CategoryUnsupportedFeature, CategoryInvalidParameter:
        return false
    default:
        return false
    }
}
```

### 3. Add `tool_name` field (for MCP errors)

For MCP errors, include the tool name that failed:

```json
{
  "error": {
    "code": "mcp_auth",
    "message": "MCP server authentication failed",
    "component": "mcp",
    "tool_name": "GitHub",
    "retriable": false
  }
}
```

### 4. Updated Error Response Structure

```go
type ErrorResponse struct {
    Code      string          `json:"code"`
    Message   string          `json:"message"`
    Component *ErrorComponent `json:"component,omitempty"`
    ToolName  *string         `json:"tool_name,omitempty"`
    Retriable *bool           `json:"retriable,omitempty"`
}
```

## Frontend Compatibility

The frontend error classifier (`errorClassifier.ts`) is designed to work with both:

1. **Current format**: `{ error: { code, message } }` - works today
2. **Enhanced format**: `{ error: { code, message, component, retriable, tool_name } }` - will use additional fields when available

The classifier falls back gracefully when optional fields are missing, so these enhancements can be added incrementally without breaking existing functionality.

## Implementation Priority

**Priority: Low**

The current error system is sufficient for the Playground Error States feature to work. These enhancements would:

- Reduce client-side guesswork (component inference from code)
- Improve retry accuracy (explicit retriable flag vs. code-based heuristics)
- Better MCP error context (explicit tool names)

But the frontend can infer these from the existing `code` and `message` fields.
