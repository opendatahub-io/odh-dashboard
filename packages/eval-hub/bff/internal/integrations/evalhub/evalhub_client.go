package evalhub

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// ListEvaluationJobsParams holds optional query parameters for the list evaluations endpoint.
type ListEvaluationJobsParams struct {
	Namespace string
	Limit     string
	Offset    string
	Status    string
	Name      string
	Tags      string
}

// EvalHubClientInterface defines the operations available against the EvalHub API.
type EvalHubClientInterface interface {
	HealthCheck(ctx context.Context) (*HealthResponse, error)
	ListEvaluationJobs(ctx context.Context, params ListEvaluationJobsParams) ([]EvaluationJob, error)
	GetEvaluationJob(ctx context.Context, id string, namespace string) (*EvaluationJob, error)
	CreateEvaluationJob(ctx context.Context, namespace string, req CreateEvaluationJobRequest) (*EvaluationJob, error)
	CancelEvaluationJob(ctx context.Context, id string, namespace string, hardDelete bool) error
	ListCollections(ctx context.Context, namespace string) (CollectionsResponse, error)
	ListProviders(ctx context.Context, namespace string, limit, offset int) (ProvidersResponse, error)
}

// HealthResponse represents the eval-hub health check response.
type HealthResponse struct {
	Status string `json:"status"`
}

// EvaluationJobsResponse is the paginated response from the EvalHub API.
type EvaluationJobsResponse struct {
	Items      []EvaluationJob `json:"items"`
	TotalCount int             `json:"total_count"`
	Limit      int             `json:"limit"`
}

// EvaluationJob represents an evaluation job from eval-hub.
type EvaluationJob struct {
	Resource     JobResource      `json:"resource"`
	Status       JobStatus        `json:"status"`
	Results      JobResults       `json:"results"`
	Name         string           `json:"name,omitempty"`
	Description  string           `json:"description,omitempty"`
	Tags         []string         `json:"tags,omitempty"`
	Model        JobModel         `json:"model"`
	PassCriteria *JobPassCriteria `json:"pass_criteria,omitempty"`
	Benchmarks   []JobBenchmark   `json:"benchmarks,omitempty"`
	Collection   *JobCollectionID `json:"collection,omitempty"`
	Experiment   *JobExperiment   `json:"experiment,omitempty"`
	Custom       map[string]any   `json:"custom,omitempty"`
	Exports      *JobExports      `json:"exports,omitempty"`
}

type JobResource struct {
	ID                 string     `json:"id"`
	Tenant             string     `json:"tenant,omitempty"`
	CreatedAt          string     `json:"created_at,omitempty"`
	UpdatedAt          string     `json:"updated_at,omitempty"`
	ReadOnly           bool       `json:"read_only,omitempty"`
	Owner              string     `json:"owner,omitempty"`
	MlflowExperimentID string     `json:"mlflow_experiment_id,omitempty"`
	Message            JobMessage `json:"message,omitempty"`
}

type JobMessage struct {
	Message     string `json:"message,omitempty"`
	MessageCode string `json:"message_code,omitempty"`
}

type JobStatus struct {
	State      string           `json:"state"`
	Message    JobMessage       `json:"message,omitempty"`
	Benchmarks []BenchmarkState `json:"benchmarks,omitempty"`
}

type BenchmarkState struct {
	ID             string     `json:"id"`
	ProviderID     string     `json:"provider_id,omitempty"`
	BenchmarkIndex *int       `json:"benchmark_index,omitempty"`
	Status         string     `json:"status"`
	StartedAt      string     `json:"started_at,omitempty"`
	CompletedAt    string     `json:"completed_at,omitempty"`
	ErrorMessage   JobMessage `json:"error_message,omitempty"`
}

type JobResults struct {
	TotalEvaluations    int               `json:"total_evaluations"`
	Benchmarks          []BenchmarkResult `json:"benchmarks,omitempty"`
	MlflowExperimentURL string            `json:"mlflow_experiment_url,omitempty"`
	Test                *ResultTest       `json:"test,omitempty"`
}

type ResultTest struct {
	Score     *float64 `json:"score,omitempty"`
	Threshold *float64 `json:"threshold,omitempty"`
	Pass      *bool    `json:"pass,omitempty"`
}

