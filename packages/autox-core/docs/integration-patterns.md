# `autox-core` Integration Patterns

This document describes the integration patterns for external services in the `autox-core` architecture. Each pattern follows a consistent layering approach: Handler → Service → Client.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ Handler Layer (automl/autorag)                      │
│  - HTTP Handlers                                    │
│  - Request/Response handling                        │
│  - Context management                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Service Layer (autox-core)                          │
│  - Business logic                                   │
│  - Orchestration                                    │
│  - Error handling                                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Client Layer (autox-core)                           │
│  - External API calls                               │
│  - Protocol implementation                          │
│  - Connection management                            │
└─────────────────────────────────────────────────────┘
```

## Kubernetes (k8s) Integration

### App Wiring (AutoML/AutoRAG)

```go
package api

func NewApp(cfg *config.EnvConfig, logger *slog.Logger) (*App, error) {
    // Create Kubernetes client with auth configuration
    k8sClient := k8s.NewDefaultK8sClient(k8s.DefaultK8sClientConfig{
        AuthMethod:   cfg.AuthMethod,
        GetAuthToken: getAuthTokenFromContext,
    })

    // Create Kubernetes service with client
    k8sService := k8s.NewK8sService(k8s.K8sServiceConfig{
        Logger: logger,
    }, k8sClient)

    app := &App{
        k8sService: k8sService,
        logger:     logger,
    }

    return app, nil
}
```

### Handler Layer (AutoML/AutoRAG)

```go
package api

func (a *App) GetNamespacesHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()
    identity := ctx.Value(constants.RequestIdentityKey).(*auth.RequestIdentity)

    namespaces, err := a.k8sService.GetNamespaces(ctx, identity)
    if err != nil {
        a.serverErrorResponse(w, r, err)
        return
    }

    err = a.WriteJSON(w, http.StatusOK, namespaces, nil)
    if err != nil {
        a.serverErrorResponse(w, r, err)
    }
}
```

### Service Layer (autox-core)

```go
package k8s

// K8sClientInterface defines the contract for Kubernetes operations
type K8sClientInterface interface {
    GetNamespaces(ctx context.Context, identity *auth.RequestIdentity) ([]string, error)
    GetPods(ctx context.Context, namespace string, identity *auth.RequestIdentity) (*v1.PodList, error)
    CreateNamespace(ctx context.Context, name string, identity *auth.RequestIdentity) error
}

// K8sService provides business logic for Kubernetes operations
type K8sService struct {
    Client K8sClientInterface
    Logger *slog.Logger
}

type K8sServiceConfig struct {
    Logger *slog.Logger
}

func NewK8sService(cfg K8sServiceConfig, client K8sClientInterface) *K8sService {
    return &K8sService{
        Client: client,
        Logger: cfg.Logger,
    }
}

func (s *K8sService) GetNamespaces(ctx context.Context, identity *auth.RequestIdentity) ([]string, error) {
    s.Logger.Info("fetching namespaces", "user", identity.UserID)

    namespaces, err := s.Client.GetNamespaces(ctx, identity)
    if err != nil {
        s.Logger.Error("failed to get namespaces", "error", err)
        return nil, err
    }

    return namespaces, nil
}
```

### Client Layer (autox-core)

```go
package k8s

