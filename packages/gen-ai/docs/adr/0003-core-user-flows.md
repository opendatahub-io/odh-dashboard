# 0003 - Core User Flows

* Date: 2025-07-25
* Updated: 2025-12-16
* Authors: Matias Schimuneck

## Context and Problem Statement

The Gen AI implements two core user workflows that define the primary user experience: document upload for RAG (Retrieval Augmented Generation) setup and chat completion for user interactions. This document defines how these flows work through the BFF architecture pattern, showing the interactions between frontend, BFF, and Llama Stack services.

The two primary user flows are:
- **File Upload Flow**: User uploads documents, system creates vector database and processes documents for RAG
- **Chat Completion Flow**: User sends queries, system optionally performs RAG retrieval and generates responses

## Decision Drivers

* Clear documentation of the two primary user workflows
* Understanding of document processing and RAG setup
* Chat interaction patterns with and without RAG context
* API contracts between frontend, BFF, and Llama Stack
* Error handling and user feedback mechanisms
* Developer onboarding and debugging support

## Decision Outcome

Document the file upload and chat completion flows using sequence diagrams that show:
- Document upload, vector database creation, and embedding generation
- Chat completion with optional RAG retrieval and context integration
- BFF API endpoints and their interactions with Llama Stack services
- Error handling and user feedback patterns

## Core User Flows

### Flow 1: File Upload and RAG Setup

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Frontend
    participant BFF as BFF API
    participant LS as Llama Stack

    Note over User,LS: Document Upload for RAG Setup
    
    Note over UI,BFF: Page initialization - Load models for chat functionality
    UI->>BFF: GET /gen-ai/api/v1/models
    BFF->>LS: GET /v1/openai/v1/models
    LS-->>BFF: Model list response
    BFF-->>UI: Available models (LLM & embedding)
    
    UI->>UI: Cache models for user selection
    UI-->>User: Page ready with chat functionality
    
    User->>UI: Click "Upload Documents"
    
    Note over UI,BFF: Load vector stores when upload is initiated
    UI->>BFF: GET /gen-ai/api/v1/vectorstores
    BFF->>LS: GET /v1/openai/v1/vector_stores
    LS-->>BFF: Vector store list
    BFF-->>UI: Vector store options
    
    UI->>UI: Show file selection dialog with vector store options
    User->>UI: Select files (PDF, TXT, etc.)
    
    UI-->>User: Show vector store selection or creation dialog
    User->>UI: Select existing vector store OR create new one
    User->>UI: Select files and upload options
    User->>UI: Click "Upload"
    
    alt Create new vector store
        Note over UI,BFF: Create vector store first
        UI->>BFF: POST /gen-ai/api/v1/vectorstores<br/>{name, metadata}
        BFF->>LS: POST /v1/openai/v1/vector_stores
        LS-->>BFF: Vector store created {id, name, status}
        BFF-->>UI: Vector store ready
    end
    
    Note over UI,BFF: Upload file to vector store
    UI->>BFF: POST /gen-ai/api/v1/files/upload<br/>{file, vector_store_id, chunking_type}
    
    Note over BFF: Process multipart upload
    BFF->>BFF: Parse multipart form and validate parameters
    BFF->>LS: POST /v1/openai/v1/files + POST /v1/openai/v1/vector_stores/{id}/files
    Note over LS: Process file:<br/>- Upload to storage<br/>- Extract text<br/>- Create chunks<br/>- Generate embeddings<br/>- Add to vector store
    LS-->>BFF: File processed and added to vector store
    BFF-->>UI: Upload complete {file_id, vector_store_file}
    
    UI->>UI: Hide loading spinner
    UI->>UI: Show success notification
    UI-->>User: "Ready for RAG queries!"
```

### Flow 2: Chat Completion with Optional RAG

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Frontend
    participant BFF as BFF API
    participant LS as Llama Stack

    Note over User,LS: Chat Interaction with Optional RAG
    
    User->>UI: Select model from available models (cached from page load)
    UI->>UI: Set selected model for conversation
    User->>UI: Toggle "Sources" flag (enable/disable RAG)
    UI->>UI: Set RAG mode based on sources flag
    User->>UI: Type message and send
    UI->>UI: Show typing indicator
    
    alt Sources flag enabled (RAG mode)
        Note over UI,BFF: Send chat message with RAG
        UI->>BFF: POST /gen-ai/api/v1/responses<br/>{input, model, vector_store_ids[], chat_context[], temperature, instructions}
    else Sources flag disabled (Direct chat)
        Note over UI,BFF: Send chat message without RAG
        UI->>BFF: POST /gen-ai/api/v1/responses<br/>{input, model, chat_context[], temperature, instructions}
    end
    
    BFF->>BFF: Parse request and validate required parameters
    BFF->>BFF: Convert chat_context to OpenAI format
    
    Note over BFF,LS: Generate AI Response with Integrated RAG
    BFF->>LS: POST /v1/openai/v1/responses
    Note over LS: Unified Response Generation:<br/>- If vector_store_ids provided: perform file search<br/>- Build conversation context<br/>- Generate response with retrieved context<br/>- Return complete response
    LS-->>BFF: Complete response with content
    
    Note over BFF: Extract essential response data
    BFF->>BFF: Simplify response:<br/>- Extract content from output array<br/>- Calculate usage tokens<br/>- Build simplified structure
    
    BFF-->>UI: {id, model, status, created_at, content, usage}
    
    UI->>UI: Hide typing indicator
    UI->>UI: Display assistant response
    
    Note over UI: Update conversation context
    UI->>UI: Add user input to chat_context array
    UI->>UI: Add assistant response to chat_context array
    UI->>UI: Store updated chat_context for next interaction
    
    alt RAG was used
        UI->>UI: Show "Sources" section with document chunks
    end
    UI-->>User: Complete response with sources (if RAG)
    
    Note over User,UI: Conversation continues (loop back for next message)
    User->>UI: Type message and send
```

