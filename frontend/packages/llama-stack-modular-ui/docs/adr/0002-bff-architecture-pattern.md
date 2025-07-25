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
    participant FE as Frontend
    participant BFF as BFF Server
    participant Auth as Auth Service
    participant LS as Llama Stack
    participant VDB as Vector DB
    
    FE->>BFF: POST /api/v1/query
    BFF->>Auth: Validate request
    Auth-->>BFF: Authorized
    
    alt RAG Query
        BFF->>LS: Query vector database
        LS->>VDB: Search documents
        VDB-->>LS: Relevant chunks
        LS-->>BFF: RAG results
    end
    
    BFF->>LS: Chat completion request
    LS-->>BFF: Generated response
    
    BFF->>BFF: Transform & combine results
    BFF-->>FE: Formatted response
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