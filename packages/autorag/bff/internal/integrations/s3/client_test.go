package s3

import (
	"context"
	"crypto/x509"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestClient() *RealS3Client {
	return &RealS3Client{options: S3ClientOptions{DevMode: false}}
}

func TestNewRealS3Client_WrapsErrEndpointValidation(t *testing.T) {
	t.Parallel()
	_, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "a",
		SecretAccessKey: "b",
		Region:          "us-east-1",
		EndpointURL:     "http://s3.amazonaws.com",
	}, S3ClientOptions{})
	assert.Error(t, err)
	assert.True(t, errors.Is(err, ErrEndpointValidation))
}

// ---------------------------------------------------------------------------
// NewRealS3Client — transport / TLS tests
// ---------------------------------------------------------------------------

func TestNewRealS3Client_DefaultTransport(t *testing.T) {
	t.Parallel()
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "a",
		SecretAccessKey: "b",
		Region:          "us-east-1",
		EndpointURL:     "https://10.0.0.1:9000",
	}, S3ClientOptions{})
	assert.NoError(t, err)

	httpClient, ok := client.s3Client.Options().HTTPClient.(*http.Client)
	require.True(t, ok, "HTTPClient should be *http.Client")
	transport, ok := httpClient.Transport.(*http.Transport)
	require.True(t, ok, "Transport should be *http.Transport")
	assert.Equal(t, 30*time.Second, transport.ResponseHeaderTimeout, "ResponseHeaderTimeout should be 30s")
	if transport.TLSClientConfig != nil {
		assert.Nil(t, transport.TLSClientConfig.RootCAs, "RootCAs should be nil when no custom CAs provided")
		assert.False(t, transport.TLSClientConfig.InsecureSkipVerify, "InsecureSkipVerify should be false")
	}
}

func TestNewRealS3Client_WithRootCAs(t *testing.T) {
	t.Parallel()
	pool := x509.NewCertPool()
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "a",
		SecretAccessKey: "b",
		Region:          "us-east-1",
		EndpointURL:     "https://10.0.0.1:9000",
	}, S3ClientOptions{RootCAs: pool})
	assert.NoError(t, err)

	httpClient, ok := client.s3Client.Options().HTTPClient.(*http.Client)
	require.True(t, ok, "HTTPClient should be *http.Client")
	transport, ok := httpClient.Transport.(*http.Transport)
	require.True(t, ok, "Transport should be *http.Transport")
	assert.Same(t, pool, transport.TLSClientConfig.RootCAs, "RootCAs should match the provided pool")
	assert.False(t, transport.TLSClientConfig.InsecureSkipVerify, "InsecureSkipVerify should be false")
	assert.Equal(t, 30*time.Second, transport.ResponseHeaderTimeout, "ResponseHeaderTimeout should be 30s")
}

func TestNewRealS3Client_DevModeFallback(t *testing.T) {
	t.Parallel()
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "a",
		SecretAccessKey: "b",
		Region:          "us-east-1",
		EndpointURL:     "https://10.0.0.1:9000",
	}, S3ClientOptions{DevMode: true})
	assert.NoError(t, err)

	httpClient, ok := client.s3Client.Options().HTTPClient.(*http.Client)
	require.True(t, ok, "HTTPClient should be *http.Client")
	transport, ok := httpClient.Transport.(*http.Transport)
	require.True(t, ok, "Transport should be *http.Transport")
	assert.True(t, transport.TLSClientConfig.InsecureSkipVerify, "InsecureSkipVerify should be true in dev mode")
	assert.Equal(t, 30*time.Second, transport.ResponseHeaderTimeout, "ResponseHeaderTimeout should be 30s")
}

// ---------------------------------------------------------------------------
// validateAndNormalizeEndpoint — SSRF protection tests
// ---------------------------------------------------------------------------