import (
    "context"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

// ClientsetInterface wraps kubernetes.Interface for testing
type ClientsetInterface interface {
    kubernetes.Interface
}

// K8sTokenClient implements Kubernetes operations using user tokens
type K8sTokenClient struct {
    Clientset     ClientsetInterface
    GetAuthToken  func(ctx context.Context) (string, error)
}

type DefaultK8sClientConfig struct {
    AuthMethod   string
    GetAuthToken func(ctx context.Context) (string, error)
}

// NewDefaultK8sClient creates a client based on auth method
func NewDefaultK8sClient(cfg DefaultK8sClientConfig) K8sClientInterface {
    if cfg.AuthMethod == "user_token" {
        return NewDefaultK8sTokenClient(DefaultK8sTokenClientConfig{
            GetAuthToken: cfg.GetAuthToken,
        })
    }
    return NewDefaultK8sInternalClient(DefaultK8sInternalClientConfig{})
}

// --- Token-based Client ---

// K8sTokenClientConfig for injectable constructor (testing)
type K8sTokenClientConfig struct {
    GetAuthToken func(ctx context.Context) (string, error)
}

// DefaultK8sTokenClientConfig for default constructor (production)
type DefaultK8sTokenClientConfig struct {
    GetAuthToken func(ctx context.Context) (string, error)
    // Could have additional fields like custom transport settings
}

// NewK8sTokenClient creates a token client with injectable clientset (for testing)
func NewK8sTokenClient(cfg K8sTokenClientConfig, clientset ClientsetInterface) *K8sTokenClient {
    return &K8sTokenClient{
        Clientset:    clientset,
        GetAuthToken: cfg.GetAuthToken,
    }
}

// NewDefaultK8sTokenClient creates a token client with real Kubernetes clientset
func NewDefaultK8sTokenClient(cfg DefaultK8sTokenClientConfig) *K8sTokenClient {
    // Configure clientset with token-based auth using RoundTripper
    clientsetCfg := &rest.Config{
        Host: "https://kubernetes.default.svc",
        WrapTransport: func(rt http.RoundTripper) http.RoundTripper {
            return &tokenRoundTripper{
                base:         rt,
                getAuthToken: cfg.GetAuthToken,
            }
        },
    }

    clientset, err := kubernetes.NewForConfig(clientsetCfg)
    if err != nil {
        panic(err) // Or return error
    }

    return &K8sTokenClient{
        Clientset:    clientset,
        GetAuthToken: cfg.GetAuthToken,
    }
}

func (c *K8sTokenClient) GetNamespaces(ctx context.Context, identity *auth.RequestIdentity) ([]string, error) {
    list, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
    if err != nil {
        return nil, err
    }

    namespaces := make([]string, len(list.Items))
    for i, ns := range list.Items {
        namespaces[i] = ns.Name
    }

    return namespaces, nil
}

// tokenRoundTripper injects bearer token into requests
type tokenRoundTripper struct {
    base         http.RoundTripper
    getAuthToken func(ctx context.Context) (string, error)
}

func (t *tokenRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    token, err := t.getAuthToken(req.Context())
    if err != nil {
        return nil, err
    }
    req.Header.Set("Authorization", "Bearer "+token)
    return t.base.RoundTrip(req)
}
```

## Pipelines Integration

### App Wiring (AutoML/AutoRAG)

```go
package api

func NewApp(cfg *config.EnvConfig, logger *slog.Logger) (*App, error) {
    // Create Kubernetes client
    k8sClient := k8s.NewDefaultK8sClient(k8s.DefaultK8sClientConfig{
        AuthMethod:   cfg.AuthMethod,
        GetAuthToken: getAuthTokenFromContext,
    })

    // Create Pipelines client
    pipelinesClient := pipelines.NewDefaultPipelinesClient(pipelines.DefaultPipelinesClientConfig{
        GetAuthToken: getAuthTokenFromContext,
    })

    // Create Pipelines service with both clients
    pipelinesService := pipelines.NewPipelinesService(pipelines.PipelinesServiceConfig{
        Logger: logger,
    }, pipelinesClient, k8sClient)

    app := &App{
        pipelinesService: pipelinesService,
        logger:           logger,
    }

    return app, nil
}
```

### Handler Layer (AutoML/AutoRAG)

```go
package api

func (a *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()
    namespace := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

    var req pipelines.CreatePipelineRunRequest
    err := a.ReadJSON(w, r, &req)
    if err != nil {
        a.badRequestResponse(w, r, err)
        return
    }

    // Service handles DSPA discovery and pipeline run creation
    run, err := a.pipelinesService.CreatePipelineRun(ctx, pipelines.PipelineTargetOptions{
        Namespace: namespace,
    }, &req)
    if err != nil {
        a.serverErrorResponse(w, r, err)
        return
    }

    err = a.WriteJSON(w, http.StatusCreated, run, nil)
    if err != nil {
        a.serverErrorResponse(w, r, err)
    }
}
```

### Service Layer (autox-core)

```go
package pipelines

// PipelinesClientInterface defines the contract for Pipelines API operations
type PipelinesClientInterface interface {
    CreatePipelineRun(ctx context.Context, baseUrl string, req *CreatePipelineRunRequest) (*PipelineRun, error)
    GetPipelineRun(ctx context.Context, baseUrl string, runID string) (*PipelineRun, error)
    ListPipelineRuns(ctx context.Context, baseUrl string, pipelineID string) ([]*PipelineRun, error)
}

// PipelinesService provides business logic for Pipelines operations
type PipelinesService struct {
    Client    PipelinesClientInterface
    K8sClient k8s.K8sClientInterface
    Logger    *slog.Logger
}

type PipelinesServiceConfig struct {
    Logger *slog.Logger
}

func NewPipelinesService(cfg PipelinesServiceConfig, client PipelinesClientInterface, k8sClient k8s.K8sClientInterface) *PipelinesService {
    return &PipelinesService{
        Client:    client,
        K8sClient: k8sClient,
        Logger:    cfg.Logger,
    }
}

// DiscoverReadyDSPA discovers a ready DSPA instance in the namespace
func (s *PipelinesService) DiscoverReadyDSPA(ctx context.Context, namespace string) (string, error) {
    s.Logger.Info("discovering ready DSPA", "namespace", namespace)

    // Use k8s client to find ready DSPA and get its base URL
    baseUrl, err := s.K8sClient.GetReadyDSPAUrl(ctx, namespace)
    if err != nil {
        s.Logger.Error("failed to discover ready DSPA", "error", err)
        return "", err
    }

    return baseUrl, nil
}

// PipelineTargetOptions specifies where to execute pipeline operations
type PipelineTargetOptions struct {
    // Namespace to discover DSPA in (mutually exclusive with BaseUrl)
    Namespace string
    // BaseUrl to use directly (mutually exclusive with Namespace)
    BaseUrl string
}

// resolveBaseUrl resolves the DSPA base URL from options
// Returns the base URL directly if provided, otherwise discovers DSPA in namespace
func (s *PipelinesService) resolveBaseUrl(ctx context.Context, opts PipelineTargetOptions) (string, error) {
    if opts.BaseUrl != "" {
        // Use provided base URL directly
        return opts.BaseUrl, nil
    }
    
    if opts.Namespace != "" {
        // Discover DSPA in namespace
        baseUrl, err := s.DiscoverReadyDSPA(ctx, opts.Namespace)
        if err != nil {
            return "", fmt.Errorf("failed to discover DSPA in namespace %s: %w", opts.Namespace, err)
        }
        return baseUrl, nil
    }
    
    return "", errors.New("either Namespace or BaseUrl must be provided")
}

// CreatePipelineRun creates a pipeline run
// Provide either Namespace (to discover DSPA) or BaseUrl (to use directly)
func (s *PipelinesService) CreatePipelineRun(ctx context.Context, opts PipelineTargetOptions, req *CreatePipelineRunRequest) (*PipelineRun, error) {
    s.Logger.Info("creating pipeline run", "pipeline_id", req.PipelineID)

    baseUrl, err := s.resolveBaseUrl(ctx, opts)
    if err != nil {
        return nil, err
    }

    run, err := s.Client.CreatePipelineRun(ctx, baseUrl, req)
    if err != nil {
        s.Logger.Error("failed to create pipeline run", "error", err)
        return nil, err
    }

    return run, nil
}

// GetPipelineRun retrieves a pipeline run by ID
// Provide either Namespace (to discover DSPA) or BaseUrl (to use directly)
func (s *PipelinesService) GetPipelineRun(ctx context.Context, opts PipelineTargetOptions, runID string) (*PipelineRun, error) {
    s.Logger.Info("getting pipeline run", "run_id", runID)

    // Reuse the same helper for base URL resolution
    baseUrl, err := s.resolveBaseUrl(ctx, opts)
    if err != nil {
        return nil, err
    }

    run, err := s.Client.GetPipelineRun(ctx, baseUrl, runID)
    if err != nil {
        s.Logger.Error("failed to get pipeline run", "error", err)
        return nil, err
    }

    return run, nil
}
```

### Client Layer (autox-core)

```go
package pipelines

import (
    "context"
    "net/http"
)

// HttpClientInterface wraps http.Client for testing
type HttpClientInterface interface {
    Do(req *http.Request) (*http.Response, error)
}

// PipelinesClient implements Pipelines API operations
type PipelinesClient struct {
    HttpClient   HttpClientInterface
    GetAuthToken func(ctx context.Context) (string, error)
}

// PipelinesClientConfig for injectable constructor (testing)
type PipelinesClientConfig struct {
    GetAuthToken func(ctx context.Context) (string, error)
}

// DefaultPipelinesClientConfig for default constructor (production)
type DefaultPipelinesClientConfig struct {
    GetAuthToken func(ctx context.Context) (string, error)
    // Could have additional fields like timeout, retry config, etc.
}

// NewPipelinesClient creates a client with injectable HTTP client (for testing)
func NewPipelinesClient(cfg PipelinesClientConfig, httpClient HttpClientInterface) *PipelinesClient {
    return &PipelinesClient{
        HttpClient:   httpClient,
        GetAuthToken: cfg.GetAuthToken,
    }
}

// NewDefaultPipelinesClient creates a client with real HTTP client
func NewDefaultPipelinesClient(cfg DefaultPipelinesClientConfig) *PipelinesClient {
    transport := &http.Transport{
        // Transport configuration
    }

    // Wrap transport with token injection
    httpClient := &http.Client{
        Transport: &pipelinesRoundTripper{
            base:         transport,
            getAuthToken: cfg.GetAuthToken,
        },
    }

    return &PipelinesClient{
        HttpClient:   httpClient,
        GetAuthToken: cfg.GetAuthToken,
    }
}

func (c *PipelinesClient) CreatePipelineRun(ctx context.Context, baseUrl string, reqData *CreatePipelineRunRequest) (*PipelineRun, error) {
    url := fmt.Sprintf("%s/apis/v2beta1/runs", baseUrl)

    body, err := json.Marshal(reqData)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
    if err != nil {
        return nil, err
    }

    req.Header.Set("Content-Type", "application/json")

    resp, err := c.HttpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
    }

    var run PipelineRun
    err = json.NewDecoder(resp.Body).Decode(&run)
    if err != nil {
        return nil, err
    }

    return &run, nil
}