type BenchmarkResultTest struct {
	PrimaryScore *float64 `json:"primary_score,omitempty"`
	Threshold    *float64 `json:"threshold,omitempty"`
	Pass         *bool    `json:"pass,omitempty"`
}

type BenchmarkResult struct {
	ID             string               `json:"id"`
	ProviderID     string               `json:"provider_id,omitempty"`
	BenchmarkIndex *int                 `json:"benchmark_index,omitempty"`
	Metrics        map[string]float64   `json:"metrics,omitempty"`
	Artifacts      *BenchmarkArtifact   `json:"artifacts,omitempty"`
	MlflowRunID    string               `json:"mlflow_run_id,omitempty"`
	LogsPath       string               `json:"logs_path,omitempty"`
	Test           *BenchmarkResultTest `json:"test,omitempty"`
}

type BenchmarkArtifact struct {
	OCIDigest    string `json:"oci_digest,omitempty"`
	OCIReference string `json:"oci_reference,omitempty"`
	SizeBytes    int64  `json:"size_bytes,omitempty"`
}

type JobModel struct {
	URL        string         `json:"url,omitempty"`
	Name       string         `json:"name"`
	Parameters map[string]any `json:"parameters,omitempty"`
	Auth       *ModelAuth     `json:"auth,omitempty"`
}

type ModelAuth struct {
	SecretRef string `json:"secret_ref,omitempty"`
}

type JobPrimaryScore struct {
	Metric        string `json:"metric"`
	LowerIsBetter bool   `json:"lower_is_better"`
}

type JobPassCriteria struct {
	Threshold float64 `json:"threshold"`
}

type S3DataRef struct {
	Bucket    string `json:"bucket,omitempty"`
	Key       string `json:"key,omitempty"`
	SecretRef string `json:"secret_ref,omitempty"`
}

type TestDataRef struct {
	S3 *S3DataRef `json:"s3,omitempty"`
}

type JobBenchmark struct {
	ID           string           `json:"id"`
	ProviderID   string           `json:"provider_id,omitempty"`
	Weight       float64          `json:"weight,omitempty"`
	PrimaryScore *JobPrimaryScore `json:"primary_score,omitempty"`
	PassCriteria *JobPassCriteria `json:"pass_criteria,omitempty"`
	Parameters   map[string]any   `json:"parameters,omitempty"`
	TestDataRef  *TestDataRef     `json:"test_data_ref,omitempty"`
}

// CollectionsResponse is the response from the EvalHub API.
type CollectionsResponse struct {
	Items []Collection `json:"items"`
}

// ProvidersResponse is the paginated response for the providers endpoint.
type ProvidersResponse struct {
	Items      []Provider `json:"items"`
	TotalCount int        `json:"total_count,omitempty"`
}

// ProviderEnvVar is a name/value environment variable pair used in runtime config.
type ProviderEnvVar struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// ProviderK8sRuntime holds Kubernetes-specific runtime configuration for a provider.
type ProviderK8sRuntime struct {
	Image         string           `json:"image,omitempty"`
	Entrypoint    []string         `json:"entrypoint,omitempty"`
	CPURequest    string           `json:"cpu_request,omitempty"`
	MemoryRequest string           `json:"memory_request,omitempty"`
	CPULimit      string           `json:"cpu_limit,omitempty"`
	MemoryLimit   string           `json:"memory_limit,omitempty"`
	Env           []ProviderEnvVar `json:"env,omitempty"`
}

// ProviderLocalRuntime holds local-execution runtime configuration for a provider.
type ProviderLocalRuntime struct {
	Command string           `json:"command,omitempty"`
	Env     []ProviderEnvVar `json:"env,omitempty"`
}

// ProviderRuntime describes how the provider executes benchmarks (k8s or local).
type ProviderRuntime struct {
	K8s   *ProviderK8sRuntime   `json:"k8s,omitempty"`
	Local *ProviderLocalRuntime `json:"local,omitempty"`
}

// Provider represents an evaluation provider from eval-hub.
type Provider struct {
	Resource    ProviderResource    `json:"resource"`
	Name        string              `json:"name"`
	Title       string              `json:"title,omitempty"`
	Description string              `json:"description,omitempty"`
	Tags        []string            `json:"tags,omitempty"`
	Runtime     *ProviderRuntime    `json:"runtime,omitempty"`
	Benchmarks  []ProviderBenchmark `json:"benchmarks,omitempty"`
}