func TestValidateAndNormalizeEndpoint_AcceptsValidHTTPS(t *testing.T) {
	c := newTestClient()
	result, err := c.validateAndNormalizeEndpoint("https://s3.us-east-1.amazonaws.com")

	assert.NoError(t, err)
	assert.Equal(t, "https://s3.us-east-1.amazonaws.com", result)
}

func TestValidateAndNormalizeEndpoint_AcceptsHTTPSWithPort(t *testing.T) {
	c := newTestClient()
	result, err := c.validateAndNormalizeEndpoint("https://s3.amazonaws.com:9000")

	assert.NoError(t, err)
	assert.Equal(t, "https://s3.amazonaws.com:9000", result)
}

func TestValidateAndNormalizeEndpoint_RejectsHTTPForExternalEndpoints(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("http://s3.amazonaws.com")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "HTTPS scheme for external endpoints")
}

func TestValidateAndNormalizeEndpoint_AcceptsHTTPForInClusterEndpoints(t *testing.T) {
	c := newTestClient()
	testCases := []struct {
		name     string
		endpoint string
	}{
		{
			name:     "MinIO service with namespace",
			endpoint: "http://minio-pipelines.yamcha.svc.cluster.local:9000",
		},
		{
			name:     "MinIO service without port",
			endpoint: "http://minio-dspa.default.svc.cluster.local",
		},
		{
			name:     "Generic cluster service",
			endpoint: "http://my-service.my-namespace.svc.cluster.local:8080",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := c.validateAndNormalizeEndpoint(tc.endpoint)
			assert.NoError(t, err, "should accept in-cluster HTTP endpoint")
			assert.Equal(t, tc.endpoint, result)
		})
	}
}

func TestValidateAndNormalizeEndpoint_RejectsInvalidClusterLocalHostnames(t *testing.T) {
	c := newTestClient()
	testCases := []struct {
		name     string
		endpoint string
		reason   string
	}{
		{
			name:     "Too few labels (4) - missing namespace",
			endpoint: "http://evil.svc.cluster.local",
			reason:   "should reject .svc.cluster.local with fewer than 5 labels",
		},
		{
			name:     "Too few labels (3) - just svc.cluster.local",
			endpoint: "http://svc.cluster.local:9000",
			reason:   "should reject partial cluster domain",
		},
		{
			name:     "Malicious cluster.local suffix",
			endpoint: "http://evil.cluster.local",
			reason:   "should reject non-service cluster.local domains",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := c.validateAndNormalizeEndpoint(tc.endpoint)
			assert.Error(t, err, tc.reason)
			assert.Contains(t, err.Error(), "HTTPS scheme for external endpoints",
				"should treat invalid cluster hostnames as external and require HTTPS")
		})
	}
}

func TestValidateAndNormalizeEndpoint_RejectsEmptyEndpoint(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "empty")
}

func TestValidateAndNormalizeEndpoint_RejectsInvalidScheme(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("ftp://s3.amazonaws.com")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must use http or https scheme")
}

func TestValidateAndNormalizeEndpoint_AcceptsPrivateIPs(t *testing.T) {
	c := newTestClient()
	for _, endpoint := range []string{
		"https://10.0.0.1:9000",
		"https://100.64.0.1:9000",
		"https://172.16.0.1:9000",
		"https://192.168.1.1:9000",
		"https://[fd00::1]:9000",
	} {
		result, err := c.validateAndNormalizeEndpoint(endpoint)
		assert.NoError(t, err, "should accept %s", endpoint)
		assert.Equal(t, endpoint, result)
	}
}

func TestValidateAndNormalizeEndpoint_RejectsLoopback(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://127.0.0.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "loopback")
}

func TestValidateAndNormalizeEndpoint_RejectsLinkLocal(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://169.254.169.254")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "link-local")
}

func TestValidateAndNormalizeEndpoint_RejectsThisNetwork_0_0_0_0(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://0.0.0.0:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "this network")
}