// pipelinesRoundTripper injects bearer token into requests
type pipelinesRoundTripper struct {
    base         http.RoundTripper
    getAuthToken func(ctx context.Context) (string, error)
}

func (t *pipelinesRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    token, err := t.getAuthToken(req.Context())
    if err != nil {
        return nil, err
    }
    req.Header.Set("Authorization", "Bearer "+token)
    return t.base.RoundTrip(req)
}
```

## S3 Integration

### App Wiring (AutoML/AutoRAG)

```go
package api

func NewApp(cfg *config.EnvConfig, logger *slog.Logger) (*App, error) {
    // Create S3 client
    s3Client := s3.NewDefaultS3Client(s3.DefaultS3ClientConfig{})

    // Create S3 service
    s3Service := s3.NewS3Service(s3.S3ServiceConfig{
        Logger: logger,
    }, s3Client)

    app := &App{
        s3Service: s3Service,
        logger:    logger,
    }

    return app, nil
}
```

### Handler Layer (AutoML/AutoRAG)

```go
package api

func (a *App) UploadS3FileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()

    var req s3.UploadFileRequest
    err := a.ReadJSON(w, r, &req)
    if err != nil {
        a.badRequestResponse(w, r, err)
        return
    }

    result, err := a.s3Service.UploadFile(ctx, &req)
    if err != nil {
        a.serverErrorResponse(w, r, err)
        return
    }

    err = a.WriteJSON(w, http.StatusOK, result, nil)
    if err != nil {
        a.serverErrorResponse(w, r, err)
    }
}
```

### Service Layer (autox-core)

```go
package s3

