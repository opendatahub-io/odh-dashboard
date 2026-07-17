package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/s3/s3mocks"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

func TestReadTrainingCSV_WithinLimit(t *testing.T) {
	t.Parallel()

	data, err := readTrainingCSV(strings.NewReader("col\n1\n"))
	require.NoError(t, err)
	assert.Equal(t, []byte("col\n1\n"), data)
}

func TestReadTrainingCSV_ExceedsLimit(t *testing.T) {
	t.Parallel()

	oversized := bytes.Repeat([]byte("a"), int(s3MaxUploadFileBytes)+1)
	_, err := readTrainingCSV(bytes.NewReader(oversized))
	require.Error(t, err)

	var validationErr *repositories.ValidationError
	require.ErrorAs(t, err, &validationErr)
	assert.Equal(t, s3FilePartTooLargeMsg, validationErr.Error())
}

func TestReadTrainingCSV_ReadError(t *testing.T) {
	t.Parallel()

	_, err := readTrainingCSV(io.NopCloser(errReader{err: io.ErrUnexpectedEOF}))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to read training data CSV")
}

type errReader struct {
	err error
}

func (e errReader) Read([]byte) (int, error) {
	return 0, e.err
}

func TestUploadASCIICompatibleTrainingCSV_VerifiesExistingObject(t *testing.T) {
	t.Parallel()

	rewritten := []byte("alias,feature\n1,2\n")
	key := repositories.DeriveASCIICompatibleCSVKey("data/train.csv", rewritten)
	client := &storedS3Client{objects: map[string][]byte{key: rewritten}}

	require.NoError(t, uploadASCIICompatibleTrainingCSV(context.Background(), client, "bucket", key, rewritten))
}

func TestUploadASCIICompatibleTrainingCSV_RejectsMismatchedExistingObject(t *testing.T) {
	t.Parallel()

	rewritten := []byte("alias,feature\n1,2\n")
	key := repositories.DeriveASCIICompatibleCSVKey("data/train.csv", rewritten)
	client := &storedS3Client{objects: map[string][]byte{key: []byte("different,content\n")}}

	err := uploadASCIICompatibleTrainingCSV(context.Background(), client, "bucket", key, rewritten)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "does not match expected rewritten CSV")
}

type storedS3Client struct {
	s3mocks.MockS3Client
	objects map[string][]byte
}

func (c *storedS3Client) UploadObject(_ context.Context, _ string, key string, body io.Reader, _ string) error {
	if _, exists := c.objects[key]; exists {
		return s3int.ErrObjectAlreadyExists
	}
	data, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	c.objects[key] = data
	return nil
}

func (c *storedS3Client) GetObject(_ context.Context, _, key string) (io.ReadCloser, string, error) {
	data, ok := c.objects[key]
	if !ok {
		return c.MockS3Client.GetObject(context.Background(), "", key)
	}
	return io.NopCloser(bytes.NewReader(data)), "text/csv", nil
}

type failingS3ClientFactory struct {
	err error
}

func (f *failingS3ClientFactory) CreateClient(_ *s3int.S3Credentials) (s3int.S3ClientInterface, error) {
	return nil, f.err
}

type failingK8sClientFactory struct {
	mockKubernetesClientFactoryForSecrets
	err error
}

func (f *failingK8sClientFactory) GetClient(ctx context.Context) (kubernetes.KubernetesClientInterface, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.mockKubernetesClientFactoryForSecrets.GetClient(ctx)
}

