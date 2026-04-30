package api

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
)

func TestS3PostDeclaredBodyExceedsLimit(t *testing.T) {
	t.Parallel()
	app := &App{}
	unknown := httptest.NewRequest(http.MethodPost, "/", nil)
	unknown.ContentLength = -1
	assert.False(t, app.s3PostDeclaredBodyExceedsLimit(unknown))

	zero := httptest.NewRequest(http.MethodPost, "/", nil)
	zero.ContentLength = 0
	assert.False(t, app.s3PostDeclaredBodyExceedsLimit(zero))

	ok := httptest.NewRequest(http.MethodPost, "/", nil)
	ok.ContentLength = s3MaxUploadFileBytes + s3MultipartMaxEnvelopeBytes
	assert.False(t, app.s3PostDeclaredBodyExceedsLimit(ok))

	big := httptest.NewRequest(http.MethodPost, "/", nil)
	big.ContentLength = s3MaxUploadFileBytes + s3MultipartMaxEnvelopeBytes + 1
	assert.True(t, app.s3PostDeclaredBodyExceedsLimit(big))
}

type panicKubernetesClientFactory struct{}

func (p *panicKubernetesClientFactory) GetClient(context.Context) (kubernetes.KubernetesClientInterface, error) {
	panic("GetClient should not be called when declared body triggers 413")
}

func (p *panicKubernetesClientFactory) ExtractRequestIdentity(http.Header) (*kubernetes.RequestIdentity, error) {
	return &kubernetes.RequestIdentity{UserID: "test-user"}, nil
}

func (p *panicKubernetesClientFactory) ValidateRequestIdentity(*kubernetes.RequestIdentity) error {
	return nil
}

func TestPostS3FileHandler_ContentLengthTooLarge(t *testing.T) {
	t.Parallel()
	smallBody := []byte("--b\r\nContent-Disposition: form-data; name=\"file\"; filename=\"x\"\r\n\r\nx\r\n--b--\r\n")
	req, err := http.NewRequest(
		http.MethodPost,
		"/api/v1/s3/files/k?namespace=ns&secretName=sec&bucket=bkt",
		bytes.NewReader(smallBody),
	)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "multipart/form-data; boundary=b")
	req.ContentLength = s3MaxUploadFileBytes + s3MultipartMaxEnvelopeBytes + 1

	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "u"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "ns")
	req = req.WithContext(ctx)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
		logger:                  logger,
		kubernetesClientFactory: &panicKubernetesClientFactory{},
		repositories:            repositories.NewRepositories(logger),
	}
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	res := rr.Result()
	defer res.Body.Close()
	require.Equal(t, http.StatusRequestEntityTooLarge, res.StatusCode)
}

func TestPostS3FileHandler_UnknownContentLength_PassesDeclaredSizeMiddleware(t *testing.T) {
	t.Parallel()
	// Chunked / unknown Content-Length must not be rejected by middleware (413 is only for declared oversized body).
	smallBody := []byte("--b\r\nContent-Disposition: form-data; name=\"file\"; filename=\"x\"\r\n\r\nx\r\n--b--\r\n")
	req, err := http.NewRequest(
		http.MethodPost,
		"/api/v1/s3/files/file.pdf?namespace=test-namespace&secretName=non-existent&bucket=my-bucket",
		bytes.NewReader(smallBody),
	)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "multipart/form-data; boundary=b")
	req.ContentLength = -1

	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
	req = req.WithContext(ctx)
	req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
		logger:                  logger,
		kubernetesClientFactory: factory,
		repositories:            repositories.NewRepositories(logger),
	}
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	res := rr.Result()
	defer res.Body.Close()
	assert.NotEqual(t, http.StatusRequestEntityTooLarge, res.StatusCode, "unknown CL should not hit declared-size 413")
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}