// S3ClientInterface defines the contract for S3 operations
type S3ClientInterface interface {
    UploadFile(ctx context.Context, req *UploadFileRequest) (*UploadFileResult, error)
    DownloadFile(ctx context.Context, req *DownloadFileRequest) (*DownloadFileResult, error)
    DeleteFile(ctx context.Context, req *DeleteFileRequest) error
}

// S3Service provides business logic for S3 operations
type S3Service struct {
    Client S3ClientInterface
    Logger *slog.Logger
}

type S3ServiceConfig struct {
    Logger *slog.Logger
}

func NewS3Service(cfg S3ServiceConfig, client S3ClientInterface) *S3Service {
    return &S3Service{
        Client: client,
        Logger: cfg.Logger,
    }
}

func (s *S3Service) UploadFile(ctx context.Context, req *UploadFileRequest) (*UploadFileResult, error) {
    s.Logger.Info("uploading file to S3", "bucket", req.Bucket, "key", req.Key)

    result, err := s.Client.UploadFile(ctx, req)
    if err != nil {
        s.Logger.Error("failed to upload file", "error", err)
        return nil, err
    }

    return result, nil
}
```

### Client Layer (autox-core)

```go
package s3

import (
    "context"
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/credentials"
    "github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "net/http"
)

// AwsS3ClientInterface wraps s3.Client for testing
type AwsS3ClientInterface interface {
    // S3 client methods
}

// AwsS3TransferManagerInterface wraps transfer manager for testing
type AwsS3TransferManagerInterface interface {
    Upload(ctx context.Context, input *s3.PutObjectInput, opts ...func(*manager.Uploader)) (*manager.UploadOutput, error)
}

// S3ClientFactory creates AWS S3 client and transfer manager
type S3ClientFactory func(creds *S3Credentials, region, endpoint string) (AwsS3ClientInterface, AwsS3TransferManagerInterface, error)

// S3Client implements S3 operations using AWS SDK
type S3Client struct {
    Factory S3ClientFactory
}

// S3ClientConfig for injectable constructor (testing)
type S3ClientConfig struct {
    // Minimal config for testing with mock factory
}

// DefaultS3ClientConfig for default constructor (production)
type DefaultS3ClientConfig struct {
    // Could have fields like default region, timeout, part size, etc.
}

