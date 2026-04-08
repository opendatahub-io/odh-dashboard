package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	s3int "github.com/opendatahub-io/autorag-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/s3/s3mocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

// failingS3Client always returns an error for GetObject and ListObjects.
type failingS3Client struct {
	s3mocks.MockS3Client
}

func (f *failingS3Client) GetObject(_ context.Context, _, _ string) (io.ReadCloser, string, error) {
	return nil, "", fmt.Errorf("connection refused")
}

func (f *failingS3Client) ListObjects(_ context.Context, _ string, _ s3int.ListObjectsOptions) (*models.S3ListObjectsResponse, error) {
	return nil, fmt.Errorf("S3 connection timeout")
}

// noSuchBucketS3Client returns a NoSuchBucket error from ListObjects.
type noSuchBucketS3Client struct {
	s3mocks.MockS3Client
}

func (n *noSuchBucketS3Client) ListObjects(_ context.Context, _ string, _ s3int.ListObjectsOptions) (*models.S3ListObjectsResponse, error) {
	return nil, &s3types.NoSuchBucket{Message: aws.String("The specified bucket does not exist")}
}

// accessDeniedError implements the ErrorCode() string interface that the handler checks for.
type accessDeniedError struct{}

func (e *accessDeniedError) Error() string        { return "Access Denied" }
func (e *accessDeniedError) ErrorCode() string    { return "AccessDenied" }
func (e *accessDeniedError) ErrorMessage() string { return "Access Denied" }

// accessDeniedS3Client returns an AccessDenied error from ListObjects.
type accessDeniedS3Client struct {
	s3mocks.MockS3Client
}

func (a *accessDeniedS3Client) ListObjects(_ context.Context, _ string, _ s3int.ListObjectsOptions) (*models.S3ListObjectsResponse, error) {
	return nil, &accessDeniedError{}
}

type keyCollisionS3Client struct {
	s3mocks.MockS3Client
	existingKeys map[string]bool
	uploadedKey  string
}

func newKeyCollisionS3Client(existingKeys ...string) *keyCollisionS3Client {
	existing := make(map[string]bool, len(existingKeys))
	for _, key := range existingKeys {
		existing[key] = true
	}
	return &keyCollisionS3Client{existingKeys: existing}
}

func (c *keyCollisionS3Client) ObjectExists(_ context.Context, _ string, key string) (bool, error) {
	return c.existingKeys[key], nil
}

func (c *keyCollisionS3Client) UploadObject(_ context.Context, _ string, key string, body io.Reader, _ string) error {
	if c.existingKeys[key] {
		return s3int.ErrObjectAlreadyExists
	}
	c.uploadedKey = key
	c.existingKeys[key] = true
	_, err := io.Copy(io.Discard, body)
	return err
}

// s3HandlerTestAppOptions configures test-only App fields (e.g. PostS3FileHandler upload caps).
type s3HandlerTestAppOptions struct {
	S3PostMaxFilePartBytes     int64
	S3PostMaxRequestBodyBytes  int64
	S3PostMaxCollisionAttempts int
}

// newS3HandlerTestApp creates a lightweight App wired with K8s and S3 mock factories,
// for testing S3 handler logic in isolation.
func newS3HandlerTestApp(
	k8Factory kubernetes.KubernetesClientFactory,
	s3Factory s3int.S3ClientFactory,
	opts *s3HandlerTestAppOptions,
) *App {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
		logger:                  logger,
		kubernetesClientFactory: k8Factory,
		s3ClientFactory:         s3Factory,
		repositories:            repositories.NewRepositories(logger),
	}
	if opts != nil {
		app.s3PostMaxFilePartBytes = opts.S3PostMaxFilePartBytes
		app.s3PostMaxRequestBodyBytes = opts.S3PostMaxRequestBodyBytes
		app.s3PostMaxCollisionAttempts = opts.S3PostMaxCollisionAttempts
	}
	return app
}

