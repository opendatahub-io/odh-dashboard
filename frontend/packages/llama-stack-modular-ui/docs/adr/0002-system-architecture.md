# 0002 - Llama Stack Modular UI System Architecture

* Date: 2025-07-25
* Updated: 2025-08-20
* Authors: Matias Schimuneck

## Context and Problem Statement

The Llama Stack Modular UI is a complete system that enables users to interact with Llama Stack services through a web interface for RAG (Retrieval Augmented Generation) operations. We need to define the overall system architecture that includes the frontend, backend-for-frontend (BFF), and integration patterns with external services.

The system requirements:
- User-friendly web interface for model interaction and document upload
- Secure authentication and authorization
- Real-time chat interface with LLM models
- Document processing and vector database management
- API orchestration and service integration
- Development and production environment support

## Decision Drivers

* User experience requirements for intuitive RAG interactions
* Need for secure authentication in OpenShift environments
* Real-time chat capabilities with LLM models
* Document upload and vector database management
* Development vs production environment flexibility
* Maintainable and testable architecture
* Performance and scalability considerations
* Integration with existing OpenDataHub ecosystem

## Considered Options

* Single-page application with direct API calls
* Traditional three-tier architecture (frontend, API server, database)
* Backend-for-Frontend (BFF) pattern with Frontend
* Microservices architecture with API gateway
* Server-side rendered application

## Decision Outcome

Chosen option: "Backend-for-Frontend (BFF) pattern with Frontend", because:

- Provides optimal user experience with responsive React UI
- BFF layer handles complex service orchestration and authentication
- Clear separation between user interface and business logic
- Enables independent development and deployment cycles
- Supports both development (mocked) and production environments
- Integrates well with OpenShift and Kubernetes deployments

### Positive Consequences

* Modern, responsive user interface with React
* Centralized authentication and security handling in BFF
* Clear API contracts between system layers
* Easy testing with comprehensive mock implementations
* Flexible deployment options (standalone or federated)
* Good developer experience with hot-reload and mocking

### Negative Consequences

* Additional complexity with multiple deployment units
* Network latency through BFF layer
* Requires careful API design to avoid chatty interfaces
* More infrastructure components to monitor and maintain

## Implementation

The system is implemented using a multi-container architecture with modern web technologies:

### Frontend Container (React 18 + TypeScript)
- **UI Framework**: PatternFly-based React application using `@patternfly/chatbot` components
- **Build System**: Webpack 5 with TypeScript compilation, hot-reload, and asset optimization
- **API Communication**: Dual approach with axios HTTP client and llama-stack-client npm package
- **State Management**: React Context API for authentication state (no Redux)
- **Routing**: React Router v7 for client-side navigation
- **Testing**: Jest for unit tests, Cypress for E2E testing with mock server support
- **Development**: Hot-reload dev server on port 8080 with proxy to BFF

### Backend-for-Frontend Container (Go 1.23)
- **HTTP Router**: High-performance `julienschmidt/httprouter` for request routing
- **Static Assets**: Serves built frontend files from `/static` directory with SPA fallback
- **API Endpoints**: RESTful APIs under `/genai/v1/*` with comprehensive OpenAPI documentation
- **OpenAI SDK Integration**: Uses official OpenAI Go SDK v2.1.0 for Llama Stack communication
- **Middleware**: CORS, authentication, logging, panic recovery, and telemetry
- **Configuration**: Environment-based config with OAuth 2.0/OIDC support
- **Mock System**: Complete mock implementations for development and testing
- **Documentation**: Comprehensive OpenAPI specification with Swagger UI

### Integration Architecture
- **Domain-Specific Repository Pattern**: Separate repositories for Models, VectorStores, Files, and Responses operations
- **Factory Pattern**: LlamaStackClientFactory with RealClientFactory and MockClientFactory implementations
- **Envelope Pattern**: Consistent `{data, metadata}` API response structure across all endpoints
- **OpenAI SDK Client**: Official SDK for robust Llama Stack API communication with direct streaming support
- **Interface-based Design**: Clean abstractions enabling easy mocking and testing
- **Authentication**: OAuth 2.0 token validation with browser storage persistence
- **Error Handling**: Comprehensive error transformation and user-friendly messaging
- **Development Mode**: Configurable mock client with factory-based creation