// NewS3Client creates a client with injectable factory (for testing)
func NewS3Client(cfg S3ClientConfig, factory S3ClientFactory) *S3Client {
    return &S3Client{
        Factory: factory,
    }
}

// NewDefaultS3Client creates a client with real AWS SDK factory
func NewDefaultS3Client(cfg DefaultS3ClientConfig) *S3Client {
    factory := func(creds *S3Credentials, region, endpoint string) (AwsS3ClientInterface, AwsS3TransferManagerInterface, error) {
        awsConfig := aws.Config{
            Region: region,
            Credentials: credentials.NewStaticCredentialsProvider(
                creds.AccessKeyID,
                creds.SecretAccessKey,
                "",
            ),
        }

        // Clone default transport for custom configuration
        transport := cloneDefaultTransport()

        awsConfig.HTTPClient = &http.Client{
            Transport: transport,
        }

        // Create S3 client with custom endpoint
        s3Client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
            o.BaseEndpoint = aws.String(endpoint)
            o.UsePathStyle = true // For MinIO/S3-compatible services
        })

        // Create transfer manager for efficient uploads
        s3TransferManager := transfermanager.New(s3Client, func(o *transfermanager.Options) {
            o.Concurrency = cfg.Concurrency
            o.PartSizeBytes = cfg.PartSizeBytes
            o.GetObjectBufferSize = cfg.GetObjectBufSize
            o.PartBodyMaxRetries = cfg.PartBodyMaxRetries
            o.DisableChecksumValidation = false
        })

        return s3Client, s3TransferManager, nil
    }

    return &S3Client{
        Factory: factory,
    }
}

func (c *S3Client) UploadFile(ctx context.Context, req *UploadFileRequest) (*UploadFileResult, error) {
    // Create client and transfer manager with request credentials
    _, transferManager, err := c.Factory(req.Credentials, req.Region, req.Endpoint)
    if err != nil {
        return nil, err
    }

    // Upload file using transfer manager
    output, err := transferManager.UploadObject(ctx, &transfermanager.UploadObjectInput{
        Bucket:      aws.String(req.Bucket),
        Key:         aws.String(req.Key),
        Body:        req.Body,
        ContentType: aws.String(req.ContentType),
        IfNoneMatch: aws.String("*"),
    }, func(o *transfermanager.Options) {
        // Override default options if needed
        o.Concurrency = req.Concurrency
        o.PartSizeBytes = req.PartSizeBytes
    })
    if err != nil {
        return nil, err
    }

    return &UploadFileResult{
        Location: output.Location,
        ETag:     *output.ETag,
    }, nil
}

// cloneDefaultTransport creates a copy of http.DefaultTransport
func cloneDefaultTransport() *http.Transport {
    transport := http.DefaultTransport.(*http.Transport).Clone()
    transport.MaxIdleConns = 100
    transport.MaxIdleConnsPerHost = 100
    return transport
}
```

## Testing Patterns

The architecture enables testing at multiple levels of isolation using interfaces and dependency injection.

### Service Layer Testing

Test services in isolation by mocking client dependencies:

```go
package pipelines_test

func TestPipelinesService_CreatePipelineRun_WithNamespace(t *testing.T) {
    // Mock K8s client for DSPA discovery
    mockK8sClient := &mocks.MockK8sClient{
        GetReadyDSPAUrlFunc: func(ctx context.Context, namespace string) (string, error) {
            assert.Equal(t, "test-namespace", namespace)
            return "http://dspa-server:8080", nil
        },
    }

    // Mock Pipelines client for API calls
    mockPipelinesClient := &mocks.MockPipelinesClient{
        CreatePipelineRunFunc: func(ctx context.Context, baseUrl string, req *pipelines.CreatePipelineRunRequest) (*pipelines.PipelineRun, error) {
            // Verify the service resolved the correct base URL
            assert.Equal(t, "http://dspa-server:8080", baseUrl)
            assert.Equal(t, "pipeline-123", req.PipelineID)
            
            return &pipelines.PipelineRun{
                ID:         "run-123",
                PipelineID: req.PipelineID,
                Status:     "Running",
            }, nil
        },
    }

    // Create service with mocked dependencies
    service := pipelines.NewPipelinesService(pipelines.PipelinesServiceConfig{
        Logger: slog.Default(),
    }, mockPipelinesClient, mockK8sClient)

    // Test service orchestration logic
    run, err := service.CreatePipelineRun(context.Background(), pipelines.PipelineTargetOptions{
        Namespace: "test-namespace",
    }, &pipelines.CreatePipelineRunRequest{
        PipelineID: "pipeline-123",
    })

    assert.NoError(t, err)
    assert.Equal(t, "run-123", run.ID)
    assert.Equal(t, "Running", run.Status)
}

