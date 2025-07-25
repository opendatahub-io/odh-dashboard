# 0002 - Backend for Frontend (BFF) Architecture Pattern

* Status: ACCEPTED
* Date: 2025-01-25
* Authors: Matias Schimuneck
* Reviewers: TBD

## Context and Problem Statement

The Llama Stack Modular UI needs to interact with multiple backend services (Llama Stack API, vector databases, LLM models) while providing a clean interface for the React frontend. We need to decide on the architectural pattern for the backend layer.

The frontend needs:
- Simplified API calls without complex service orchestration
- CORS handling for browser-based requests
- Authentication and authorization
- Request/response transformation
- Error handling and resilience

## Decision Drivers

* Separation of concerns between frontend and backend complexity
* Need for API aggregation and orchestration
* Browser security requirements (CORS)
* Authentication and authorization centralization
* Simplified frontend development
* Testability and maintainability

## Considered Options

* Direct frontend-to-services communication
* Traditional monolithic backend
* Backend for Frontend (BFF) pattern
* API Gateway pattern
* Microservices with service mesh

## Decision Outcome

Chosen option: "Backend for Frontend (BFF) pattern", because:

- Provides a dedicated backend optimized for the specific frontend needs
- Simplifies frontend development by abstracting complex service interactions
- Centralizes cross-cutting concerns (auth, CORS, logging)
- Allows independent evolution of frontend and backend services
- Maintains good separation of concerns

### Positive Consequences

* Frontend developers can focus on UI/UX without backend complexity
* Centralized authentication and CORS handling
* Clear API contract between frontend and backend
* Easier testing with mock implementations
* Better error handling and user experience

### Negative Consequences

* Additional layer adds some latency
* More infrastructure to maintain
* Risk of becoming a "god service" if not properly designed
* Requires careful API design to avoid tight coupling

## Implementation

The BFF is implemented as a Go-based HTTP server that:
1. Exposes REST endpoints optimized for frontend consumption
2. Orchestrates calls to Llama Stack and other services
3. Handles authentication, CORS, and error transformation
4. Provides mock implementations for development/testing

## Diagrams

### Architecture Overview
```mermaid
graph TB
    subgraph "Browser"
        Frontend[React Frontend<br/>Port 3000]
    end
    
    subgraph "BFF Layer"
        BFF[Go BFF Server<br/>Port 8080]
        Auth[Authentication]
        CORS[CORS Middleware]
        Mock[Mock Services]
    end
    
    subgraph "External Services"
        LS[Llama Stack API]
        VDB[Vector Databases]
        LLM[LLM Models]
    end
    
    Frontend -->|HTTP/REST| BFF
    BFF --> Auth
    BFF --> CORS
    BFF -->|Production| LS
    BFF -->|Development| Mock
    LS --> VDB
    LS --> LLM
    
    classDef frontend fill:#e1f5fe
    classDef bff fill:#f3e5f5
    classDef external fill:#fff3e0
    
    class Frontend frontend
    class BFF,Auth,CORS,Mock bff
    class LS,VDB,LLM external
```

