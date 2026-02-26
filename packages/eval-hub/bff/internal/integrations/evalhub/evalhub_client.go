package evalhub

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/openai/openai-go/v2"
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
	Resource   JobResource    `json:"resource"`
	Status     JobStatus      `json:"status"`
	Results    JobResults     `json:"results"`
	Model      JobModel       `json:"model"`
	Benchmarks []JobBenchmark `json:"benchmarks"`
}

type JobResource struct {
	ID        string     `json:"id"`
	Tenant    string     `json:"tenant,omitempty"`
	CreatedAt string     `json:"created_at,omitempty"`
	UpdatedAt string     `json:"updated_at,omitempty"`
	Message   JobMessage `json:"message,omitempty"`
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
	ID           string     `json:"id"`
	ProviderID   string     `json:"provider_id,omitempty"`
	Status       string     `json:"status"`
	CompletedAt  string     `json:"completed_at,omitempty"`
	ErrorMessage JobMessage `json:"error_message,omitempty"`
}

type JobResults struct {
	TotalEvaluations int               `json:"total_evaluations"`
	Benchmarks       []BenchmarkResult `json:"benchmarks,omitempty"`
}

type BenchmarkResult struct {
	ID         string             `json:"id"`
	ProviderID string             `json:"provider_id,omitempty"`
	Metrics    map[string]float64 `json:"metrics,omitempty"`
	Artifacts  *BenchmarkArtifact `json:"artifacts,omitempty"`
}

type BenchmarkArtifact struct {
	OCIDigest    string `json:"oci_digest,omitempty"`
	OCIReference string `json:"oci_reference,omitempty"`
	SizeBytes    int64  `json:"size_bytes,omitempty"`
}

type JobModel struct {
	URL  string `json:"url,omitempty"`
	Name string `json:"name"`
}

type JobBenchmark struct {
	ID         string         `json:"id"`
	ProviderID string         `json:"provider_id,omitempty"`
	Parameters map[string]any `json:"parameters,omitempty"`
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
	resp, err := get[HealthResponse](c, ctx, "/health")
	if err != nil {
		return nil, wrapClientError(err, "HealthCheck")
	}
	return resp, nil
}

// ListEvaluationJobs retrieves evaluation jobs from EvalHub, forwarding any query filters.
func (c *EvalHubClient) ListEvaluationJobs(ctx context.Context, params ListEvaluationJobsParams) ([]EvaluationJob, error) {
	qp := url.Values{}
	if params.Namespace != "" {
		qp.Set("namespace", params.Namespace)
	}
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

	resp, err := get[EvaluationJobsResponse](c, ctx, path)
	if err != nil {
		return nil, wrapClientError(err, "ListEvaluationJobs")
	}
	return resp.Items, nil
}

// get performs a typed GET request against the EvalHub API, using the same
// HTTP client and TLS configuration that the openai.Client was initialised with.
func get[T any](c *EvalHubClient, ctx context.Context, path string) (*T, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
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
		return nil, &openai.Error{
			StatusCode: resp.StatusCode,
			Message:    string(body),
		}
	}

	var result T
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}