// ProviderResource holds the resource metadata for a provider.
type ProviderResource struct {
	ID        string `json:"id"`
	Tenant    string `json:"tenant,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
	ReadOnly  bool   `json:"read_only,omitempty"`
	Owner     string `json:"owner,omitempty"`
}

// ProviderBenchmark represents an individual benchmark within a provider's catalogue.
// Fields match the official eval-hub API spec exactly.
type ProviderBenchmark struct {
	ID           string                         `json:"id"`
	Name         string                         `json:"name"`
	Description  string                         `json:"description,omitempty"`
	Category     string                         `json:"category,omitempty"`
	Metrics      []string                       `json:"metrics,omitempty"`
	Tags         []string                       `json:"tags,omitempty"`
	NumFewShot   int                            `json:"num_few_shot,omitempty"`
	DatasetSize  int                            `json:"dataset_size,omitempty"`
	PrimaryScore *ProviderBenchmarkScore        `json:"primary_score,omitempty"`
	PassCriteria *ProviderBenchmarkPassCriteria `json:"pass_criteria,omitempty"`
}

// ProviderBenchmarkScore defines the primary scoring metric for a provider benchmark.
type ProviderBenchmarkScore struct {
	Metric        string `json:"metric"`
	LowerIsBetter bool   `json:"lower_is_better"`
}

// ProviderBenchmarkPassCriteria defines the passing threshold for a provider benchmark.
type ProviderBenchmarkPassCriteria struct {
	Threshold float64 `json:"threshold"`
}

// Collection represents a benchmark collection from eval-hub.
type Collection struct {
	Resource     CollectionResource      `json:"resource"`
	Name         string                  `json:"name"`
	Description  string                  `json:"description,omitempty"`
	Tags         []string                `json:"tags,omitempty"`
	Custom       map[string]any          `json:"custom,omitempty"`
	PassCriteria *CollectionPassCriteria `json:"pass_criteria,omitempty"`
	Benchmarks   []CollectionBenchmark   `json:"benchmarks,omitempty"`
}

// CollectionResource holds the resource metadata for a collection.
type CollectionResource struct {
	ID        string `json:"id"`
	Tenant    string `json:"tenant,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
	ReadOnly  bool   `json:"read_only,omitempty"`
	Owner     string `json:"owner,omitempty"`
}

// CollectionBenchmark represents a BenchmarkConfig entry within a collection.
type CollectionBenchmark struct {
	ID           string                  `json:"id"`
	ProviderID   string                  `json:"provider_id,omitempty"`
	Weight       float64                 `json:"weight,omitempty"`
	PrimaryScore *CollectionPrimaryScore `json:"primary_score,omitempty"`
	PassCriteria *CollectionPassCriteria `json:"pass_criteria,omitempty"`
	Parameters   map[string]any          `json:"parameters,omitempty"`
}

// CollectionPrimaryScore defines the primary scoring metric for a benchmark.
type CollectionPrimaryScore struct {
	Metric        string `json:"metric"`
	LowerIsBetter bool   `json:"lower_is_better"`
}

// CollectionPassCriteria defines the passing threshold for a benchmark.
type CollectionPassCriteria struct {
	Threshold float64 `json:"threshold"`
}

// CreateEvaluationJobRequest is the payload sent to the EvalHub API to start a new evaluation run.
type CreateEvaluationJobRequest struct {
	Name         string           `json:"name"`
	Description  string           `json:"description,omitempty"`
	Tags         []string         `json:"tags,omitempty"`
	Model        JobModel         `json:"model"`
	PassCriteria *JobPassCriteria `json:"pass_criteria,omitempty"`
	Benchmarks   []JobBenchmark   `json:"benchmarks,omitempty"`
	Collection   *JobCollectionID `json:"collection,omitempty"`
	Experiment   *JobExperiment   `json:"experiment,omitempty"`
	Custom       map[string]any   `json:"custom,omitempty"`
	Exports      *JobExports      `json:"exports,omitempty"`
}

type JobCollectionID struct {
	ID         string         `json:"id"`
	Benchmarks []JobBenchmark `json:"benchmarks,omitempty"`
}