### Modular UI Deployment (ODH Dashboard Integration)
- **Module Federation**: Deployed as a federated module within ODH Dashboard using Webpack 5 Module Federation
- **Multi-Container Pod**: Runs as a sidecar container alongside the main ODH Dashboard in the same Kubernetes pod
- **Shared Resources**: Uses shared TLS certificates, ConfigMaps, and service networking
- **Federation Config**: Configured via `federation-configmap.yaml` with routing rules and remote entry points
- **Service Integration**: Exposed through the main ODH Dashboard service with path-based routing
- **OpenShift Console**: Integrated with OpenShift web console via ConsoleLink CRD
- **RBAC**: Leverages OpenShift OAuth with user token forwarding and RBAC authorization
- **Deployment Modes**: Supports both federated (production) and standalone (development) deployment modes

## Architecture Diagrams (C4 Model)

### Level 1: System Context Diagram

Shows how the Llama Stack Modular UI fits into the broader ecosystem:

```mermaid
graph TB
    subgraph SystemContext["System Context - Llama Stack Modular UI"]
        User["Persona X<br/>(Target User)<br/>LLM interactions & RAG operations"]
        
        subgraph LlamaStackUI["Llama Stack Modular UI System"]
            UISystem["Llama Stack Modular UI<br/>Web-based interface for<br/>LLM interactions, document upload, RAG"]
        end
        
        subgraph ExternalSystems["External Systems"]
            LlamaStack["Llama Stack<br/>LLM orchestration service<br/>Complete ML platform with models,<br/>inference, and vector databases"]
        end
    end
    
    User -->|"Uses (HTTPS/WSS)"| UISystem
    UISystem -->|"Communicates via OpenAI SDK (HTTP/REST)"| LlamaStack
    
    classDef userStyle fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef uiStyle fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#fff
    classDef llamaStyle fill:#d32f2f,stroke:#b71c1c,stroke-width:2px,color:#fff
    
    class User userStyle
    class UISystem uiStyle
    class LlamaStack llamaStyle
```

### Level 2: Container Diagram

Shows the high-level containers and their interactions within the Llama Stack Modular UI:

```mermaid
graph TB
    subgraph SystemOverview["Container Overview - Llama Stack Modular UI"]
        User["Persona X<br/>(Target User)<br/>Web browser interaction"]
        
        subgraph LlamaStackSystem["Llama Stack Modular UI System"]
            Frontend["Frontend Container<br/>(React/TypeScript)<br/>User interface for chat & upload"]
            BFF["BFF API Container<br/>(Go/HTTP)<br/>Authentication & orchestration"]
            StaticAssets["Static Assets<br/>(HTML/CSS/JS)<br/>React application files"]
        end
        
        subgraph ExternalServices["External Services"]
            LlamaStackAPI["Llama Stack API<br/>(HTTP/REST)<br/>Model management & inference"]
            VLLM["vLLM<br/>(High-performance inference)<br/>Large language model serving"]
            MaaS["MaaS<br/>(Model as a Service)<br/>Hosted LLM inference"]
            VectorDB["Vector Databases<br/>(ChromaDB, FAISS)<br/>Document embeddings storage"]
        end
    end
    
    User -->|"Visits (HTTPS)"| Frontend
    Frontend -->|"Loads from (HTTPS)"| StaticAssets
    Frontend -->|"API calls (JSON/HTTPS)"| BFF
    BFF -->|"Orchestrates calls (JSON/HTTP)"| LlamaStackAPI
    LlamaStackAPI -->|"Queries models (HTTP/gRPC)"| VLLM
    LlamaStackAPI -->|"Queries hosted models (HTTP/REST)"| MaaS
    LlamaStackAPI -->|"Manages embeddings (Native protocols)"| VectorDB
    
    classDef userStyle fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef frontendStyle fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef bffStyle fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#fff
    classDef assetsStyle fill:#757575,stroke:#424242,stroke-width:2px,color:#fff
    classDef llamaStyle fill:#d32f2f,stroke:#b71c1c,stroke-width:2px,color:#fff
    classDef inferenceStyle fill:#ff5722,stroke:#d84315,stroke-width:2px,color:#fff
    classDef storageStyle fill:#f57c00,stroke:#e65100,stroke-width:2px,color:#fff
    
    class User userStyle
    class Frontend frontendStyle
    class BFF bffStyle
    class StaticAssets assetsStyle
    class LlamaStackAPI llamaStyle
    class VLLM,MaaS inferenceStyle
    class VectorDB storageStyle
```