// setupS3ApiTest creates an App with both K8s and S3 mocks, sends a request through the full
// middleware chain (Routes), and returns the raw response recorder.
func setupS3ApiTest(
	method, requestURL string,
	k8Factory kubernetes.KubernetesClientFactory,
	s3Factory s3int.S3ClientFactory,
	identity *kubernetes.RequestIdentity,
) *httptest.ResponseRecorder {
	return setupS3ApiTestWithBody(method, requestURL, http.NoBody, "", k8Factory, s3Factory, identity, nil, nil)
}

// setupS3ApiTestWithBody is like setupS3ApiTest but accepts a request body and Content-Type (e.g.
// multipart/form-data). mutateReq can adjust the built request (e.g. force chunked encoding).
func setupS3ApiTestWithBody(
	method, requestURL string,
	body io.Reader,
	contentType string,
	k8Factory kubernetes.KubernetesClientFactory,
	s3Factory s3int.S3ClientFactory,
	identity *kubernetes.RequestIdentity,
	opts *s3HandlerTestAppOptions,
	mutateReq func(*http.Request),
) *httptest.ResponseRecorder {
	req, err := http.NewRequest(method, requestURL, body)
	if err != nil {
		panic(err)
	}
	if identity != nil && identity.UserID != "" {
		req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if mutateReq != nil {
		mutateReq(req)
	}

	app := newS3HandlerTestApp(k8Factory, s3Factory, opts)

	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	return rr
}

func TestGetS3FileHandler_MissingNamespace(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_MissingSecretName(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_MissingBucket(t *testing.T) {
	// Secret without AWS_S3_BUCKET, and no bucket query param provided
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				// No AWS_S3_BUCKET
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_MissingKey(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_WhitespaceOnlyKey(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	path := "/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=" + url.QueryEscape("   ")
	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		path,
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_SecretNotFound(t *testing.T) {
	// Mock client returns empty secrets list
	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=non-existent-secret&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetS3FileHandler_SecretMissingRequiredFields(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID": []byte("AKIAIOSFODNN7EXAMPLE"),
				// Missing AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_S3_ENDPOINT
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=incomplete-secret&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_NamespaceNotFound(t *testing.T) {
	// Create a Kubernetes NotFound error
	notFoundErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "namespaces \"non-existent\" not found",
			Reason:  metav1.StatusReasonNotFound,
			Code:    http.StatusNotFound,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{err: notFoundErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=non-existent&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetS3FileHandler_ForbiddenError(t *testing.T) {
	// Create a Kubernetes Forbidden error
	forbiddenErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "forbidden: User cannot list secrets in namespace \"restricted\"",
			Reason:  metav1.StatusReasonForbidden,
			Code:    http.StatusForbidden,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{err: forbiddenErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=restricted&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, res.StatusCode)
}

func TestGetS3FileHandler_UnauthorizedError(t *testing.T) {
	// Create a Kubernetes Unauthorized error
	unauthorizedErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "unauthorized: User authentication failed",
			Reason:  metav1.StatusReasonUnauthorized,
			Code:    http.StatusUnauthorized,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{err: unauthorizedErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=restricted&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, res.StatusCode)
}

func TestGetS3FileHandler_CaseInsensitiveCredentials(t *testing.T) {
	// Test that credentials with different cases are handled correctly
	testCases := []struct {
		name   string
		secret corev1.Secret
	}{
		{
			name: "Uppercase keys",
			secret: corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "aws-secret-uppercase",
					Namespace: "test-namespace",
					UID:       types.UID("uid-upper"),
				},
				Data: map[string][]byte{
					"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
					"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
					"AWS_DEFAULT_REGION":    []byte("us-east-1"),
					"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
					"AWS_S3_BUCKET":         []byte("test-bucket"),
				},
			},
		},
		{
			name: "Lowercase keys",
			secret: corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "aws-secret-lowercase",
					Namespace: "test-namespace",
					UID:       types.UID("uid-lower"),
				},
				Data: map[string][]byte{
					"aws_access_key_id":     []byte("AKIAIOSFODNN7EXAMPLE"),
					"aws_secret_access_key": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
					"aws_default_region":    []byte("us-east-1"),
					"aws_s3_endpoint":       []byte("https://s3.amazonaws.com"),
					"aws_s3_bucket":         []byte("test-bucket"),
				},
			},
		},
		{
			name: "Mixed case keys",
			secret: corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "aws-secret-mixed",
					Namespace: "test-namespace",
					UID:       types.UID("uid-mixed"),
				},
				Data: map[string][]byte{
					"Aws_Access_Key_Id":     []byte("AKIAIOSFODNN7EXAMPLE"),
					"Aws_Secret_Access_Key": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
					"Aws_Default_Region":    []byte("us-east-1"),
					"Aws_S3_Endpoint":       []byte("https://s3.amazonaws.com"),
					"Aws_S3_Bucket":         []byte("test-bucket"),
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{tc.secret}}
			factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
			identity := &kubernetes.RequestIdentity{UserID: "test-user"}

			// Since we can't easily mock S3, just test that we get credentials properly
			// The actual S3 call would fail, but we can verify credentials extraction works
			s3Repo := repositories.NewS3Repository()
			client, _ := factory.GetClient(context.Background())

			creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", tc.secret.Name, identity)

			assert.NoError(t, err)
			assert.NotNil(t, creds)
			assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
			assert.Equal(t, "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", creds.SecretAccessKey)
			assert.Equal(t, "us-east-1", creds.Region)
			assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
			assert.Equal(t, "test-bucket", creds.Bucket)
		})
	}
}

func TestGetS3FilesHandler_MissingNamespace(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("secretName", "aws-secret-1")
	params.Set("bucket", "my-bucket")
	params.Set("path", "some-path")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	body, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		uri.String(),
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	assert.Contains(t, body.Error.Message, "namespace")
}

func TestGetS3FilesHandler_MissingSecretName(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("namespace", "test-namespace")
	params.Set("bucket", "my-bucket")
	params.Set("path", "some-path")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	body, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		uri.String(),
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	assert.Contains(t, body.Error.Message, "secretName")
}

func TestGetS3FilesHandler_MissingBucket(t *testing.T) {
	// No bucket query param, and secret has no AWS_S3_BUCKET — should 400 from handler fallback
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				// No AWS_S3_BUCKET
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("namespace", "test-namespace")
	params.Set("secretName", "aws-secret-1")
	params.Set("path", "some-path")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	body, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		uri.String(),
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	assert.Contains(t, body.Error.Message, "bucket")
}

func TestGetS3FilesHandler_EmptyPath(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("namespace", "test-namespace")
	params.Set("secretName", "aws-secret-1")
	params.Set("bucket", "my-bucket")
	params.Set("path", "")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	body, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		uri.String(),
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	assert.Contains(t, body.Error.Message, "path")
}

func TestGetS3FilesHandler_InvalidSearch(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("namespace", "test-namespace")
	params.Set("secretName", "aws-secret-1")
	params.Set("bucket", "my-bucket")
	params.Set("path", "some-path")
	params.Set("search", "invalid/search")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	body, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		uri.String(),
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	assert.Contains(t, body.Error.Message, "search")
}

func TestGetS3FilesHandler_InvalidNext(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("namespace", "test-namespace")
	params.Set("secretName", "aws-secret-1")
	params.Set("bucket", "my-bucket")
	params.Set("path", "some-path")
	params.Set("next", "")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	body, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		uri.String(),
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	assert.Contains(t, body.Error.Message, "next")
}

func TestGetS3FilesHandler_InvalidLimit(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	testCases := []struct {
		name  string
		limit string
	}{
		{name: "Zero", limit: "0"},
		{name: "Negative", limit: "-1"},
		{name: "Over max", limit: "1001"},
		{name: "Non-numeric", limit: "abc"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			params := url.Values{}
			params.Set("namespace", "test-namespace")
			params.Set("secretName", "aws-secret-1")
			params.Set("bucket", "my-bucket")
			params.Set("path", "some-path")
			params.Set("limit", tc.limit)
			uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

			body, res, err := setupApiTest[ErrorEnvelope](
				"GET",
				uri.String(),
				nil,
				factory,
				identity,
			)

			assert.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, res.StatusCode)
			assert.Contains(t, body.Error.Message, "limit")
		})
	}
}

// --- Tests verifying the S3 SDK is called correctly ---

func validS3Secret(name, namespace string) corev1.Secret {
	return corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			UID:       types.UID("uid-valid"),
		},
		Data: map[string][]byte{
			"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
			"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
			"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			"AWS_S3_BUCKET":         []byte("secret-bucket"),
		},
	}
}