type JobExperiment struct {
	Name             string          `json:"name,omitempty"`
	Tags             []ExperimentTag `json:"tags,omitempty"`
	ArtifactLocation string          `json:"artifact_location,omitempty"`
}

type ExperimentTag struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type JobExports struct {
	OCI *OCIExport `json:"oci,omitempty"`
}

type OCIExport struct {
	Coordinates *OCICoordinates `json:"coordinates,omitempty"`
	K8s         *OCIK8s         `json:"k8s,omitempty"`
}

type OCICoordinates struct {
	OCIHost       string            `json:"oci_host,omitempty"`
	OCIRepository string            `json:"oci_repository,omitempty"`
	OCITag        string            `json:"oci_tag,omitempty"`
	OCISubject    string            `json:"oci_subject,omitempty"`
	Annotations   map[string]string `json:"annotations,omitempty"`
}

type OCIK8s struct {
	Connection string `json:"connection,omitempty"`
}

type EvalHubClient struct {
	httpClient *http.Client
	baseURL    string
	authToken  string
}

// NewEvalHubClient creates a new client configured for EvalHub.
func NewEvalHubClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) *EvalHubClient {
	tlsConfig := &tls.Config{InsecureSkipVerify: insecureSkipVerify}
	if rootCAs != nil {
		tlsConfig.RootCAs = rootCAs
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
		Timeout: 2 * time.Minute,
	}

	return &EvalHubClient{
		httpClient: httpClient,
		baseURL:    baseURL + apiPath,
		authToken:  authToken,
	}
}

// HealthCheck retrieves the health status from EvalHub.
func (c *EvalHubClient) HealthCheck(ctx context.Context) (*HealthResponse, error) {
	resp, err := get[HealthResponse](c, ctx, "/health", nil)
	if err != nil {
		return nil, wrapClientError(err, "HealthCheck")
	}
	return resp, nil
}

// ListEvaluationJobs retrieves evaluation jobs from EvalHub, forwarding any query filters.
// The namespace is sent as the X-Tenant header rather than a query parameter.
func (c *EvalHubClient) ListEvaluationJobs(ctx context.Context, params ListEvaluationJobsParams) ([]EvaluationJob, error) {
	qp := url.Values{}
	if params.Limit != "" {
		qp.Set("limit", params.Limit)
	}
	if params.Offset != "" {
		qp.Set("offset", params.Offset)
	}
	if params.Status != "" {
		qp.Set("status", params.Status)
	}
	if params.Name != "" {
		qp.Set("name", params.Name)
	}
	if params.Tags != "" {
		qp.Set("tags", params.Tags)
	}

	path := "/evaluations/jobs"
	if encoded := qp.Encode(); encoded != "" {
		path = fmt.Sprintf("%s?%s", path, encoded)
	}

	headers, err := tenantHeaders(params.Namespace)
	if err != nil {
		return nil, err
	}

	resp, err := get[EvaluationJobsResponse](c, ctx, path, headers)
	if err != nil {
		return nil, wrapClientError(err, "ListEvaluationJobs")
	}
	return resp.Items, nil
}

// GetEvaluationJob retrieves a single evaluation job by ID.
// The namespace is sent as the X-Tenant header to scope the request to the caller's tenant.
func (c *EvalHubClient) GetEvaluationJob(ctx context.Context, id string, namespace string) (*EvaluationJob, error) {
	path := fmt.Sprintf("/evaluations/jobs/%s", url.PathEscape(id))

	headers, err := tenantHeaders(namespace)
	if err != nil {
		return nil, err
	}

	resp, err := get[EvaluationJob](c, ctx, path, headers)
	if err != nil {
		return nil, wrapClientError(err, "GetEvaluationJob")
	}
	return resp, nil
}

// CancelEvaluationJob cancels or permanently deletes an evaluation job.
// When hardDelete is false the upstream API cancels a running job.
// When hardDelete is true the job is permanently removed.
// The namespace is sent as the X-Tenant header rather than a query parameter.
func (c *EvalHubClient) CancelEvaluationJob(ctx context.Context, id string, namespace string, hardDelete bool) error {
	path := fmt.Sprintf("/evaluations/jobs/%s", url.PathEscape(id))
	if hardDelete {
		path += "?hard_delete=true"
	}

	headers, err := tenantHeaders(namespace)
	if err != nil {
		return err
	}

	if err := doRequest(c, ctx, http.MethodDelete, path, headers); err != nil {
		return wrapClientError(err, "CancelEvaluationJob")
	}
	return nil
}