### Level 3: Component Diagrams

#### Frontend Components

Shows the current internal structure of the Frontend application with visual grouping:

```mermaid
graph TB
    subgraph Frontend["Frontend Application (React 18 + TypeScript)"]
        subgraph AppFoundation["App Foundation"]
            App["App.tsx<br/>(Main Application)"]
            AppRoutes["AppRoutes.tsx<br/>(Route Configuration)"]
            AppLayout["AppLayout.tsx<br/>(Layout Structure)"]
        end
        
        subgraph ChatbotCore["Chatbot Core Components"]
            ChatbotMain["ChatbotMain.tsx<br/>(Main Chat Interface)"]
            ChatbotMessagesList["ChatbotMessagesList.tsx<br/>(Message Display)"]
            ChatbotSettingsPanel["ChatbotSettingsPanel.tsx<br/>(Chat Settings)"]
        end
        
        subgraph ChatbotUIComponents["Chatbot UI Components"]
            ModelDetailsDropdown["ModelDetailsDropdown.tsx<br/>(Model Selection)"]
            SystemInstructionForm["SystemInstructionFormGroup.tsx<br/>(Instructions Input)"]
            UploadErrorAlert["SourceUploadErrorAlert.tsx<br/>(Error Display)"]
            UploadSuccessAlert["SourceUploadSuccessAlert.tsx<br/>(Success Display)"]
        end
        
        subgraph UploadComponents["Source Upload Components"]
            SourceUploadPanel["ChatbotSourceUploadPanel.tsx<br/>(File Upload Interface)"]
            SourceSettingsModal["ChatbotSourceSettingsModal.tsx<br/>(Upload Configuration)"]
        end
        
        subgraph Navigation["Navigation Components"]
            NavBar["NavBar.tsx<br/>(Top Navigation)"]
            NavSidebar["NavSidebar.tsx<br/>(Side Navigation)"]
            AppNavSidebar["AppNavSidebar.tsx<br/>(App Navigation)"]
            NotFound["NotFound.tsx<br/>(404 Page)"]
        end
        
        subgraph StateManagement["State Management (Hooks)"]
            UseChatbotMessages["useChatbotMessages.ts<br/>(Chat State)"]
            UseSourceManagement["useSourceManagement.ts<br/>(Upload State)"]
            UseAlertManagement["useAlertManagement.ts<br/>(Alert State)"]
            UseAccordionState["useAccordionState.ts<br/>(UI State)"]
        end
        
        subgraph DataLayer["Data & Services Layer"]
            LlamaStackService["llamaStackService.ts<br/>(BFF API Client)"]
            UseFetchLlamaModels["useFetchLlamaModels.ts<br/>(Models Data)"]
            UseFetchVectorDBs["useFetchVectorDBs.ts<br/>(Vector Stores Data)"]
        end
        
        subgraph Utilities["Utilities & Configuration"]
            AxiosConfig["axios.ts<br/>(HTTP Client Config)"]
            Utils["utils.ts<br/>(Helper Functions)"]
            Constants["const.ts<br/>(App Constants)"]
            Types["types.ts<br/>(TypeScript Types)"]
        end
    end
    
    subgraph External["External Dependencies"]
        BFFApi["BFF API<br/>(/genai/v1/* endpoints)"]
        PatternFlyComponents["PatternFly Components<br/>(UI Library)"]
        ReactRouter["React Router<br/>(Navigation)"]
    end
    
    App --> AppRoutes
    AppRoutes --> AppLayout
    AppRoutes --> NotFound
    AppLayout --> ChatbotMain
    AppLayout --> Navigation
    
    ChatbotMain --> ChatbotMessagesList
    ChatbotMain --> ChatbotSettingsPanel
    ChatbotMain --> ChatbotUIComponents
    ChatbotMain --> UploadComponents
    
    ChatbotCore --> StateManagement
    UploadComponents --> StateManagement
    
    StateManagement --> DataLayer
    DataLayer --> LlamaStackService
    LlamaStackService --> AxiosConfig
    
    LlamaStackService --> BFFApi
    UseFetchLlamaModels --> BFFApi
    UseFetchVectorDBs --> BFFApi
    ChatbotCore --> PatternFlyComponents
    AppRoutes --> ReactRouter
    
    classDef foundation fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef chatbot fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#fff
    classDef ui fill:#4caf50,stroke:#2e7d32,stroke-width:2px,color:#fff
    classDef upload fill:#ff9800,stroke:#f57c00,stroke-width:2px,color:#fff
    classDef nav fill:#f57c00,stroke:#e65100,stroke-width:2px,color:#fff
    classDef state fill:#e91e63,stroke:#ad1457,stroke-width:2px,color:#fff
    classDef data fill:#9c27b0,stroke:#6a1b99,stroke-width:2px,color:#fff
    classDef utils fill:#757575,stroke:#424242,stroke-width:2px,color:#fff
    
    class App,AppRoutes,AppLayout foundation
    class ChatbotMain,ChatbotMessagesList,ChatbotSettingsPanel chatbot
    class ModelDetailsDropdown,SystemInstructionForm,UploadErrorAlert,UploadSuccessAlert ui
    class SourceUploadPanel,SourceSettingsModal upload
    class NavBar,NavSidebar,AppNavSidebar,NotFound nav
    class UseChatbotMessages,UseSourceManagement,UseAlertManagement,UseAccordionState state
    class LlamaStackService,UseFetchLlamaModels,UseFetchVectorDBs data
    class AxiosConfig,Utils,Constants,Types utils
```

