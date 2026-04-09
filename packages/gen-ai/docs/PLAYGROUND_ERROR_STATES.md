# Playground Error States - UI Implementation (RHOAIUX-2108)

## Overview

This document describes the UI implementation for Playground Error States, built on top of the existing error categorization system (RHOAIENG-49767).

## Relationship to Existing Error Handling

### What Was Already Implemented (RHOAIENG-49767)

The backend error categorization system provided:
- ✅ 14 error categories with pattern matching
- ✅ User-friendly error messages
- ✅ Enhanced error responses from BFF
- ✅ Comprehensive backend testing

### What This Implementation Adds (RHOAIUX-2108)

The **Playground Error States UI layer** adds:
- ✅ Visual error pattern classification (full failure, partial failure, streaming interruption)
- ✅ Expandable inline alert component with PatternFly
- ✅ Retry functionality for transient errors
- ✅ Progressive disclosure (summary → description → raw error)
- ✅ Template variable interpolation
- ✅ Pattern-based rendering in chat transcript

## Three Error Patterns

### 1. Full Failure (Danger Alert Replaces Message)

**When:** No model response generated, request failed before any output.

**Rendering:** Danger alert replaces the entire bot message content.

**Examples:**
- Model timeout
- Invalid configuration (max_tokens, chat_template)
- Model not found
- Rate limiting

**UI Behavior:**
- Red danger alert with error icon
- Expandable to show description and raw error
- Retry link shown if error is retriable

### 2. Partial Failure (Warning Alert Above Response)

**When:** Model generated a response, but a supporting component failed.

**Rendering:** Warning alert appears **above** the model response within the same message bubble.

**Examples:**
- RAG retrieval failed but model responded without context
- Guardrail check failed to run (service down)
- MCP tool call failed but model continued

**UI Behavior:**
- Yellow warning alert with warning icon
- Collapsed by default
- Model response remains fully visible below the alert
- No retry (response was already generated)

**Design Decision:** In playground context, we never block the model response on partial failure. Users should always see what the model returned for testing/experimentation.

### 3. Streaming Interruption (Danger Alert Below Partial Response)

**When:** Streaming started and produced some content, but connection/generation was interrupted.

**Rendering:** Partial response text with "..." appended, danger alert appears **below** the partial text.

**Examples:**
- Connection lost mid-stream
- Streaming timeout (no tokens for 30s)
- Context length exceeded during generation

**UI Behavior:**
- Partial content preserved with ellipsis
- Red danger alert below partial text
- Retry link shown (may succeed on second attempt)

## Error Classification Logic

### Classification Decision Tree

```
Was a model response generated?
├── No → Was the stream started?
│   ├── No → FULL FAILURE (danger alert replaces message)
│   └── Yes → STREAMING INTERRUPTION (partial text + "..." + danger alert below)
└── Yes → Did a supporting component fail?
    ├── Yes → PARTIAL FAILURE (warning alert above response)
    └── No → Normal response (no error)
```

### Retriable Errors

An error is retriable when:
1. API explicitly marks it as `retriable: true`, OR
2. Error code is a known transient code (timeout, server_error, stream_lost, etc.), OR
3. HTTP status is 429, 500, 502, 503, or 504