func TestPipelinesService_CreatePipelineRun_WithBaseUrl(t *testing.T) {
    // Mock only the Pipelines client (K8s client not needed for direct URL)
    mockPipelinesClient := &mocks.MockPipelinesClient{
        CreatePipelineRunFunc: func(ctx context.Context, baseUrl string, req *pipelines.CreatePipelineRunRequest) (*pipelines.PipelineRun, error) {
            assert.Equal(t, "http://custom-dspa:8080", baseUrl)
            return &pipelines.PipelineRun{
                ID:         "run-456",
                PipelineID: req.PipelineID,
                Status:     "Running",
            }, nil
        },
    }

    // Create service with only pipelines client (k8s client is nil)
    service := pipelines.NewPipelinesService(pipelines.PipelinesServiceConfig{
        Logger: slog.Default(),
    }, mockPipelinesClient, nil)

    // Test direct URL path (no DSPA discovery needed)
    run, err := service.CreatePipelineRun(context.Background(), pipelines.PipelineTargetOptions{
        BaseUrl: "http://custom-dspa:8080",
    }, &pipelines.CreatePipelineRunRequest{
        PipelineID: "pipeline-123",
    })

    assert.NoError(t, err)
    assert.Equal(t, "run-456", run.ID)
}

func TestPipelinesService_DiscoverReadyDSPA_Error(t *testing.T) {
    // Mock K8s client to return an error
    mockK8sClient := &mocks.MockK8sClient{
        GetReadyDSPAUrlFunc: func(ctx context.Context, namespace string) (string, error) {
            return "", errors.New("no ready DSPA found")
        },
    }

    mockPipelinesClient := &mocks.MockPipelinesClient{}

    service := pipelines.NewPipelinesService(pipelines.PipelinesServiceConfig{
        Logger: slog.Default(),
    }, mockPipelinesClient, mockK8sClient)

    // Test error handling when DSPA discovery fails
    _, err := service.CreatePipelineRun(context.Background(), pipelines.PipelineTargetOptions{
        Namespace: "test-namespace",
    }, &pipelines.CreatePipelineRunRequest{
        PipelineID: "pipeline-123",
    })

    assert.Error(t, err)
    assert.Contains(t, err.Error(), "failed to discover DSPA")
}
```

### Client Layer Testing

Test clients in isolation by mocking their dependencies (HTTP client, Kubernetes clientset, etc.):

```go
package pipelines_test

func TestPipelinesClient_CreatePipelineRun(t *testing.T) {
    // Mock HTTP client to verify request and return response
    mockHttpClient := &mocks.MockHttpClient{
        DoFunc: func(req *http.Request) (*http.Response, error) {
            // Verify request method and URL
            assert.Equal(t, http.MethodPost, req.Method)
            assert.Equal(t, "http://dspa:8080/apis/v2beta1/runs", req.URL.String())
            
            // Verify auth header was set
            assert.Equal(t, "Bearer test-token", req.Header.Get("Authorization"))
            
            // Verify request body
            var body pipelines.CreatePipelineRunRequest
            json.NewDecoder(req.Body).Decode(&body)
            assert.Equal(t, "pipeline-123", body.PipelineID)
            
            // Return mock response
            responseBody := `{"id":"run-123","pipeline_id":"pipeline-123","status":"Running"}`
            return &http.Response{
                StatusCode: http.StatusOK,
                Body:       io.NopCloser(strings.NewReader(responseBody)),
            }, nil
        },
    }

    // Create client with mocked HTTP client
    client := pipelines.NewPipelinesClient(pipelines.PipelinesClientConfig{
        GetAuthToken: func(ctx context.Context) (string, error) {
            return "test-token", nil
        },
    }, mockHttpClient)

    // Test client's HTTP request logic
    run, err := client.CreatePipelineRun(context.Background(), "http://dspa:8080", &pipelines.CreatePipelineRunRequest{
        PipelineID: "pipeline-123",
    })

    assert.NoError(t, err)
    assert.Equal(t, "run-123", run.ID)
    assert.Equal(t, "Running", run.Status)
}