## Flow Characteristics

### File Upload Flow
- **Simplified Process**: Vector store creation → File upload with chunking → Ready for RAG
- **OpenAI SDK Integration**: Uses official SDK for all Llama Stack communication
- **Vector Store Management**: Create new stores or use existing ones via dedicated endpoints
- **File Processing**: Upload files directly to vector stores with automatic chunking
- **User Experience**: Streamlined flow with clear progress indicators
- **Validation**: Comprehensive parameter validation and error handling
- **Chunking Control**: Support for auto and static chunking strategies

### Chat Completion Flow  
- **Unified Response API**: Single endpoint handles both simple chat and RAG queries
- **Integrated RAG**: Vector store IDs automatically enable file search functionality
- **Conversation Context**: Multi-turn conversations via chat_context parameter
- **Generation Control**: Temperature, top_p, and instructions for response customization
- **Simplified Responses**: Clean response structure with only essential fields
- **Error Handling**: Proper error forwarding from Llama Stack
- **Performance Optimized**: Reduced response payload size by 90%

## API Contracts

### File Upload Flow Endpoints
- **Frontend → BFF**: `GET /gen-ai/api/v1/models` - Get available models (all types)
- **Frontend → BFF**: `GET /gen-ai/api/v1/vectorstores` - Get existing vector stores with pagination
- **Frontend → BFF**: `POST /gen-ai/api/v1/vectorstores` - Create new vector store
  ```json
  {
    "name": "My Documents",
    "metadata": {
      "department": "support",
      "category": "faq"
    }
  }
  ```
- **Frontend → BFF**: `POST /gen-ai/api/v1/files/upload` - Upload file to vector store
  ```json
  // Multipart form data:
  {
    "file": "<binary file data>",
    "vector_store_id": "vs_abc123-def456",
    "purpose": "assistants",
    "chunking_type": "static",
    "max_chunk_size_tokens": 600,
    "chunk_overlap_tokens": 200
  }
  ```

### Chat Completion Flow Endpoints
- **Frontend → BFF**: `POST /gen-ai/api/v1/responses` - Generate AI response with optional RAG
  ```json
  {
    "input": "What is the main topic of the documents?",
    "model": "ollama/llama3.2:3b",
    "vector_store_ids": ["vs_abc123-def456"],
    "chat_context": [
      {
        "role": "user",
        "content": "Previous question"
      },
      {
        "role": "assistant",
        "content": "Previous response"
      }
    ],
    "temperature": 0.7,
    "top_p": 0.9,
    "instructions": "You are a helpful assistant"
  }
  ```

### BFF → Llama Stack Internal Calls (via OpenAI SDK)
- `GET /v1/openai/v1/models` - Model discovery using OpenAI-compatible endpoint
- `POST /v1/openai/v1/vector_stores` - Vector store creation
- `POST /v1/openai/v1/files` + `POST /v1/openai/v1/vector_stores/{id}/files` - File upload and embedding
- `POST /v1/openai/v1/responses` - Unified response generation with integrated RAG

## State Management

### File Upload Flow State
- **Upload Progress**: Track file selection, model configuration, and processing status
- **Vector DB Selection**: Store user's chosen vector database name and embedding model  
- **Validation State**: File type validation, size limits, and configuration errors
- **Success State**: Completion notifications and readiness for chat queries

### Chat Flow State
- **Conversation History**: Messages exchanged between user and assistant
- **RAG Context**: Available vector databases and their document content
- **UI Feedback**: Typing indicators, response streaming, and source attribution
- **Error Handling**: Network failures, API errors, and graceful degradation

### Persistence Strategy
- **Frontend**: Temporary UI state, no persistent storage of sensitive data
- **BFF**: Stateless request processing, no session persistence
- **Llama Stack**: Persistent storage of vector databases, embeddings, and metadata

## Performance Considerations

### File Upload Flow Optimizations
- **Chunked Upload**: Process large files in smaller chunks to prevent timeouts
- **Background Processing**: Asynchronous document processing with progress updates
- **Validation Early**: Client-side file validation before server upload
- **Compression**: Compress documents before transmission when beneficial

### Chat Flow Optimizations  
- **RAG Caching**: Cache embedding queries for repeated similar questions
- **Model Warming**: Keep frequently used models loaded in memory
- **Streaming Responses**: Real-time response delivery for better user experience
- **Context Management**: Limit RAG context size to optimize inference speed

