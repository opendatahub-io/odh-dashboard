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
        UI[React UI<br/>Port 3000<br/>• Model Selection<br/>• File Upload<br/>• Chat Interface]
    end
    
    subgraph "BFF Layer"
        BFF[Go BFF Server<br/>Port 8080<br/>• API Gateway<br/>• Authentication<br/>• Request Orchestration]
    end
    
    subgraph "Mock Layer (Development)"
        Mock[Mock Services<br/>• In-Memory Data<br/>• Simulated Responses<br/>• Development Testing]
    end
    
    subgraph "External Services"
        LS[Llama Stack<br/>Port 8000<br/>• Model Management<br/>• Vector Databases<br/>• RAG & Chat APIs]
    end
    
    UI -->|HTTP/REST<br/>/api/v1/*| BFF
    BFF -->|Production<br/>HTTP Client| LS
    BFF -->|Development<br/>MOCK_LS_CLIENT=true| Mock
    
    classDef frontend fill:#1976d2,stroke:#0d47a1,stroke-width:3px,color:#ffffff
    classDef bff fill:#388e3c,stroke:#1b5e20,stroke-width:3px,color:#ffffff
    classDef mock fill:#f57c00,stroke:#e65100,stroke-width:3px,color:#ffffff
    classDef external fill:#d32f2f,stroke:#b71c1c,stroke-width:3px,color:#ffffff
    
    class UI frontend
    class BFF bff
    class Mock mock
    class LS external
```

### Component Dependencies

#### Frontend Components
```mermaid
graph TB
    subgraph "React UI Components"
        ChatUI[Chat Interface]
        ModelSelect[Model Selection]
        FileUpload[File Upload Panel]
        Settings[Settings Modal]
    end
    
    subgraph "Frontend Services"
        APIService[API Service Layer]
        AuthService[Authentication Service]
        StateCache[State Management]
    end
    
    ChatUI --> APIService
    ModelSelect --> APIService
    FileUpload --> APIService
    Settings --> APIService
    APIService --> AuthService
    ChatUI --> StateCache
    ModelSelect --> StateCache
    
    classDef ui fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#ffffff
    classDef service fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#ffffff
    
    class ChatUI,ModelSelect,FileUpload,Settings ui
    class APIService,AuthService,StateCache service
```

#### BFF Components
```mermaid
graph TB
    subgraph "HTTP Layer"
        Router[HTTP Router<br/>httprouter]
        Middleware[Middleware Chain]
    end
    
    subgraph "API Handlers"
        ModelsH[Models Handler]
        UploadH[Upload Handler]
        QueryH[Query Handler]
        ConfigH[Config Handler]
    end
    
    subgraph "Business Logic"
        Repos[Repository Layer]
        LlamaStackClient[LlamaStack Client]
    end
    
    subgraph "Integration"
        HTTPClient[HTTP Client]
        MockClient[Mock Client]
    end
    
    Router --> Middleware
    Middleware --> ModelsH
    Middleware --> UploadH
    Middleware --> QueryH
    Middleware --> ConfigH
    
    ModelsH --> Repos
    UploadH --> Repos
    QueryH --> Repos
    
    Repos --> LlamaStackClient
    LlamaStackClient -->|Production| HTTPClient
    LlamaStackClient -->|Development| MockClient
    
    classDef http fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#ffffff
    classDef handlers fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#ffffff
    classDef business fill:#f57c00,stroke:#e65100,stroke-width:2px,color:#ffffff
    classDef integration fill:#7b1fa2,stroke:#4a148c,stroke-width:2px,color:#ffffff
    
    class Router,Middleware http
    class ModelsH,UploadH,QueryH,ConfigH handlers
    class Repos,LlamaStackClient business
    class HTTPClient,MockClient integration
```

#### Llama Stack Components
```mermaid
graph TB
    subgraph "Model Services"
        ModelAPI[Model Management API]
        InferenceAPI[Inference API]
    end
    
    subgraph "RAG Services"
        VectorDBAPI[Vector Database API]
        RAGToolAPI[RAG Tool API]
    end
    
    subgraph "Storage Layer"
        VectorStore[Vector Databases<br/>ChromaDB/FAISS]
        ModelStore[Model Storage<br/>Llama/Granite]
    end
    
    ModelAPI --> ModelStore
    InferenceAPI --> ModelStore
    VectorDBAPI --> VectorStore
    RAGToolAPI --> VectorStore
    RAGToolAPI --> VectorDBAPI
    
    classDef api fill:#d32f2f,stroke:#b71c1c,stroke-width:2px,color:#ffffff
    classDef storage fill:#795548,stroke:#3e2723,stroke-width:2px,color:#ffffff
    
    class ModelAPI,InferenceAPI,VectorDBAPI,RAGToolAPI api
    class VectorStore,ModelStore storage
```

## Links

* [Supersedes] Direct service communication approach
* [Related to] [Llama Stack API Documentation] - External service specification
* [Related to] ADR-0001 - Record Architecture Decisions