// CreateEvaluationJob submits a new evaluation run to the EvalHub API.
// The namespace is sent as the X-Tenant header rather than a query parameter.
func (c *EvalHubClient) CreateEvaluationJob(ctx context.Context, namespace string, req CreateEvaluationJobRequest) (*EvaluationJob, error) {
	path := "/evaluations/jobs"

	headers, err := tenantHeaders(namespace)
	if err != nil {
		return nil, err
	}

	resp, err := post[EvaluationJob](c, ctx, path, req, headers)
	if err != nil {
		return nil, wrapClientError(err, "CreateEvaluationJob")
	}
	return resp, nil
}

// ListCollections retrieves all benchmark collections from EvalHub.
// The namespace is sent as the X-Tenant header.
func (c *EvalHubClient) ListCollections(ctx context.Context, namespace string) (CollectionsResponse, error) {
	headers, err := tenantHeaders(namespace)
	if err != nil {
		return CollectionsResponse{Items: []Collection{}}, err
	}
	resp, err := get[CollectionsResponse](c, ctx, "/evaluations/collections", headers)
	if err != nil {
		return CollectionsResponse{Items: []Collection{}}, wrapClientError(err, "ListCollections")
	}
	if resp.Items == nil {
		resp.Items = []Collection{}
	}
	return *resp, nil
}

// ListProviders retrieves all evaluation providers with their benchmark catalogues from EvalHub.
// limit controls page size (1-100); offset controls pagination start index.
// Passing 0 for both uses the upstream defaults (limit=50, offset=0).
// The namespace is sent as the X-Tenant header.
func (c *EvalHubClient) ListProviders(ctx context.Context, namespace string, limit, offset int) (ProvidersResponse, error) {
	path := "/evaluations/providers"
	if limit > 0 || offset > 0 {
		path = fmt.Sprintf("%s?limit=%d&offset=%d", path, limit, offset)
	}
	headers, err := tenantHeaders(namespace)
	if err != nil {
		return ProvidersResponse{}, err
	}
	resp, err := get[ProvidersResponse](c, ctx, path, headers)
	if err != nil {
		return ProvidersResponse{}, wrapClientError(err, "ListProviders")
	}
	return *resp, nil
}

// tenantHeaders builds the X-Tenant header map required for tenant-scoped upstream
// calls. It returns an error when namespace is empty so that callers fail closed
// instead of silently promoting a scoped BFF request into an unscoped service-
// credential call (CWE-284).
func tenantHeaders(namespace string) (map[string]string, error) {
	if namespace == "" {
		return nil, NewInvalidRequestError("namespace is required for tenant-scoped requests")
	}
	return map[string]string{"X-Tenant": namespace}, nil
}

// get performs a typed GET request against the EvalHub API, using the same
// HTTP client and TLS configuration that the openai.Client was initialised with.
// extraHeaders is an optional map of additional HTTP headers to include in the request.
func get[T any](c *EvalHubClient, ctx context.Context, path string, extraHeaders map[string]string) (*T, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}
	for k, v := range extraHeaders {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &httpError{
			StatusCode: resp.StatusCode,
			Body:       string(body),
		}
	}

	var result T
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// post performs a typed POST request against the EvalHub API.
// extraHeaders is an optional map of additional HTTP headers to include in the request.
func post[T any](c *EvalHubClient, ctx context.Context, path string, body any, extraHeaders map[string]string) (*T, error) {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}
	for k, v := range extraHeaders {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &httpError{
			StatusCode: resp.StatusCode,
			Body:       string(respBody),
		}
	}

	var result T
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// doRequest performs an HTTP request that does not return a typed body (e.g. DELETE).
// extraHeaders is an optional map of additional HTTP headers to include in the request.
func doRequest(c *EvalHubClient, ctx context.Context, method, path string, extraHeaders map[string]string) error {
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}
	for k, v := range extraHeaders {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &httpError{
			StatusCode: resp.StatusCode,
			Body:       string(body),
		}
	}
	return nil
}