func TestK8sTokenClient_GetNamespaces(t *testing.T) {
    // Mock Kubernetes clientset
    mockClientset := &mocks.MockClientset{
        CoreV1Func: func() v1.CoreV1Interface {
            return &mocks.MockCoreV1{
                NamespacesFunc: func() v1.NamespaceInterface {
                    return &mocks.MockNamespaceInterface{
                        ListFunc: func(ctx context.Context, opts metav1.ListOptions) (*corev1.NamespaceList, error) {
                            return &corev1.NamespaceList{
                                Items: []corev1.Namespace{
                                    {ObjectMeta: metav1.ObjectMeta{Name: "default"}},
                                    {ObjectMeta: metav1.ObjectMeta{Name: "kube-system"}},
                                },
                            }, nil
                        },
                    }
                },
            }
        },
    }

    // Create K8s client with mocked clientset
    client := k8s.NewK8sTokenClient(k8s.K8sTokenClientConfig{
        GetAuthToken: func(ctx context.Context) (string, error) {
            return "test-token", nil
        },
    }, mockClientset)

    // Test client's Kubernetes API interaction
    namespaces, err := client.GetNamespaces(context.Background(), &auth.RequestIdentity{
        UserID: "test-user",
    })

    assert.NoError(t, err)
    assert.Equal(t, []string{"default", "kube-system"}, namespaces)
}

func TestS3Client_UploadFile(t *testing.T) {
    // Mock S3 client factory
    mockFactory := func(creds *s3.S3Credentials, region, endpoint string) (s3.AwsS3ClientInterface, s3.AwsS3TransferManagerInterface, error) {
        // Verify credentials
        assert.Equal(t, "access-key", creds.AccessKeyID)
        assert.Equal(t, "secret-key", creds.SecretAccessKey)
        assert.Equal(t, "us-east-1", region)
        assert.Equal(t, "http://minio:9000", endpoint)
        
        // Return mock transfer manager
        mockTransferManager := &mocks.MockS3TransferManager{
            UploadObjectFunc: func(ctx context.Context, input *transfermanager.UploadObjectInput, opts ...func(*transfermanager.Options)) (*transfermanager.UploadOutput, error) {
                assert.Equal(t, "my-bucket", *input.Bucket)
                assert.Equal(t, "my-key", *input.Key)
                
                return &transfermanager.UploadOutput{
                    Location: "s3://my-bucket/my-key",
                    ETag:     aws.String("etag-123"),
                }, nil
            },
        }
        
        return nil, mockTransferManager, nil
    }

    // Create S3 client with mocked factory
    client := s3.NewS3Client(s3.S3ClientConfig{}, mockFactory)

    // Test client's S3 interaction
    result, err := client.UploadFile(context.Background(), &s3.UploadFileRequest{
        Credentials: &s3.S3Credentials{
            AccessKeyID:     "access-key",
            SecretAccessKey: "secret-key",
        },
        Region:   "us-east-1",
        Endpoint: "http://minio:9000",
        Bucket:   "my-bucket",
        Key:      "my-key",
        Body:     strings.NewReader("test content"),
    })

    assert.NoError(t, err)
    assert.Equal(t, "s3://my-bucket/my-key", result.Location)
    assert.Equal(t, "etag-123", result.ETag)
}
```

### Testing Benefits

This architecture provides several testing advantages:

1. **Service Layer Tests**:
   - Test business logic and orchestration in isolation
   - Mock external dependencies (clients)
   - Verify cross-client coordination (e.g., DSPA discovery + pipeline creation)
   - Fast execution (no external calls)

2. **Client Layer Tests**:
   - Test protocol implementation (HTTP, K8s API, S3 SDK)
   - Verify request formatting and response parsing
   - Test auth injection and error handling
   - Mock only the underlying transport/SDK

3. **Clear Test Boundaries**:
   - Each layer has well-defined responsibilities
   - Interfaces enable complete isolation
   - No need to mock multiple layers simultaneously
   - Easy to identify where bugs occur (service logic vs client implementation)

4. **Mock Reusability**:
   - Same mock implementations work across multiple test files
   - Standardized mock interfaces reduce boilerplate
   - Factory functions for common mock scenarios
```

### Mock Flag Support

For integration testing with real BFF but mocked external services:

```go
package main

func main() {
    var (
        mockK8sClient       = flag.Bool("mock-k8s-client", false, "Use mock Kubernetes client")
        mockPipelinesClient = flag.Bool("mock-pipelines-client", false, "Use mock Pipelines client")
        mockS3Client        = flag.Bool("mock-s3-client", false, "Use mock S3 client")
    )
    flag.Parse()

    // Create k8s client (real or mock)
    var k8sClient k8s.K8sClientInterface
    if *mockK8sClient {
        k8sClient = mocks.NewMockK8sClient()
    } else {
        k8sClient = k8s.NewDefaultK8sClient(k8s.DefaultK8sClientConfig{
            AuthMethod:   cfg.AuthMethod,
            GetAuthToken: getAuthTokenFromContext,
        })
    }

    // Create pipelines client (real or mock)
    var pipelinesClient pipelines.PipelinesClientInterface
    if *mockPipelinesClient {
        pipelinesClient = mocks.NewMockPipelinesClient()
    } else {
        pipelinesClient = pipelines.NewDefaultPipelinesClient(pipelines.DefaultPipelinesClientConfig{
            GetAuthToken: getAuthTokenFromContext,
        })
    }

    // Create pipelines service with both clients
    pipelinesService := pipelines.NewPipelinesService(pipelines.PipelinesServiceConfig{
        Logger: logger,
    }, pipelinesClient, k8sClient)

    // Similar for other clients...
}
```