#### BFF API Components

Shows the simplified internal structure of the Backend-for-Frontend API with visual grouping:

```mermaid
graph TB
    subgraph BFF["BFF API Container"]
        subgraph RoutingLayer["Routing & Middleware Layer"]
            Router["HTTP Router<br/>(httprouter)"]
            Middleware["Middleware Chain<br/>(CORS, Auth, Logging, Recovery)"]
            StaticServer["Static File Server<br/>(Frontend Assets)"]
        end
        
        subgraph LlamaStackHandlers["LlamaStack API Handlers (/genai/v1/)"]
            ModelsHandler["models_handler<br/>(GET /genai/v1/models)"]
            VectorStoresHandler["vectorstores_handler<br/>(GET/POST /genai/v1/vectorstores)"]
            FilesHandler["files_handler<br/>(POST /genai/v1/files/upload)"]
            ResponsesHandler["responses_handler<br/>(POST /genai/v1/responses)"]
        end
        
        subgraph SupportHandlers["Support Handlers"]
            OpenAPIHandler["openapi_handler<br/>(Swagger UI & Docs)"]
            HealthHandler["healthcheck_handler<br/>(Service Health)"]
        end
        
        subgraph BusinessLogic["Domain-Specific Repository Layer"]
            ModelsRepo["ModelsRepository<br/>(Model Operations & Transformations)"]
            VectorStoresRepo["VectorStoresRepository<br/>(Vector Store Operations)"]
            FilesRepo["FilesRepository<br/>(File Upload Operations)"]
            ResponsesRepo["ResponsesRepository<br/>(AI Response Operations)"]
            HealthRepo["HealthCheckRepository<br/>(Health Operations)"]
        end
        
        subgraph ClientLayer["Client Integration Layer"]
            ClientFactory["LlamaStackClientFactory<br/>(Factory Pattern Interface)"]
            RealFactory["RealClientFactory<br/>(Production Client Creation)"]
            MockFactory["MockClientFactory<br/>(Testing Client Creation)"]
            LlamaClient["LlamaStackClient<br/>(OpenAI SDK v2.1.0)"]
            MockClient["MockLlamaStackClient<br/>(Development & Testing)"]
            ClientInterface["LlamaStackClientInterface<br/>(Client Abstraction)"]
        end
    end
    
    subgraph Config["Configuration & Specs"]
        EnvConfig["Environment Config<br/>(Runtime Settings)"]
        OpenAPISpec["OpenAPI Specification<br/>(YAML Documentation)"]
    end
    
    LlamaStackAPI["Llama Stack API<br/>(External LLM Service)"]
    
    Router --> Middleware
    Middleware --> StaticServer
    Middleware --> LlamaStackHandlers
    Middleware --> SupportHandlers
    
    ModelsHandler --> ModelsRepo
    VectorStoresHandler --> VectorStoresRepo
    FilesHandler --> FilesRepo
    ResponsesHandler --> ResponsesRepo
    HealthHandler --> HealthRepo
    
    ModelsRepo --> ClientInterface
    VectorStoresRepo --> ClientInterface
    FilesRepo --> ClientInterface
    ResponsesRepo --> ClientInterface
    
    ClientFactory --> RealFactory
    ClientFactory --> MockFactory
    RealFactory --> LlamaClient
    MockFactory --> MockClient
    
    ClientInterface --> LlamaClient
    ClientInterface --> MockClient
    
    LlamaClient --> LlamaStackAPI
    OpenAPIHandler --> OpenAPISpec
    
    classDef routing fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef handlers fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#fff
    classDef support fill:#f57c00,stroke:#e65100,stroke-width:2px,color:#fff
    classDef business fill:#e91e63,stroke:#ad1457,stroke-width:2px,color:#fff
    classDef factory fill:#9c27b0,stroke:#6a1b99,stroke-width:2px,color:#fff
    classDef client fill:#673ab7,stroke:#4527a0,stroke-width:2px,color:#fff
    classDef config fill:#757575,stroke:#424242,stroke-width:2px,color:#fff
    
    class Router,Middleware,StaticServer routing
    class ModelsHandler,VectorStoresHandler,FilesHandler,ResponsesHandler handlers
    class OpenAPIHandler,HealthHandler support
    class ModelsRepo,VectorStoresRepo,FilesRepo,ResponsesRepo,HealthRepo business
    class ClientFactory,RealFactory,MockFactory factory
    class LlamaClient,MockClient,ClientInterface client
    class EnvConfig,OpenAPISpec config
```