func TestValidateAndNormalizeEndpoint_RejectsThisNetwork_0_0_0_1(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://0.0.0.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "this network")
}

func TestValidateAndNormalizeEndpoint_RejectsReservedFutureUse(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://240.0.0.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "reserved for future use")
}

func TestValidateAndNormalizeEndpoint_RejectsIPv6Loopback(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://[::1]:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "IPv6 loopback")
}

func TestValidateAndNormalizeEndpoint_RejectsIPv6LinkLocal(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://[fe80::1]:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "IPv6 link-local")
}

func TestValidateAndNormalizeEndpoint_AcceptsIPv6UniqueLocal(t *testing.T) {
	c := newTestClient()
	result, err := c.validateAndNormalizeEndpoint("https://[fc00::1]:9000")
	assert.NoError(t, err)
	assert.Equal(t, "https://[fc00::1]:9000", result)
}

// ---------------------------------------------------------------------------
// S3 connect timeout configuration tests
// ---------------------------------------------------------------------------

// TestNewRealS3Client_TransportHasConnectTimeout verifies that NewRealS3Client applies
// s3ConnectTimeout to the HTTP transport's TLS handshake timeout and configures
// a non-nil DialContext (the dial timeout cannot be read back from the function
// value, but a nil check confirms the custom dialer was set).
func TestNewRealS3Client_TransportHasConnectTimeout(t *testing.T) {
	t.Parallel()
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "AKIAIOSFODNN7EXAMPLE",
		SecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
		Region:          "us-east-1",
		EndpointURL:     "https://10.0.0.1:9000",
	}, S3ClientOptions{})
	require.NoError(t, err)

	httpClient, ok := client.s3Client.Options().HTTPClient.(*http.Client)
	require.True(t, ok, "HTTPClient should be *http.Client")
	transport, ok := httpClient.Transport.(*http.Transport)
	require.True(t, ok, "Transport should be *http.Transport")

	assert.Equal(t, s3ConnectTimeout, transport.TLSHandshakeTimeout,
		"TLSHandshakeTimeout should equal s3ConnectTimeout")
	assert.NotNil(t, transport.DialContext,
		"DialContext should be set to a custom dialer with s3ConnectTimeout")
}

func TestNewRealS3Client_CreatesClientWithValidCredentials(t *testing.T) {
	t.Parallel()
	// Use a literal IP to avoid DNS resolution dependency in tests.
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "AKIAIOSFODNN7EXAMPLE",
		SecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
		Region:          "us-east-1",
		EndpointURL:     "https://1.2.3.4:443",
	}, S3ClientOptions{})
	assert.NoError(t, err)
	assert.NotNil(t, client)
}

func TestBuildS3AWSConfig_SetsRetryMaxAttemptsToOne(t *testing.T) {
	t.Parallel()
	cfg := buildS3AWSConfig(&S3Credentials{
		AccessKeyID:     "test-key",
		SecretAccessKey: "test-secret",
		Region:          "us-east-1",
	})
	assert.Equal(t, 1, cfg.RetryMaxAttempts)
}

// mockS3CodedError simulates AWS SDK errors that implement ErrorCode().
type mockS3CodedError struct {
	msg  string
	code string
}

func (e mockS3CodedError) Error() string {
	if e.msg != "" {
		return e.msg
	}
	return e.code
}

func (e mockS3CodedError) ErrorCode() string {
	return e.code
}

// ---------------------------------------------------------------------------
// ListObjects — folder marker filtering tests
// ---------------------------------------------------------------------------

// lastRequest captures the query parameters from the most recent HTTP request
// handled by the fake S3 server, enabling assertions on the ListObjectsV2
// parameters (prefix, delimiter, max-keys) that the client sends.
type lastRequest struct {
	Query url.Values
}