**Non-retriable errors:**
- Configuration errors (max_tokens, chat_template, no_tools, no_images)
- Capability mismatches (model doesn't support feature)

## UI Components

### ChatbotErrorAlert Component

PatternFly expandable inline alert with three layers:

**Layer 1 (Always Visible):**
- Severity icon (danger = red, warning = yellow)
- Title (plain-language summary)
- Retry link (if retriable)
- Expand/collapse toggle

**Layer 2 (Expanded):**
- Description (1-2 sentences explaining impact and guidance)

**Layer 3 (Expanded):**
- Code block with `[ERROR_CODE] message`
- Copy button for debugging

**Spacing:**
- Right padding matches left indentation
- `--pf-t--global--spacer--md` between description and code block

### Template Variable Interpolation

Titles and descriptions support variable interpolation:

**Variables:**
- `{modelName}` - Display name of selected model (e.g., "Llama 3.1 8B-Instruct")
- `{maxTokens}` - Model's maximum supported token count
- `{toolName}` - MCP tool/server name (for MCP errors)

**Example:**
```typescript
title: "Token limit exceeds model capacity"
description: "{modelName} supports a maximum of {maxTokens} tokens. Reduce the token limit in the Build panel."
templateVars: { modelName: "Llama 3.1 8B", maxTokens: 4096 }
// Renders: "Llama 3.1 8B supports a maximum of 4096 tokens. Reduce the token limit in the Build panel."
```

## Implementation Files

### New Files

**Utilities:**
- `packages/gen-ai/frontend/src/app/utilities/errorClassifier.ts`
  - `classifyError()` - Maps raw errors to ErrorClassification
  - Pattern determination logic
  - Retriability checks
  - Title and description generation
  - Template variable handling

**Components:**
- `packages/gen-ai/frontend/src/app/Chatbot/components/ChatbotErrorAlert.tsx`
  - Expandable inline alert with PatternFly
  - Template interpolation
  - Code block with copy button
  - Retry action link

**Tests:**
- `packages/gen-ai/frontend/src/app/utilities/__tests__/errorClassifier.spec.ts`
  - 100+ test cases covering all patterns, retriability, titles, descriptions
- `packages/gen-ai/frontend/src/app/Chatbot/components/__tests__/ChatbotErrorAlert.spec.tsx`
  - Component rendering, retry, template interpolation, clipboard functionality

### Modified Files

**Types:**
- `packages/gen-ai/frontend/src/app/types.ts`
  - Added: `ErrorPattern`, `ErrorSeverity`, `ErrorComponent`, `APIErrorDetails`, `ErrorClassification`

**Constants:**
- `packages/gen-ai/frontend/src/app/Chatbot/const.ts`
  - Added: `RETRIABLE_HTTP_STATUSES`, `RETRIABLE_ERROR_CODES`, `NON_RETRIABLE_ERROR_CODES`

**Hooks:**
- `packages/gen-ai/frontend/src/app/Chatbot/hooks/useChatbotMessages.ts`
  - Integrated `classifyError()` in catch block
  - Added error classification to message props
  - Retry handler implementation
  - Pattern-based error rendering logic
  - Extended `ChatbotMessageProps` with `errorClassification` and `onRetryError`

**UI:**
- `packages/gen-ai/frontend/src/app/Chatbot/ChatbotMessagesList.tsx`
  - Renders error alerts based on pattern:
    - Full failure → `error` prop on Message component
    - Partial failure → `extraContent.beforeMainContent`
    - Streaming interruption → `extraContent.afterMainContent`

**Utilities:**
- `packages/gen-ai/frontend/src/app/utilities/index.ts`
  - Exported `classifyError`

## Error Mapping Examples

### Backend Error → Frontend Classification

**Example 1: Model Timeout (Full Failure)**
```json
// Backend response
{
  "error": {
    "code": "timeout",
    "message": "LlamaStack error on operation CreateResponse: Request timed out"
  }
}

// Frontend classification
{
  "pattern": "full_failure",
  "severity": "danger",
  "retriable": true,
  "title": "Model inference failed",
  "description": "The model server didn't respond in time. This may be a temporary issue.",
  "rawError": {
    "code": "timeout",
    "message": "LlamaStack error on operation CreateResponse: Request timed out"
  }
}
```

**Example 2: RAG Failure (Partial Failure)**
```json
// Backend response (hypothetical - partial failures need backend support)
{
  "error": {
    "code": "rag_down",
    "component": "rag",
    "message": "Vector store unreachable"
  },
  "response": {
    "content": "Based on general knowledge..." // Model responded
  }
}

// Frontend classification
{
  "pattern": "partial_failure",
  "severity": "warning",
  "retriable": false,
  "title": "Knowledge source retrieval failed",
  "description": "Generated without context from your knowledge sources.",
  "rawError": {
    "code": "rag_down",
    "message": "Vector store unreachable"
  }
}
```

**Example 3: Streaming Interruption**
```typescript
// During streaming, connection lost after partial content
wasStreamStarted: true
wasResponseGenerated: false
partialContent: "The capital of France is Par..." // Stream cut off

// Frontend classification
{
  "pattern": "streaming_interruption",
  "severity": "danger",
  "retriable": true,
  "title": "Streaming error — connection lost",
  "description": "The connection to the model was lost during generation.",
  "rawError": {
    "code": "stream_lost",
    "message": "Connection reset"
  }
}
```

## Testing

### Unit Tests

**Error Classifier (`errorClassifier.spec.ts`):**
- ✅ Pattern determination (full/partial/streaming)
- ✅ Retriability logic (explicit flag, codes, HTTP statuses)
- ✅ Title generation for all error types
- ✅ Description generation with template vars
- ✅ Template variable interpolation
- ✅ Raw error extraction
- ✅ Edge cases (null, undefined, empty)
- ✅ Component-based classification

**ChatbotErrorAlert (`ChatbotErrorAlert.spec.tsx`):**
- ✅ Rendering with different severities
- ✅ Retry link visibility and behavior
- ✅ Template variable interpolation
- ✅ Expandable behavior
- ✅ Code block clipboard functionality
- ✅ Accessibility (ARIA labels, IDs)
- ✅ Different error patterns

**Total Test Coverage:** 100+ test cases

### Integration Testing (Manual)

**Test Scenarios:**

1. **Full Failure - Timeout**
   - Send a request with a complex prompt
   - Verify danger alert replaces message
   - Verify retry link appears
   - Click retry, verify request resends

2. **Full Failure - Invalid Config**
   - Set max_tokens to exceed model limit
   - Verify danger alert shows correct title/description
   - Verify no retry link (non-retriable)

3. **Streaming Interruption**
   - Start streaming response
   - Kill network mid-stream
   - Verify partial content preserved with "..."
   - Verify danger alert appears below partial text
   - Verify retry link shown

4. **Compare Mode**
   - Trigger different errors in each panel
   - Verify errors are independent per panel

## Out of Scope

The following are mentioned in the design spec but are **not implemented** in this PR:

### 1. Proactive Capability Warnings

**Design Spec:** When user selects a model that doesn't support a feature (tools, images, etc.), show warning proactively in Build panel or as banner.

**Status:** Not implemented. Reactive errors (no_tools, no_images) are included as fallback.

**Why:** This is a configuration-state problem, not a response-error problem. Requires model capability metadata and proactive validation.

**Follow-up:** Implement as separate feature for model selection flow.

### 2. Partial Failure Detection

**Design Spec:** Detect when model responded but a supporting component (RAG, guardrails, MCP) failed.

**Status:** Pattern classification supports this, but backend doesn't currently send partial failure indicators.

**Current Behavior:** All errors during response generation are treated as full failures. 

**Why:** Backend would need to:
- Continue response generation even when RAG/guardrails/MCP fails
- Include both error details AND response content in same response
- Add `wasResponseGenerated` flag or similar indicator

**Follow-up:** Backend enhancement to support graceful degradation for RAG/MCP/guardrails failures.

### 3. Model Capability Proactive Checks

**Design Spec:** Check model capabilities before sending request and warn if mismatch.

**Status:** Not implemented.

**Why:** Requires:
- Model capability metadata (supports_tools, supports_images, max_tokens, etc.)
- Frontend validation before request
- UI components for warnings/banners

**Follow-up:** Part of broader model metadata and validation feature.

## Frontend-Backend Contract

### Current Contract (Sufficient)

The error classifier works with the current backend error format:

```json
{
  "error": {
    "code": "string",        // Error code (e.g., "timeout", "rag_down")
    "message": "string"      // Error message
  }
}
```

### Recommended Enhancements (Optional)

See `BFF_ERROR_ENHANCEMENTS.md` for optional backend improvements:

1. **`component` field** - Explicit component indicator (rag, guardrails, mcp, model, etc.)
2. **`retriable` field** - Explicit retriability flag
3. **`tool_name` field** - For MCP errors, the tool that failed

**Benefit:** Reduces client-side inference, improves accuracy.

**Priority:** Low (frontend can infer from code/message)

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Inline errors in chat transcript, not toasts | Errors are direct responses to prompts, belong in conversational context |
| Never block model response on partial failure | Playground is for testing — users should always see what the model returned |
| Selective retry (transient errors only) | Offering retry on config errors is misleading — same request will fail the same way |
| Expandable alerts, collapsed by default | Keeps chat clean; users who need details can expand |
| Code block for raw error | Fewer steps to debugging artifact; error code included inline |
| No fade/opacity on streaming interruptions | Ellipsis ("...") is cleaner signal of incompleteness |
| Independent error handling per Compare Mode panel | Each panel tests its own model — errors are panel-scoped |
| Single classifier utility for all error types | Engineering adds new error types in one place, not scattered across UI code |

## Next Steps

### This PR (RHOAIENG-49767 + RHOAIUX-2108)

- ✅ Backend error categorization (existing)
- ✅ Frontend error classification utility
- ✅ ChatbotErrorAlert component
- ✅ Integration with useChatbotMessages
- ✅ Integration with ChatbotMessagesList
- ✅ Comprehensive unit tests
- ✅ Documentation

### Future Enhancements

**High Priority:**
1. Backend support for partial failures (RAG/MCP/guardrails graceful degradation)
2. Model capability metadata and proactive warnings
3. Error metrics and monitoring

**Medium Priority:**
4. Automatic retry with exponential backoff
5. Error context (request IDs, timestamps)
6. Network error categorization

**Low Priority:**
7. Streaming partial response preservation with checkpoints
8. Model-specific error documentation
9. Internationalization

See `responses-api-error-handling-gaps.md` for full list.

## Summary

This implementation provides a complete UI layer for Playground Error States:

- **3 error patterns** (full failure, partial failure, streaming interruption)
- **Expandable inline alerts** with PatternFly
- **Retry functionality** for transient errors
- **Progressive disclosure** (title → description → raw error)
- **Template variable interpolation** for contextual messages
- **100+ unit tests** covering all scenarios
- **Graceful degradation** when backend enhancements aren't available

The system is designed to work with the current backend error format while being ready to leverage enhanced fields when they become available.
