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
    subgraph "Frontend Layer"
        UI[React UI Components<br/>Port 3000]
        Cache[In-Memory Model Cache]
        BrowserCache[Browser Storage<br/>Vector DB Names]
    end
    
    subgraph "BFF Layer - Go Server (Port 8080)"
        Router[HTTP Router<br/>httprouter]
        Middleware[Middleware Stack]
        Handlers[API Handlers]
        Repos[Repository Layer]
        Integration[HTTP Client Integration]
    end
    
    subgraph "Middleware Components"
        Auth[OAuth Handler]
        CORS[CORS Middleware]
        Recovery[Panic Recovery]
        Telemetry[Telemetry & Logging]
    end
    
    subgraph "API Handlers"
        ModelsH[Models Handler]
        VectorDBH[Vector DB Handler]
        UploadH[Upload Handler]
        QueryH[Query Handler]
        ConfigH[Config Handler]
    end
    
    subgraph "Repository Interfaces"
        ModelsRepo[Models Interface]
        VectorDBRepo[Vector DB Interface]
        RAGRepo[RAG Tool Interface]
    end
    
    subgraph "Mock Layer (Development)"
        MockClient[LlamastackClientMock]
        MockData[In-Memory Mock Data]
        MockConfig[MOCK_LS_CLIENT=true]
    end
    
    subgraph "External Services"
        LS[Llama Stack API<br/>Port 8000]
        VectorStore[Vector Databases<br/>ChromaDB/FAISS]
        LLMModels[LLM Models<br/>Llama/Granite]
    end
    
    UI --> Cache
    UI --> BrowserCache
    UI -->|REST API| Router
    
    Router --> Middleware
    Middleware --> Auth
    Middleware --> CORS
    Middleware --> Recovery
    Middleware --> Telemetry
    
    Router --> Handlers
    Handlers --> ModelsH
    Handlers --> VectorDBH
    Handlers --> UploadH
    Handlers --> QueryH
    Handlers --> ConfigH
    
    ModelsH --> Repos
    VectorDBH --> Repos
    UploadH --> Repos
    QueryH --> Repos
    
    Repos --> ModelsRepo
    Repos --> VectorDBRepo
    Repos --> RAGRepo
    
    ModelsRepo --> Integration
    VectorDBRepo --> Integration
    RAGRepo --> Integration
    
    Integration -->|Production| LS
    Integration -->|Development| MockClient
    MockClient --> MockData
    MockConfig --> MockClient
    
    LS --> VectorStore
    LS --> LLMModels
    
    classDef frontend fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#ffffff
    classDef bff fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#ffffff
    classDef middleware fill:#f57c00,stroke:#e65100,stroke-width:2px,color:#ffffff
    classDef handlers fill:#7b1fa2,stroke:#4a148c,stroke-width:2px,color:#ffffff
    classDef repos fill:#c2185b,stroke:#880e4f,stroke-width:2px,color:#ffffff
    classDef mock fill:#455a64,stroke:#263238,stroke-width:2px,color:#ffffff
    classDef external fill:#d32f2f,stroke:#b71c1c,stroke-width:2px,color:#ffffff
    
    class UI,Cache,BrowserCache frontend
    class Router,Middleware,Handlers,Repos,Integration bff
    class Auth,CORS,Recovery,Telemetry middleware
    class ModelsH,VectorDBH,UploadH,QueryH,ConfigH handlers
    class ModelsRepo,VectorDBRepo,RAGRepo repos
    class MockClient,MockData,MockConfig mock
    class LS,VectorStore,LLMModels external
```

### Component Dependencies
```mermaid
graph TB
    subgraph "API Layer"
        App[App Struct]
        Router[HTTP Router]
        Handlers[Handler Functions]
    end
    
    subgraph "Middleware Stack"
        AuthMW[RequireAuthRoute]
        CORS[EnableCORS]
        Recovery[RecoverPanic]
        Telemetry[EnableTelemetry]
        RESTClient[AttachRESTClient]
    end
    
    subgraph "Repository Layer"
        LSClient[LlamaStackClient]
        ModelsIF[ModelsInterface]
        VectorDBIF[VectorDBInterface]
        RAGIF[RAGToolInterface]
    end
    
    subgraph "Repository Implementations"
        UIModels[UIModels]
        UIVectorDB[UIVectorDB]
        UIRAGTool[UIRAGTool]
    end
    
    subgraph "Mock Implementation"
        MockLS[LlamastackClientMock]
        MockState[In-Memory State]
        TestifyMock[testify/mock]
    end
    
    subgraph "Integration Layer"
        HTTPClient[HTTPClientInterface]
        LlamaStackInteg[llamastack package]
        ConfigMgmt[Configuration]
    end
    
    subgraph "Data Models"
        Models[models package]
        Requests[Request/Response DTOs]
        Envelopes[Envelope patterns]
    end
    
    App --> Router
    Router --> Handlers
    Handlers --> AuthMW
    Handlers --> CORS
    Handlers --> Recovery
    Handlers --> Telemetry
    Handlers --> RESTClient
    
    AuthMW --> LSClient
    RESTClient --> HTTPClient
    
    LSClient --> ModelsIF
    LSClient --> VectorDBIF
    LSClient --> RAGIF
    
    ModelsIF --> UIModels
    VectorDBIF --> UIVectorDB
    RAGIF --> UIRAGTool
    
    LSClient -->|MockLSClient=true| MockLS
    MockLS --> MockState
    MockLS --> TestifyMock
    
    UIModels -->|Production| HTTPClient
    UIVectorDB -->|Production| HTTPClient
    UIRAGTool -->|Production| HTTPClient
    
    HTTPClient --> LlamaStackInteg
    
    Handlers --> Models
    Handlers --> Requests
    Handlers --> Envelopes
    
    App --> ConfigMgmt
    
    classDef api fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#ffffff
    classDef middleware fill:#f57c00,stroke:#e65100,stroke-width:2px,color:#ffffff
    classDef repository fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#ffffff
    classDef implementation fill:#7b1fa2,stroke:#4a148c,stroke-width:2px,color:#ffffff
    classDef mock fill:#455a64,stroke:#263238,stroke-width:2px,color:#ffffff
    classDef integration fill:#d32f2f,stroke:#b71c1c,stroke-width:2px,color:#ffffff
    classDef models fill:#795548,stroke:#3e2723,stroke-width:2px,color:#ffffff
    
    class App,Router,Handlers api
    class AuthMW,CORS,Recovery,Telemetry,RESTClient middleware
    class LSClient,ModelsIF,VectorDBIF,RAGIF repository
    class UIModels,UIVectorDB,UIRAGTool implementation
    class MockLS,MockState,TestifyMock mock
    class HTTPClient,LlamaStackInteg,ConfigMgmt integration
    class Models,Requests,Envelopes models
```

## Links

* [Supersedes] Direct service communication approach
* [Related to] [Llama Stack API Documentation] - External service specification
* [Related to] ADR-0001 - Record Architecture Decisions