func TestResolveS3ClientForRun_ErrorCases(t *testing.T) {
	t.Parallel()

	validSecret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "minio-secret",
			Namespace: "test-namespace",
			UID:       types.UID("uid-minio"),
		},
		Data: map[string][]byte{
			"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
			"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
			"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			"AWS_S3_BUCKET":         []byte("automl-bucket"),
		},
	}

	notFoundErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Reason:  metav1.StatusReasonNotFound,
			Message: "secrets \"missing\" not found",
			Code:    http.StatusNotFound,
		},
	}
	forbiddenErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Reason:  metav1.StatusReasonForbidden,
			Message: "forbidden",
			Code:    http.StatusForbidden,
		},
	}

	tests := []struct {
		name            string
		setupReq        func(*http.Request) *http.Request
		secretName      string
		bucket          string
		k8sFactory      kubernetes.KubernetesClientFactory
		s3Factory       s3int.S3ClientFactory
		wantErrContains string
		wantValidation  bool
	}{
		{
			name: "missing RequestIdentity",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return req.WithContext(ctx)
			},
			secretName:      "minio-secret",
			bucket:          "automl-bucket",
			k8sFactory:      &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{validSecret}}},
			s3Factory:       s3mocks.NewMockClientFactory(),
			wantErrContains: "missing RequestIdentity",
		},
		{
			name: "missing namespace",
			setupReq: func(req *http.Request) *http.Request {
				return withRequestIdentity(req)
			},
			secretName:      "minio-secret",
			bucket:          "automl-bucket",
			k8sFactory:      &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{validSecret}}},
			s3Factory:       s3mocks.NewMockClientFactory(),
			wantErrContains: "missing namespace",
		},
		{
			name: "kubernetes client factory error",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return withRequestIdentity(req.WithContext(ctx))
			},
			secretName: "minio-secret",
			bucket:     "automl-bucket",
			k8sFactory: &failingK8sClientFactory{
				err: errors.New("k8s unavailable"),
			},
			s3Factory:       s3mocks.NewMockClientFactory(),
			wantErrContains: "failed to get Kubernetes client",
		},
		{
			name: "empty secret name",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return withRequestIdentity(req.WithContext(ctx))
			},
			secretName:      "  ",
			bucket:          "automl-bucket",
			k8sFactory:      &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{validSecret}}},
			s3Factory:       s3mocks.NewMockClientFactory(),
			wantErrContains: "train_data_secret_name is required",
			wantValidation:  true,
		},
		{
			name: "empty bucket",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return withRequestIdentity(req.WithContext(ctx))
			},
			secretName:      "minio-secret",
			bucket:          "",
			k8sFactory:      &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{validSecret}}},
			s3Factory:       s3mocks.NewMockClientFactory(),
			wantErrContains: "train_data_bucket_name is required",
			wantValidation:  true,
		},
		{
			name: "secret not found",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return withRequestIdentity(req.WithContext(ctx))
			},
			secretName: "missing-secret",
			bucket:     "automl-bucket",
			k8sFactory: &mockKubernetesClientFactoryForSecrets{
				client: &mockKubernetesClientForSecrets{err: notFoundErr},
			},
			s3Factory:       s3mocks.NewMockClientFactory(),
			wantErrContains: "not found",
			wantValidation:  true,
		},
		{
			name: "secret forbidden",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return withRequestIdentity(req.WithContext(ctx))
			},
			secretName: "minio-secret",
			bucket:     "automl-bucket",
			k8sFactory: &mockKubernetesClientFactoryForSecrets{
				client: &mockKubernetesClientForSecrets{err: forbiddenErr},
			},
			s3Factory:       s3mocks.NewMockClientFactory(),
			wantErrContains: "access denied reading S3 secret",
		},
		{
			name: "generic secret resolve error",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return withRequestIdentity(req.WithContext(ctx))
			},
			secretName: "minio-secret",
			bucket:     "automl-bucket",
			k8sFactory: &mockKubernetesClientFactoryForSecrets{
				client: &mockKubernetesClientForSecrets{err: errors.New("connection reset")},
			},
			s3Factory:       s3mocks.NewMockClientFactory(),
			wantErrContains: "failed to resolve S3 credentials",
		},
		{
			name: "S3 endpoint validation error",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return withRequestIdentity(req.WithContext(ctx))
			},
			secretName:      "minio-secret",
			bucket:          "automl-bucket",
			k8sFactory:      &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{validSecret}}},
			s3Factory:       &failingS3ClientFactory{err: fmt.Errorf("%w: blocked", s3int.ErrEndpointValidation)},
			wantErrContains: "blocked",
			wantValidation:  true,
		},
		{
			name: "S3 client create error",
			setupReq: func(req *http.Request) *http.Request {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
				return withRequestIdentity(req.WithContext(ctx))
			},
			secretName:      "minio-secret",
			bucket:          "automl-bucket",
			k8sFactory:      &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{validSecret}}},
			s3Factory:       &failingS3ClientFactory{err: errors.New("dial failed")},
			wantErrContains: "failed to create S3 client",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			app := &App{
				logger:                  slog.Default(),
				repositories:            repositories.NewRepositories(slog.Default()),
				kubernetesClientFactory: tt.k8sFactory,
				s3ClientFactory:         tt.s3Factory,
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v1/pipeline-runs", nil)
			req = tt.setupReq(req)

			_, err := app.resolveS3ClientForRun(req, tt.secretName, tt.bucket)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.wantErrContains)

			if tt.wantValidation {
				var validationErr *repositories.ValidationError
				assert.ErrorAs(t, err, &validationErr)
			}
		})
	}
}

func TestResolveS3ClientForRun_Success(t *testing.T) {
	t.Parallel()

	validSecret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "minio-secret",
			Namespace: "test-namespace",
			UID:       types.UID("uid-minio"),
		},
		Data: map[string][]byte{
			"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
			"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
			"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			"AWS_S3_BUCKET":         []byte("automl-bucket"),
		},
	}

	app := &App{
		logger:       slog.Default(),
		repositories: repositories.NewRepositories(slog.Default()),
		kubernetesClientFactory: &mockKubernetesClientFactoryForSecrets{
			client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{validSecret}},
		},
		s3ClientFactory: s3mocks.NewMockClientFactory(),
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/pipeline-runs", nil)
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
	req = withRequestIdentity(req.WithContext(ctx))

	resolved, err := app.resolveS3ClientForRun(req, "minio-secret", "automl-bucket")
	require.NoError(t, err)
	require.NotNil(t, resolved)
	assert.Equal(t, "automl-bucket", resolved.bucket)
	assert.NotNil(t, resolved.client)
}