// newFakeS3Client creates a RealS3Client backed by an httptest.Server that
// returns the provided XML body for every ListObjectsV2 request. The returned
// lastRequest captures query parameters from each request for assertion.
func newFakeS3Client(t *testing.T, xmlBody string) (*RealS3Client, *httptest.Server, *lastRequest) {
	t.Helper()
	lr := &lastRequest{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lr.Query = r.URL.Query()
		w.Header().Set("Content-Type", "application/xml")
		_, _ = w.Write([]byte(xmlBody))
	}))

	cfg := aws.Config{
		Region:      "us-east-1",
		Credentials: credentials.NewStaticCredentialsProvider("test", "test", ""),
		HTTPClient:  server.Client(),
	}
	s3Client := awss3.NewFromConfig(cfg, func(o *awss3.Options) {
		o.BaseEndpoint = aws.String(server.URL)
		o.UsePathStyle = true
	})

	return &RealS3Client{s3Client: s3Client, options: S3ClientOptions{}.withDefaults()}, server, lr
}

func TestListObjects_SkipsFolderMarker(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name         string
		xml          string
		path         string
		wantCount    int
		wantFirstKey string
		wantPrefix   string
	}{
		{
			name: "simple path",
			xml: `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>bucket</Name>
  <Prefix>my folder/</Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>10</MaxKeys>
  <KeyCount>2</KeyCount>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>my folder/</Key>
    <Size>0</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>my folder/file.txt</Key>
    <Size>1234</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`,
			path:         "my folder",
			wantCount:    1,
			wantFirstKey: "my folder/file.txt",
			wantPrefix:   "my folder/",
		},
		{
			name: "path with spaces",
			xml: `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>bucket</Name>
  <Prefix>automl input data/timeseries/</Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>10</MaxKeys>
  <KeyCount>2</KeyCount>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>automl input data/timeseries/</Key>
    <Size>0</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>automl input data/timeseries/train.csv</Key>
    <Size>4577869</Size>
    <LastModified>2026-05-12T15:42:06Z</LastModified>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`,
			path:         "automl input data/timeseries",
			wantCount:    1,
			wantFirstKey: "automl input data/timeseries/train.csv",
			wantPrefix:   "automl input data/timeseries/",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, server, lr := newFakeS3Client(t, tt.xml)
			defer server.Close()

			result, err := client.ListObjects(context.Background(), "bucket", ListObjectsOptions{
				Path:  tt.path,
				Limit: 10,
			})
			require.NoError(t, err)
			require.Len(t, result.Contents, tt.wantCount, "folder marker should be filtered out")
			assert.Equal(t, tt.wantFirstKey, result.Contents[0].Key)
			assert.Equal(t, tt.wantPrefix, lr.Query.Get("prefix"))
			assert.Equal(t, "/", lr.Query.Get("delimiter"))
		})
	}
}

func TestListObjects_KeepsNonMarkerContent(t *testing.T) {
	t.Parallel()
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>bucket</Name>
  <Prefix>datasets/</Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>10</MaxKeys>
  <KeyCount>3</KeyCount>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>datasets/a.csv</Key>
    <Size>100</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>datasets/b.csv</Key>
    <Size>200</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>datasets/c.csv</Key>
    <Size>300</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`

	client, server, _ := newFakeS3Client(t, xml)
	defer server.Close()

	result, err := client.ListObjects(context.Background(), "bucket", ListObjectsOptions{
		Path:  "datasets",
		Limit: 10,
	})
	require.NoError(t, err)
	assert.Len(t, result.Contents, 3, "all real files should be returned when no folder marker exists")
}

func TestListObjects_RootListingDoesNotFilter(t *testing.T) {
	t.Parallel()
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>bucket</Name>
  <Prefix></Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>10</MaxKeys>
  <KeyCount>1</KeyCount>
  <IsTruncated>false</IsTruncated>
  <CommonPrefixes>
    <Prefix>datasets/</Prefix>
  </CommonPrefixes>
  <Contents>
    <Key>readme.txt</Key>
    <Size>42</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`

	client, server, _ := newFakeS3Client(t, xml)
	defer server.Close()

	result, err := client.ListObjects(context.Background(), "bucket", ListObjectsOptions{
		Limit: 10,
	})
	require.NoError(t, err)
	assert.Len(t, result.Contents, 1, "root listing should return all content items")
	assert.Equal(t, "readme.txt", result.Contents[0].Key)
	assert.Len(t, result.CommonPrefixes, 1)
	assert.Equal(t, "datasets/", result.CommonPrefixes[0].Prefix)
}