### System-Wide Performance
- **Connection Pooling**: Reuse HTTP connections to Llama Stack
- **Error Recovery**: Fast failure detection and graceful degradation
- **Resource Limits**: Prevent resource exhaustion from large uploads or queries



### Flow 3: MaaS Model Token Management

User authenticates with MaaS models and manages access tokens:

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Frontend
    participant BFF as BFF API
    participant Cache as MemoryStore
    participant MaaS as MaaS API
    participant K8s as Kubernetes

    Note over User,K8s: MaaS Model Authentication Flow
    
    UI->>BFF: GET /gen-ai/api/v1/maas/models?namespace=user-ns
    BFF->>K8s: SubjectAccessReview (check permissions)
    K8s-->>BFF: User authorized
    BFF->>MaaS: GET /maas-api/models
    MaaS-->>BFF: List of hosted models
    BFF-->>UI: Available MaaS models
    
    Note over UI,MaaS: User selects MaaS model for chat
    
    UI->>BFF: POST /gen-ai/api/v1/responses (with MaaS model)
    BFF->>Cache: Get cached token (namespace + user + model)
    Cache-->>BFF: Token not found or expired
    
    BFF->>MaaS: POST /maas-api/tokens (issue new token)
    MaaS-->>BFF: Access token + expiration
    BFF->>Cache: Store token (15min TTL)
    
    BFF->>LS: POST /v1/openai/v1/responses (with MaaS token)
    LS->>MaaS: Query model (with token)
    MaaS-->>LS: Model response
    LS-->>BFF: Formatted response
    BFF-->>UI: Stream response to user
    
    Note over Cache: Background cleanup removes expired tokens
```

### Flow 4: MCP Tool Discovery and Invocation

User discovers and invokes tools from MCP servers:

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Frontend
    participant BFF as BFF API
    participant MCP as MCP Servers
    participant K8s as Kubernetes

    Note over User,K8s: MCP Tool Discovery Flow
    
    UI->>BFF: GET /gen-ai/api/v1/mcp/servers?namespace=user-ns
    BFF->>K8s: List ConfigMaps with mcp-server label
    K8s-->>BFF: MCP server configurations
    BFF->>MCP: Connect to each server (SSE/HTTP)
    MCP-->>BFF: Server capabilities
    BFF-->>UI: Available MCP servers and status
    
    UI->>BFF: GET /gen-ai/api/v1/mcp/tools?namespace=user-ns
    BFF->>MCP: GET /tools (from each server)
    MCP-->>BFF: Available tools list
    BFF-->>UI: Aggregated tools from all servers
    
    Note over User,MCP: User invokes tool during chat
    
    UI->>BFF: POST /gen-ai/api/v1/responses (with tool call)
    BFF->>MCP: POST /tools/call (invoke tool)
    MCP-->>BFF: Tool execution result
    BFF->>LS: POST /v1/openai/v1/responses (with tool result)
    LS-->>BFF: Response incorporating tool data
    BFF-->>UI: Stream response with tool usage
```

### Flow 5: Namespace Selection and RBAC Enforcement

User selects namespace and system enforces RBAC permissions:

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Frontend
    participant BFF as BFF API
    participant K8s as Kubernetes

    Note over User,K8s: Namespace Selection and Permission Check
    
    UI->>BFF: GET /gen-ai/api/v1/namespaces
    Note over BFF: Extract user token from Authorization header
    BFF->>K8s: Create user-scoped client (token impersonation)
    BFF->>K8s: List namespaces (as user)
    K8s-->>BFF: Only namespaces user can access
    BFF-->>UI: Filtered namespace list
    
    User->>UI: Select namespace from dropdown
    
    UI->>BFF: GET /gen-ai/api/v1/lsd/status?namespace=user-ns
    BFF->>K8s: SubjectAccessReview (can list LSD in namespace?)
    K8s-->>BFF: Permission granted
    BFF->>K8s: List LlamaStackDistributions in namespace
    K8s-->>BFF: LSD resources
    BFF-->>UI: LSD status (installed/not installed)
    
    Note over BFF,K8s: Permission denied example
    UI->>BFF: GET /gen-ai/api/v1/models?namespace=restricted-ns
    BFF->>K8s: SubjectAccessReview (can access service?)
    K8s-->>BFF: Permission denied
    BFF-->>UI: 403 Forbidden (with user-friendly message)
```

## Links

* [Related to] ADR-0002 - Gen AI System Architecture
* [Related to] ADR-0001 - Record Architecture Decisions
* [Related to] ADR-0005 - Authentication and Authorization Architecture (namespace RBAC)
* [Related to] ADR-0008 - Caching Strategy (MaaS token caching)
* [Related to] ADR-0009 - MaaS Service Autodiscovery
* [External] [Llama Stack API Documentation](https://llama-stack.readthedocs.io/) - RAG tool and chat completion APIs
* [Related to] [Frontend Implementation](../../frontend/src/app/services/llamaStackService.ts) - API client code
* [Related to] [BFF Handlers](../../bff/internal/api/) - BFF endpoint implementations 