func TestGetS3FileHandler_Success(t *testing.T) {
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	s3Factory := s3mocks.NewMockClientFactory()
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	t.Run("should stream file content with correct bucket and key", func(t *testing.T) {
		rr := setupS3ApiTest(
			"GET",
			"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=docs/file.pdf",
			k8sFactory, s3Factory, identity,
		)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "text/plain", rr.Header().Get("Content-Type"))
		// MockS3Client embeds bucket/key in the response body
		assert.Contains(t, rr.Body.String(), "s3://my-bucket/docs/file.pdf")
	})

	t.Run("should fall back to bucket from secret when no query param", func(t *testing.T) {
		rr := setupS3ApiTest(
			"GET",
			"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&key=file.pdf",
			k8sFactory, s3Factory, identity,
		)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "s3://secret-bucket/file.pdf")
	})

	t.Run("should use query bucket over secret bucket", func(t *testing.T) {
		rr := setupS3ApiTest(
			"GET",
			"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=override-bucket&key=file.pdf",
			k8sFactory, s3Factory, identity,
		)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "s3://override-bucket/file.pdf")
	})
}

func TestGetS3FileHandler_S3Error(t *testing.T) {
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&failingS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTest(
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		k8sFactory, s3Factory, identity,
	)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetS3FilesHandler_Success(t *testing.T) {
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	s3Factory := s3mocks.NewMockClientFactory()
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	t.Run("should return listing for root path", func(t *testing.T) {
		params := url.Values{}
		params.Set("namespace", "test-namespace")
		params.Set("secretName", "aws-secret-1")
		params.Set("bucket", "my-bucket")
		uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

		rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var envelope S3FilesEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &envelope)
		body := envelope.Data
		assert.NoError(t, err)
		assert.Equal(t, "my-bucket", body.Name)
		assert.Equal(t, "/", body.Delimiter)
		assert.Len(t, body.CommonPrefixes, 3)
		assert.Equal(t, "datasets/", body.CommonPrefixes[0].Prefix)
		assert.Equal(t, "results/", body.CommonPrefixes[1].Prefix)
		assert.Equal(t, "configs/", body.CommonPrefixes[2].Prefix)
		assert.Len(t, body.Contents, 2)
		assert.Equal(t, "README.md", body.Contents[0].Key)
		assert.Equal(t, "config.yaml", body.Contents[1].Key)
	})

	t.Run("should return objects for known path", func(t *testing.T) {
		params := url.Values{}
		params.Set("namespace", "test-namespace")
		params.Set("secretName", "aws-secret-1")
		params.Set("bucket", "my-bucket")
		params.Set("path", "datasets")
		uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

		rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

		assert.Equal(t, http.StatusOK, rr.Code)

		var envelope S3FilesEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &envelope)
		body := envelope.Data
		assert.NoError(t, err)
		assert.Equal(t, "my-bucket", body.Name)
		// MockS3Client returns known objects for the "datasets/" path
		assert.NotEmpty(t, body.Contents)
		assert.NotEmpty(t, body.CommonPrefixes)
	})

	t.Run("should fall back to bucket from secret", func(t *testing.T) {
		params := url.Values{}
		params.Set("namespace", "test-namespace")
		params.Set("secretName", "aws-secret-1")
		// No bucket — should use "secret-bucket" from the secret
		params.Set("path", "datasets")
		uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

		rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

		assert.Equal(t, http.StatusOK, rr.Code)

		var envelope S3FilesEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &envelope)
		body := envelope.Data
		assert.NoError(t, err)
		assert.Equal(t, "secret-bucket", body.Name)
	})

	t.Run("should respect limit parameter", func(t *testing.T) {
		params := url.Values{}
		params.Set("namespace", "test-namespace")
		params.Set("secretName", "aws-secret-1")
		params.Set("bucket", "my-bucket")
		params.Set("path", "results")
		params.Set("limit", "2")
		uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

		rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

		assert.Equal(t, http.StatusOK, rr.Code)

		var envelope S3FilesEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &envelope)
		body := envelope.Data
		assert.NoError(t, err)
		assert.Equal(t, int32(2), body.MaxKeys)
		// MockS3Client has 4 results objects, so limit=2 should truncate
		assert.True(t, body.IsTruncated)
	})

	t.Run("should default limit to 1000", func(t *testing.T) {
		params := url.Values{}
		params.Set("namespace", "test-namespace")
		params.Set("secretName", "aws-secret-1")
		params.Set("bucket", "my-bucket")
		params.Set("path", "datasets")
		uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

		rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

		assert.Equal(t, http.StatusOK, rr.Code)

		var envelope S3FilesEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &envelope)
		body := envelope.Data
		assert.NoError(t, err)
		assert.Equal(t, int32(1000), body.MaxKeys)
	})

	t.Run("should pass search filter to S3 mock", func(t *testing.T) {
		params := url.Values{}
		params.Set("namespace", "test-namespace")
		params.Set("secretName", "aws-secret-1")
		params.Set("bucket", "my-bucket")
		params.Set("path", "results")
		params.Set("search", "run-001")
		uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

		rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

		assert.Equal(t, http.StatusOK, rr.Code)

		var envelope S3FilesEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &envelope)
		body := envelope.Data
		assert.NoError(t, err)
		// MockS3Client filters by prefix; "results/run-001" matches one object
		assert.Len(t, body.Contents, 1)
		assert.Contains(t, body.Contents[0].Key, "run-001")
	})
}