### Request Flow Sequence
```mermaid
sequenceDiagram
    participant User as User
    participant UI as UI
    participant BFF as BFF
    participant LlamaStackRepo as LlamaStack Repository
    participant LS as llama-stack
    
    Note over User,LS: Initial Page Load & Model Setup
    User->>UI: loadPage()
    UI->>BFF: GET /api/v1/models?model_type=llm
    BFF->>LlamaStackRepo: GetAllModels()
    LlamaStackRepo->>LS: GET /v1/models
    LS-->>LlamaStackRepo: ModelList{Data: []Model}
    LlamaStackRepo-->>BFF: ModelList (filtered by LLM type)
    BFF-->>UI: ModelListEnvelope{Data: ModelList}
    UI-->>User: page with available models
    
    Note over UI,BFF: In-memory cache<br/>Inference models
    
    Note over User,LS: File Upload & Vector DB Setup
    User->>UI: addFileClick()
    UI-->>User: fileSelectionDialog
    User->>UI: fileSelected()
    UI->>BFF: GET /api/v1/models?model_type=embedding
    BFF->>LlamaStackRepo: GetAllModels()
    LlamaStackRepo->>LS: GET /v1/models
    LS-->>LlamaStackRepo: ModelList{Data: []Model}
    LlamaStackRepo-->>BFF: ModelList (filtered by embedding type)
    BFF->>BFF: convertModelList()
    UI->>BFF: GET /api/v1/vector-dbs
    BFF->>LlamaStackRepo: GetAllVectorDBs()
    LlamaStackRepo->>LS: GET /v1/vector-dbs
    LS-->>LlamaStackRepo: VectorDBList{Data: []VectorDB}
    LlamaStackRepo-->>BFF: VectorDBList
    BFF-->>UI: models and vector DBs list
    UI-->>User: modelVectorSelectionDialog
    
    User->>UI: confirmClick()
    Note over UI,BFF: Invalidate<br/>vectorDbName<br/>Browser Cache
    UI->>BFF: POST /api/v1/upload<br/>{documents, vector_db_id, embedding_model, chunk_size_in_tokens}
    BFF->>BFF: checkifVectorDBExists(vector_db_id)
    alt Vector DB doesn't exist
        BFF->>LlamaStackRepo: RegisterVectorDB(VectorDB, embeddingModel)
        LlamaStackRepo->>LS: POST /v1/vector-dbs
        LS-->>LlamaStackRepo: VectorDB creation response
        LlamaStackRepo-->>BFF: Success/Error
    end
    BFF->>LlamaStackRepo: InsertDocuments(DocumentInsertRequest)
    LlamaStackRepo->>LS: POST /v1/tool-runtime/rag-tool/insert
    LS-->>LlamaStackRepo: Insert response
    LlamaStackRepo-->>BFF: Success/Error
    BFF-->>UI: {message: "Documents uploaded successfully", vector_db_id}
    UI->>UI: cancelLoadingSpinner
    UI->>UI: enableChatSuccessAlert
    
    Note over UI,BFF: Browser Cache<br/>vectorDbName
    
    Note over User,LS: Chat/Query Interaction
    User->>UI: messageSend(msg: str)
    UI->>BFF: POST /api/v1/query<br/>{content, vector_db_ids, llm_model_id, query_config, sampling_params}
    
    Note over BFF: No Context<br/>Kept in v1
    
    alt Has Vector DB IDs
        BFF->>LlamaStackRepo: QueryEmbeddingModel(QueryEmbeddingModelRequest)
        LlamaStackRepo->>LS: POST /v1/tool-runtime/rag-tool/query
        LS-->>LlamaStackRepo: QueryEmbeddingModelResponse
        LlamaStackRepo-->>BFF: RAG content with chunks
        BFF->>BFF: Extract context text from RAG response
    end
    
    BFF->>BFF: Create ChatMessage array<br/>(system + user with context)
    BFF->>LlamaStackRepo: ChatCompletion(ChatCompletionRequest)
    LlamaStackRepo->>LS: POST /v1/inference/chat-completion
    LS-->>LlamaStackRepo: ChatCompletionResponse
    LlamaStackRepo-->>BFF: Generated response
    BFF->>BFF: Combine RAG + Chat responses
    BFF-->>UI: {rag_response, chat_completion, has_rag_content, assistant_message}
    
    loop repeat
        Note over UI: Display streaming response
    end
```

### Component Dependencies
```mermaid
graph LR
    subgraph "BFF Components"
        API[API Layer]
        Middleware[Middleware]
        Auth[Auth Handler]
        Integrations[Integrations]
        Repositories[Repositories]
    end
    
    API --> Middleware
    API --> Auth
    API --> Repositories
    Repositories --> Integrations
    Middleware --> CORS[CORS]
    Middleware --> Logging[Logging]
    Middleware --> Recovery[Panic Recovery]
    
    classDef core fill:#e3f2fd
    classDef middleware fill:#f1f8e9
    classDef integration fill:#fff8e1
    
    class API,Repositories core
    class Middleware,Auth,CORS,Logging,Recovery middleware
    class Integrations integration
```

## Links

* [Supersedes] Direct service communication approach
* [Related to] [Llama Stack API Documentation] - External service specification
* [Related to] ADR-0001 - Record Architecture Decisions 