func TestListObjects_OnlyFolderMarkerReturnsEmptyContents(t *testing.T) {
	t.Parallel()
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>bucket</Name>
  <Prefix>empty-dir/</Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>10</MaxKeys>
  <KeyCount>1</KeyCount>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>empty-dir/</Key>
    <Size>0</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`

	client, server, _ := newFakeS3Client(t, xml)
	defer server.Close()

	result, err := client.ListObjects(context.Background(), "bucket", ListObjectsOptions{
		Path:  "empty-dir",
		Limit: 10,
	})
	require.NoError(t, err)
	assert.Empty(t, result.Contents, "folder containing only its own marker should return empty contents")
}

func TestListObjects_SkipsZeroByteMarkerNotMatchingPrefix(t *testing.T) {
	t.Parallel()
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>bucket</Name>
  <Prefix>data/</Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>10</MaxKeys>
  <KeyCount>3</KeyCount>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>data/</Key>
    <Size>0</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>data/orphan-marker/</Key>
    <Size>0</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>data/real-file.csv</Key>
    <Size>500</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`

	client, server, _ := newFakeS3Client(t, xml)
	defer server.Close()

	result, err := client.ListObjects(context.Background(), "bucket", ListObjectsOptions{
		Path:  "data",
		Limit: 10,
	})
	require.NoError(t, err)
	require.Len(t, result.Contents, 1, "both zero-byte markers should be filtered")
	assert.Equal(t, "data/real-file.csv", result.Contents[0].Key)
}

func TestListObjects_PreservesNonMarkerFileMatchingPrefix(t *testing.T) {
	t.Parallel()
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>bucket</Name>
  <Prefix>data/exact-match.csv</Prefix>
  <Delimiter>/</Delimiter>
  <MaxKeys>10</MaxKeys>
  <KeyCount>1</KeyCount>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>data/exact-match.csv</Key>
    <Size>4096</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`

	client, server, _ := newFakeS3Client(t, xml)
	defer server.Close()

	result, err := client.ListObjects(context.Background(), "bucket", ListObjectsOptions{
		Path:   "data",
		Search: "exact-match.csv",
		Limit:  10,
	})
	require.NoError(t, err)
	require.Len(t, result.Contents, 1, "non-zero-byte file matching prefix must not be filtered")
	assert.Equal(t, "data/exact-match.csv", result.Contents[0].Key)
	assert.Equal(t, int64(4096), result.Contents[0].Size)
}

func TestIsS3ConditionalCreateConflict(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{name: "PreconditionFailed", err: mockS3CodedError{code: "PreconditionFailed"}, want: true},
		{name: "ConditionalRequestConflict", err: mockS3CodedError{code: "ConditionalRequestConflict"}, want: true},
		{
			name: "wrapped PreconditionFailed",
			err:  fmt.Errorf("upload failed: %w", mockS3CodedError{code: "PreconditionFailed"}),
			want: true,
		},
		{
			name: "wrapped ConditionalRequestConflict",
			err:  fmt.Errorf("upload failed: %w", mockS3CodedError{code: "ConditionalRequestConflict"}),
			want: true,
		},
		{name: "other ErrorCode", err: mockS3CodedError{code: "NoSuchKey"}, want: false},
		{name: "plain error", err: errors.New("failed"), want: false},
		{name: "nil", err: nil, want: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, isS3ConditionalCreateConflict(tt.err))
		})
	}
}
