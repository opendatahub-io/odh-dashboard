package mlflow

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUnavailableClientFactoryGetClient(t *testing.T) {
	factory := NewUnavailableClientFactory()

	client, err := factory.GetClient(context.Background(), "token", "namespace")

	assert.Nil(t, client)
	assert.ErrorIs(t, err, ErrMLflowNotConfigured)
}

func TestRealClientFactoryGetClientEmptyToken(t *testing.T) {
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL: "http://localhost:5000",
		Logger:      slog.New(slog.NewTextHandler(os.Stderr, nil)),
	})

	client, err := factory.GetClient(context.Background(), "", "namespace")

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestRealClientFactoryGetClientWhitespaceOnlyToken(t *testing.T) {
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL: "http://localhost:5000",
		Logger:      slog.New(slog.NewTextHandler(os.Stderr, nil)),
	})

	client, err := factory.GetClient(context.Background(), "   ", "namespace")

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestRealClientFactoryGetClientEmptyNamespace(t *testing.T) {
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL: "http://localhost:5000",
		Logger:      slog.New(slog.NewTextHandler(os.Stderr, nil)),
	})

	client, err := factory.GetClient(context.Background(), "my-token", "")

	assert.Nil(t, client)
	assert.ErrorIs(t, err, ErrNamespaceRequired)
}

func TestRealClientFactoryGetClientWhitespaceOnlyNamespace(t *testing.T) {
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL: "http://localhost:5000",
		Logger:      slog.New(slog.NewTextHandler(os.Stderr, nil)),
	})

	client, err := factory.GetClient(context.Background(), "my-token", "  \t ")

	assert.Nil(t, client)
	assert.ErrorIs(t, err, ErrNamespaceRequired)
}

func TestRealClientFactoryGetClientSuccess(t *testing.T) {
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL: "http://localhost:5000",
		Logger:      slog.New(slog.NewTextHandler(os.Stderr, nil)),
	})

	client, err := factory.GetClient(context.Background(), "my-token", "my-namespace")

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestRealClientFactoryGetClientTrimsInputs(t *testing.T) {
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL: "http://localhost:5000",
		Logger:      slog.New(slog.NewTextHandler(os.Stderr, nil)),
	})

	client, err := factory.GetClient(context.Background(), "  my-token  ", "  my-namespace  ")

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestRealClientFactoryGetClientHTTPS(t *testing.T) {
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL:        "https://mlflow.example.com",
		InsecureSkipVerify: true,
		Logger:             slog.New(slog.NewTextHandler(os.Stderr, nil)),
	})

	client, err := factory.GetClient(context.Background(), "my-token", "namespace")

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestRealClientFactoryGetClientNilLogger(t *testing.T) {
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL: "http://localhost:5000",
	})

	client, err := factory.GetClient(context.Background(), "my-token", "namespace")

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestNewRealClientFactoryConfigFields(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	factory := NewRealClientFactory(RealClientFactoryConfig{
		TrackingURL:        "https://mlflow.example.com",
		InsecureSkipVerify: true,
		Logger:             logger,
	})

	realFactory, ok := factory.(*RealClientFactory)
	require.True(t, ok)
	assert.Equal(t, "https://mlflow.example.com", realFactory.trackingURL)
	assert.NotNil(t, realFactory.transport)
	assert.Equal(t, logger, realFactory.logger)
	assert.True(t, realFactory.transport.TLSClientConfig.InsecureSkipVerify)
	assert.Equal(t, 10, realFactory.transport.MaxIdleConnsPerHost)
}