### Level 4: Deployment Diagram

Shows how the Llama Stack Modular UI is deployed as a module within the ODH Dashboard ecosystem:

```mermaid
graph TB
    subgraph DeploymentOverview["Deployment Overview - ODH Dashboard Module"]
        subgraph UserEnvironment["User Environment"]
            Browser["User's Browser<br/>(Web Browser)<br/>ODH Dashboard UI with Llama Stack module"]
        end
        
        subgraph OpenShiftCluster["OpenShift/Kubernetes Cluster"]
            subgraph ODHNamespace["opendatahub namespace"]
                subgraph DashboardPod["ODH Dashboard Pod (Multi-container)"]
                    MainDashboard["ODH Dashboard<br/>(React/Node.js)<br/>Module federation host"]
                    LlamaUIModule["Llama Stack UI Module<br/>(React/Go BFF)<br/>Port 8043"]
                    ModelRegistryModule["Model Registry Module<br/>(React/Go BFF)<br/>Port 8044"]
                    TLSCerts["TLS Certificates<br/>(Volume Mount)<br/>Shared HTTPS certificates"]
                end
                
                subgraph ODHConfig["ODH Configuration"]
                    FederationConfig["Federation ConfigMap<br/>Module routing rules"]
                    DashboardConfig["Dashboard ConfigMap<br/>Feature flags & config"]
                end
                
                subgraph ODHServices["ODH Services"]
                    DashboardService["ODH Dashboard Service<br/>(ClusterIP)<br/>Port 8080/8443"]
                    ConsoleLink["OpenShift Console Link<br/>(ConsoleLink CRD)<br/>Web console integration"]
                end
            end
            
            subgraph LlamaNamespace["llama-stack namespace"]
                subgraph LlamaPod["Llama Stack Pod"]
                    LlamaAPI["Llama Stack API<br/>(Python/FastAPI)<br/>LLM orchestration & RAG"]
                    VectorDB["Vector Database<br/>(ChromaDB/FAISS)<br/>Document embeddings"]
                end
            end
            
            subgraph VLLMNamespace["vllm namespace"]
                VLLMServer["vLLM Server<br/>(Python/gRPC)<br/>GPU-optimized inference"]
            end
            
            subgraph AuthNamespace["openshift-authentication"]
                OAuthServer["OAuth Server<br/>(OpenShift OAuth)<br/>RBAC & token validation"]
            end
        end
    end
    
    Browser -->|"HTTPS requests"| DashboardService
    DashboardService --> MainDashboard
    DashboardService -->|"Routes /llama-stack/*"| LlamaUIModule
    
    MainDashboard --> FederationConfig
    MainDashboard -->|"Loads module via /remoteEntry.js"| LlamaUIModule
    
    LlamaUIModule --> DashboardConfig
    LlamaUIModule --> TLSCerts
    LlamaUIModule --> OAuthServer
    LlamaUIModule -->|"API calls via /genai/v1/* using OpenAI SDK"| LlamaAPI
    
    LlamaAPI --> VLLMServer
    LlamaAPI --> VectorDB
    
    ConsoleLink --> DashboardService
    
    classDef browserStyle fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef dashboardStyle fill:#1976d2,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef moduleStyle fill:#388e3c,stroke:#1b5e20,stroke-width:2px,color:#fff
    classDef configStyle fill:#757575,stroke:#424242,stroke-width:2px,color:#fff
    classDef serviceStyle fill:#757575,stroke:#424242,stroke-width:2px,color:#fff
    classDef llamaStyle fill:#d32f2f,stroke:#b71c1c,stroke-width:2px,color:#fff
    classDef inferenceStyle fill:#ff5722,stroke:#d84315,stroke-width:2px,color:#fff
    classDef storageStyle fill:#f57c00,stroke:#e65100,stroke-width:2px,color:#fff
    classDef authStyle fill:#7b1fa2,stroke:#4a148c,stroke-width:2px,color:#fff
    
    class Browser browserStyle
    class MainDashboard dashboardStyle
    class LlamaUIModule,ModelRegistryModule moduleStyle
    class FederationConfig,DashboardConfig,TLSCerts configStyle
    class DashboardService,ConsoleLink serviceStyle
    class LlamaAPI llamaStyle
    class VLLMServer inferenceStyle
    class VectorDB storageStyle
    class OAuthServer authStyle
```

## Links

* [Related to] ADR-0001 - Record Architecture Decisions
* [Related to] ADR-0003 - Core User Flows
* [Related to] [C4 Model](https://c4model.com/) - Software architecture visualization approach used in these diagrams
* [Related to] [Llama Stack Documentation](https://llama-stack.readthedocs.io/) - External service specification
* [Related to] [React Architecture Guidelines](https://react.dev/learn/thinking-in-react) - Frontend development patterns
* [Related to] [OpenDataHub Dashboard](https://github.com/opendatahub-io/odh-dashboard) - Parent project architecture