func TestGetS3FilesHandler_NoSuchBucket(t *testing.T) {
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&noSuchBucketS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("namespace", "test-namespace")
	params.Set("secretName", "aws-secret-1")
	params.Set("bucket", "non-existent-bucket")
	params.Set("path", "data")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

	assert.Equal(t, http.StatusNotFound, rr.Code)

	var envelope ErrorEnvelope
	err := json.Unmarshal(rr.Body.Bytes(), &envelope)
	assert.NoError(t, err)
	assert.Contains(t, envelope.Error.Message, "does not exist")
}

func TestGetS3FilesHandler_AccessDenied(t *testing.T) {
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&accessDeniedS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("namespace", "test-namespace")
	params.Set("secretName", "aws-secret-1")
	params.Set("bucket", "restricted-bucket")
	params.Set("path", "data")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

	assert.Equal(t, http.StatusForbidden, rr.Code)

	var envelope ErrorEnvelope
	err := json.Unmarshal(rr.Body.Bytes(), &envelope)
	assert.NoError(t, err)
	assert.Contains(t, envelope.Error.Message, "access denied")
}

func TestGetS3FilesHandler_S3Error(t *testing.T) {
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&failingS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	params := url.Values{}
	params.Set("namespace", "test-namespace")
	params.Set("secretName", "aws-secret-1")
	params.Set("bucket", "my-bucket")
	params.Set("path", "data")
	uri := url.URL{Path: "/api/v1/s3/files", RawQuery: params.Encode()}

	rr := setupS3ApiTest("GET", uri.String(), k8sFactory, s3Factory, identity)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// --- PostS3FileHandler tests ---

func TestPostS3FileHandler_MissingNamespace(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/file?secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		[]byte("test"),
		"file.pdf",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_MissingSecretName(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/file?namespace=test-namespace&bucket=my-bucket&key=file.pdf",
		[]byte("test"),
		"file.pdf",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_MissingBucket(t *testing.T) {
	// Secret without AWS_S3_BUCKET, and no bucket query param -> 400
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				// No AWS_S3_BUCKET
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&key=file.pdf",
		[]byte("test"),
		"file.pdf",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_MissingKey(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		[]byte("test"),
		"file.pdf",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_WhitespaceOnlyKey(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	path := "/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=" + url.QueryEscape("   ")
	res, err := setupApiTestPostMultipart(
		path,
		[]byte("test"),
		"file.pdf",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_SecretNotFound(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/file?namespace=test-namespace&secretName=non-existent&bucket=my-bucket&key=file.pdf",
		[]byte("test"),
		"file.pdf",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestPostS3FileHandler_NoFilePart(t *testing.T) {
	// POST with JSON body instead of multipart -> MultipartReader fails -> 400
	// Use mock with valid secret so handler gets past credential check and fails on body.
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com")},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"POST",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		map[string]string{},
		factory,
		identity,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_MultipartWithoutFilePart(t *testing.T) {
	// Valid multipart/form-data but no part named "file" -> 400
	// Use mock with valid secret so handler gets past credential check and fails on missing file part.
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	if err := w.WriteField("other", "value"); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		&buf,
		w.FormDataContentType(),
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_NamespaceNotFound(t *testing.T) {
	// Create a Kubernetes NotFound error for namespace
	notFoundErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "namespaces \"non-existent\" not found",
			Reason:  metav1.StatusReasonNotFound,
			Code:    http.StatusNotFound,
		},
	}
	mockClient := &mockKubernetesClientForSecrets{err: notFoundErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/file?namespace=non-existent&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		[]byte("test"),
		"file.pdf",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

// TestPostS3FileHandler_FilePartExceedsMaxBytes_Returns413 uses a small max + upload stub so we do not
// send ~32 MiB in tests (same MaxBytesReader behavior as production’s 32 MiB cap).
func TestPostS3FileHandler_FilePartExceedsMaxBytes_Returns413(t *testing.T) {
	t.Parallel()
	const testMax int64 = 64
	filePayload := bytes.Repeat([]byte("x"), int(testMax+10))

	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	body, contentType := buildMultipartFileUpload(t, "file", "blob.bin", filePayload)

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=file.bin",
		body,
		contentType,
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		&s3HandlerTestAppOptions{S3PostMaxFilePartBytes: testMax},
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()
	assert.Equal(t, http.StatusRequestEntityTooLarge, res.StatusCode)
}

func TestPostS3FileHandler_FilePartUnderMaxBytes_Created(t *testing.T) {
	t.Parallel()
	const testMax int64 = 256
	filePayload := bytes.Repeat([]byte("y"), 100)

	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	body, contentType := buildMultipartFileUpload(t, "file", "small.bin", filePayload)

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=small.bin",
		body,
		contentType,
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		&s3HandlerTestAppOptions{S3PostMaxFilePartBytes: testMax},
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()
	assert.Equal(t, http.StatusCreated, res.StatusCode)
}

func TestPostS3FileHandler_ResolvesCollidingKeyWithNumericSuffix(t *testing.T) {
	t.Parallel()
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	collisionClient := newKeyCollisionS3Client("file.pdf")
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(collisionClient)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "file.pdf", []byte("content"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusCreated, res.StatusCode)
	assert.Equal(t, "file-1.pdf", collisionClient.uploadedKey)

	var responseBody map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &responseBody)
	assert.NoError(t, err)
	assert.Equal(t, true, responseBody["uploaded"])
	assert.Equal(t, "file-1.pdf", responseBody["key"])
}

func TestPostS3FileHandler_ResolvesCollidingNumericSuffix(t *testing.T) {
	t.Parallel()
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	collisionClient := newKeyCollisionS3Client("file-5.pdf")
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(collisionClient)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "file-5.pdf", []byte("content"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=file-5.pdf",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusCreated, res.StatusCode)
	assert.Equal(t, "file-6.pdf", collisionClient.uploadedKey)
}

func TestResolveNonCollidingS3Key_PreservesDirectoryPrefix(t *testing.T) {
	t.Parallel()
	client := newKeyCollisionS3Client("folder/sub/file.pdf", "folder/sub/file-1.pdf")
	key, err := resolveNonCollidingS3Key(context.Background(), client, "my-bucket", "folder/sub/file.pdf", 10)
	assert.NoError(t, err)
	assert.Equal(t, "folder/sub/file-2.pdf", key)
}

// headRaceS3Client simulates HeadObject showing a free key while PutObject hits a conditional conflict (concurrent writer).
type headRaceS3Client struct{ s3mocks.MockS3Client }

func (headRaceS3Client) ObjectExists(context.Context, string, string) (bool, error) {
	return false, nil
}

func (headRaceS3Client) UploadObject(context.Context, string, string, io.Reader, string) error {
	return s3int.ErrObjectAlreadyExists
}

func TestPostS3FileHandler_PutConflictAfterHeadReturns409(t *testing.T) {
	t.Parallel()
	secret := validS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&headRaceS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "race.pdf", []byte("content"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=race.pdf",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusConflict, res.StatusCode)
	var env ErrorEnvelope
	err := json.Unmarshal(rr.Body.Bytes(), &env)
	assert.NoError(t, err)
	assert.NotNil(t, env.Error)
	assert.Equal(t, "409", env.Error.Code)
	assert.Contains(t, env.Error.Message, "upload conflict")
}

func buildMultipartFileUpload(t *testing.T, fieldName, fileName string, contents []byte) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = part.Write(contents); err != nil {
		t.Fatal(err)
	}
	if err = writer.Close(); err != nil {
		t.Fatal(err)
	}
	return &buf, writer.FormDataContentType()
}

// TestPostS3FileHandler_TotalRequestBodyExceedsCap_Returns413 ensures the body-wide MaxBytesReader
// (same cap as rejectDeclaredOversizedS3Post) stops streaming when discarding a large non-file part
// under unknown Content-Length (chunked-style), so the scanner cannot read unbounded.
func TestPostS3FileHandler_TotalRequestBodyExceedsCap_Returns413(t *testing.T) {
	t.Parallel()
	const maxBody int64 = 4096

	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	junk, err := mw.CreateFormField("junk")
	assert.NoError(t, err)
	_, err = junk.Write(bytes.Repeat([]byte("z"), 10000))
	assert.NoError(t, err)
	fp, err := mw.CreateFormFile("file", "late.bin")
	assert.NoError(t, err)
	_, err = fp.Write([]byte("ok"))
	assert.NoError(t, err)
	assert.NoError(t, mw.Close())

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket&key=late.bin",
		bytes.NewReader(buf.Bytes()),
		mw.FormDataContentType(),
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		&s3HandlerTestAppOptions{S3PostMaxRequestBodyBytes: maxBody},
		func(r *http.Request) {
			r.ContentLength = -1
		},
	)
	res := rr.Result()
	defer res.Body.Close()
	assert.Equal(t, http.StatusRequestEntityTooLarge, res.StatusCode)
}

func TestSanitizeUploadContentType(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"empty", "", "application/octet-stream"},
		{"whitespace only", "   ", "application/octet-stream"},
		{"pdf", "application/pdf", "application/pdf"},
		{"pdf with charset", "application/pdf; charset=binary", "application/pdf"},
		{"docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
		{"pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.presentationml.presentation"},
		{"markdown text", "text/markdown", "text/markdown"},
		{"markdown app", "application/markdown", "application/markdown"},
		{"html", "text/html", "text/html"},
		{"html charset", "text/html; charset=utf-8", "text/html"},
		{"plain", "text/plain", "text/plain"},
		{"json", "application/json", "application/json"},
		{"json uppercase", "APPLICATION/JSON", "application/json"},
		{"svg xss vector", "image/svg+xml", "application/octet-stream"},
		{"arbitrary", "text/html<script>", "application/octet-stream"},
		{"invalid", "not a mime type", "application/octet-stream"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, sanitizeUploadContentType(tt.in))
		})
	}
}

func TestS3ObjectContentTypeNeedsForcedDownload(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		in   string
		want bool
	}{
		{"empty", "", false},
		{"whitespace", "   ", false},
		{"html", "text/html", true},
		{"html charset", "text/html; charset=utf-8", true},
		{"html upper", "TEXT/HTML; Charset=UTF-8", true},
		{"xhtml", "application/xhtml+xml", true},
		{"xhtml with param", "application/xhtml+xml; profile=...", true},
		{"svg", "image/svg+xml", true},
		{"svg charset", "image/svg+xml; charset=utf-8", true},
		{"plain", "text/plain", false},
		{"pdf", "application/pdf", false},
		{"json", "application/json", false},
		{"invalid mime", "not a mime", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, isInlineDangerousContentType(tt.in), tt.in)
		})
	}
}