## Key Design Principles

### 1. Dependency Injection
- All external dependencies are injected via constructors
- Enables unit testing without external services
- Supports both mock and production implementations

### 2. Interface-Based Design
- All clients implement interfaces (e.g., `K8sClientInterface`)
- Services depend on interfaces, not concrete types
- Facilitates testing and future implementation changes

### 3. Factory Pattern
- Default constructors create production-ready implementations
- Test constructors accept mock dependencies
- S3 client uses factory function for flexible AWS SDK initialization

### 4. Two-Tier Client Structure
- `NewDefaultXClient(DefaultXClientConfig)` - Production constructor creating real dependencies
- `NewXClient(XClientConfig, mockDeps)` - Constructor accepting mock dependencies for testing
- Config structs may differ between default and injectable constructors
- Consistent pattern across all integrations

### 5. Context Propagation
- All operations accept `context.Context` as first parameter
- Enables request cancellation and timeout handling
- Supports distributed tracing and request-scoped values

### 6. Error Handling
- Errors propagate up through layers
- Service layer adds logging and business context
- Handler layer converts to appropriate HTTP responses

### 7. Service Orchestration
- Services can depend on multiple clients when orchestration is needed
- Handlers should not orchestrate across multiple services
- Business logic and cross-service orchestration belongs in the service layer
- Example: PipelinesService depends on both PipelinesClient and K8sClient to discover DSPA before creating pipeline runs

## Common Patterns

### RoundTripper for Auth Injection

Token-based authentication uses `http.RoundTripper` to inject bearer tokens:

```go
type tokenRoundTripper struct {
    base         http.RoundTripper
    getAuthToken func(ctx context.Context) (string, error)
}

func (t *tokenRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    token, err := t.getAuthToken(req.Context())
    if err != nil {
        return nil, err
    }
    req.Header.Set("Authorization", "Bearer "+token)
    return t.base.RoundTrip(req)
}
```

This pattern:
- Keeps auth logic separate from business logic
- Works with any `http.Client`-based library
- Supports per-request token resolution from context

### Transport Cloning

When customizing HTTP transport, always clone the default:

```go
transport := http.DefaultTransport.(*http.Transport).Clone()
transport.MaxIdleConns = 100
transport.MaxIdleConnsPerHost = 100
```

This ensures you inherit sensible defaults while allowing customization.

## Future Extensibility

This architecture supports adding new integrations by following the same pattern:

1. Define client interface in autox-core
2. Implement service layer with business logic
3. Create client with:
   - Default constructor for production
   - Injectable constructor for testing
   - Factory pattern for complex initialization
4. Wire into app with dependency injection
5. Add mock flag support for integration testing

Example for a new integration:

```go
// 1. Interface
type FooClientInterface interface {
    DoFoo(ctx context.Context, req *FooRequest) (*FooResponse, error)
}

// 2. Service
type FooService struct {
    Client FooClientInterface
    Logger *slog.Logger
}

// 3. Client with two config types
type FooClientConfig struct {
    // Minimal config for testing
    Timeout time.Duration
}

type DefaultFooClientConfig struct {
    // Full config for production
    Timeout      time.Duration
    RetryPolicy  RetryPolicy
    GetAuthToken func(ctx context.Context) (string, error)
}

// Injectable constructor for testing
func NewFooClient(cfg FooClientConfig, httpClient HttpClientInterface) *FooClient {
    return &FooClient{
        HttpClient: httpClient,
        Timeout:    cfg.Timeout,
    }
}

// Default constructor for production
func NewDefaultFooClient(cfg DefaultFooClientConfig) *FooClient {
    httpClient := &http.Client{
        Timeout: cfg.Timeout,
        Transport: &authRoundTripper{
            getAuthToken: cfg.GetAuthToken,
        },
    }
    return &FooClient{
        HttpClient: httpClient,
        Timeout:    cfg.Timeout,
    }
}

// 4. App wiring
fooClient := foo.NewDefaultFooClient(foo.DefaultFooClientConfig{
    Timeout:      30 * time.Second,
    GetAuthToken: getAuthTokenFromContext,
})
fooService := foo.NewFooService(foo.FooServiceConfig{
    Logger: logger,
}, fooClient)
app := &App{fooService: fooService}
```
