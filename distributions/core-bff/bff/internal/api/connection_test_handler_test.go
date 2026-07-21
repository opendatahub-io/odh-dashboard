package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Handler Tests ---

func TestTestConnection_EmptyBody_Returns400(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestTestConnection_MissingConnectionType_Returns400(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	body := `{"connectionType":"","fieldValues":{"key":"value"}}`
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var httpErr HTTPError
	err := json.Unmarshal(rr.Body.Bytes(), &httpErr)
	require.NoError(t, err)
	assert.Equal(t, "INVALID_REQUEST", httpErr.Error.Code)
}

func TestTestConnection_UnsupportedType_Returns400(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	body := `{"connectionType":"unknown-type","fieldValues":{"key":"value"}}`
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var httpErr HTTPError
	err := json.Unmarshal(rr.Body.Bytes(), &httpErr)
	require.NoError(t, err)
	assert.Equal(t, "UNSUPPORTED_TYPE", httpErr.Error.Code)
	assert.Contains(t, httpErr.Error.Message, "unknown-type")
}

func TestTestConnection_MockMode_S3_Success(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.MockHTTPClient = true
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := `{"connectionType":"s3","fieldValues":{"AWS_S3_ENDPOINT":"http://minio:9000","AWS_S3_BUCKET":"my-bucket","AWS_ACCESS_KEY_ID":"key","AWS_SECRET_ACCESS_KEY":"secret"}}`
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope Envelope[models.ConnectionTestResult, None]
	err := json.Unmarshal(rr.Body.Bytes(), &envelope)
	require.NoError(t, err)
	assert.True(t, envelope.Data.Success)
	assert.Contains(t, envelope.Data.Message, "my-bucket")
}

func TestTestConnection_MockMode_URI_Success(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.MockHTTPClient = true
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := `{"connectionType":"uri","fieldValues":{"URI":"https://example.com/data"}}`
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope Envelope[models.ConnectionTestResult, None]
	err := json.Unmarshal(rr.Body.Bytes(), &envelope)
	require.NoError(t, err)
	assert.True(t, envelope.Data.Success)
	assert.Contains(t, envelope.Data.Message, "example.com")
}

func TestTestConnection_MockMode_OCI_Success(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.MockHTTPClient = true
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := `{"connectionType":"oci","fieldValues":{"OCI_HOST":"quay.io"}}`
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope Envelope[models.ConnectionTestResult, None]
	err := json.Unmarshal(rr.Body.Bytes(), &envelope)
	require.NoError(t, err)
	assert.True(t, envelope.Data.Success)
	assert.Contains(t, envelope.Data.Message, "quay.io")
}

func TestTestConnection_ProbeBusy_Returns503(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.MockHTTPClient = true
		a.probeSemaphore = make(chan struct{}, 1)
	})
	admin := k8mocks.DefaultTestUsers[0]

	app.probeSemaphore <- struct{}{}

	body := `{"connectionType":"uri","fieldValues":{"URI":"https://example.com"}}`
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)

	var httpErr HTTPError
	err := json.Unmarshal(rr.Body.Bytes(), &httpErr)
	require.NoError(t, err)
	assert.Equal(t, "PROBE_BUSY", httpErr.Error.Code)

	<-app.probeSemaphore
}

// --- URI Probe Tests ---

func TestProbeURI_Success(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	result := probeURI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{"URI": ts.URL},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "reachable")
}

func TestProbeURI_MissingField(t *testing.T) {
	result := probeURI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{},
	})
	assert.False(t, result.Success)
	assert.Equal(t, "CONNECTION_FAILED", result.Error)
	assert.Contains(t, result.Message, "Missing required field")
}

func TestProbeURI_BadScheme(t *testing.T) {
	result := probeURI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"URI": "ftp://example.com"},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "http or https")
}

func TestProbeURI_ServerError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer ts.Close()

	result := probeURI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{"URI": ts.URL},
		InsecureSkipVerify: true,
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "HTTP 500")
}

func TestProbeURI_TooLong(t *testing.T) {
	longURI := "https://example.com/" + string(make([]byte, maxURILength+1))
	result := probeURI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"URI": longURI},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "exceeds maximum length")
}

func TestProbeURI_Timeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()
	time.Sleep(5 * time.Millisecond)

	result := probeURI(ProbeContext{
		Ctx:                ctx,
		FieldValues:        map[string]string{"URI": "http://192.0.2.1"},
		InsecureSkipVerify: true,
	})
	assert.False(t, result.Success)
	assert.Equal(t, "CONNECTION_TIMEOUT", result.Error)
}

func TestProbeURI_MetadataBlocked(t *testing.T) {
	result := probeURI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"URI": "http://169.254.169.254/latest/meta-data"},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "not allowed")
}

func TestProbeURI_DoesNotFollowRedirects(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://evil.com", http.StatusFound)
	}))
	defer ts.Close()

	result := probeURI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{"URI": ts.URL},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "HTTP 302")
}

// --- OCI Probe Tests ---

func TestProbeOCI_Success(t *testing.T) {
	ts := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	host := ts.Listener.Addr().String()
	result := probeOCI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{"OCI_HOST": host},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "reachable and authenticated")
}

func TestProbeOCI_AuthFailed(t *testing.T) {
	ts := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	host := ts.Listener.Addr().String()
	result := probeOCI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{"OCI_HOST": host},
		InsecureSkipVerify: true,
	})
	assert.False(t, result.Success)
	assert.Equal(t, "CONNECTION_FAILED", result.Error)
	assert.Contains(t, result.Message, "Authentication failed")
}

func TestProbeOCI_BothEmpty(t *testing.T) {
	result := probeOCI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "Provide a registry host")
}

func TestProbeOCI_HostFromDockerConfig(t *testing.T) {
	ts := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	host := ts.Listener.Addr().String()
	dockercfg := fmt.Sprintf(`{"auths":{"%s":{"auth":"dXNlcjpwYXNz"}}}`, host)

	result := probeOCI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{".dockerconfigjson": dockercfg},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "reachable and authenticated")
}

func TestProbeOCI_DockerConfigTooLarge(t *testing.T) {
	oversized := `{"auths":{"quay.io":{"auth":"` + string(make([]byte, 65*1024)) + `"}}}`
	result := probeOCI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{".dockerconfigjson": oversized},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "exceeds maximum length")
}

func TestProbeOCI_HostFromDockerConfig_URLForm(t *testing.T) {
	ts := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	host := ts.Listener.Addr().String()
	dockercfg := fmt.Sprintf(`{"auths":{"https://%s/v1/":{"auth":"dXNlcjpwYXNz"}}}`, host)

	result := probeOCI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{".dockerconfigjson": dockercfg},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
}

func TestProbeOCI_HostOnly_NoCredentials(t *testing.T) {
	ts := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	host := ts.Listener.Addr().String()
	result := probeOCI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{"OCI_HOST": host},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
}

func TestProbeOCI_InvalidHostChars(t *testing.T) {
	result := probeOCI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"OCI_HOST": "attacker.com@internal-service"},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "must not contain @")
}

func TestProbeOCI_MetadataBlocked(t *testing.T) {
	result := probeOCI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"OCI_HOST": "169.254.169.254"},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "not allowed")
}

func TestProbeOCI_ImageRefSuccess(t *testing.T) {
	ts := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		if r.URL.Path == "/v2/myorg/myimage/manifests/v1.0" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	host := ts.Listener.Addr().String()
	result := probeOCI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{"OCI_HOST": host + "/myorg/myimage:v1.0"},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "myorg/myimage:v1.0")
}

func TestProbeOCI_ImageRefNotFound(t *testing.T) {
	ts := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	host := ts.Listener.Addr().String()
	result := probeOCI(ProbeContext{
		Ctx:                t.Context(),
		FieldValues:        map[string]string{"OCI_HOST": host + "/myorg/myimage:v1.0"},
		InsecureSkipVerify: true,
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "Image not found")
}

func TestParseOCIRef_HostOnly(t *testing.T) {
	ref := parseOCIRef("quay.io")
	assert.Equal(t, "quay.io", ref.host)
	assert.Empty(t, ref.repo)
	assert.Empty(t, ref.tag)
}

func TestParseOCIRef_HostWithRepo(t *testing.T) {
	ref := parseOCIRef("quay.io/redhat-ai-services/modelcar-catalog:llama-3.2-3b")
	assert.Equal(t, "quay.io", ref.host)
	assert.Equal(t, "redhat-ai-services/modelcar-catalog", ref.repo)
	assert.Equal(t, "llama-3.2-3b", ref.tag)
}

func TestParseOCIRef_NoTag(t *testing.T) {
	ref := parseOCIRef("quay.io/myorg/myimage")
	assert.Equal(t, "quay.io", ref.host)
	assert.Equal(t, "myorg/myimage", ref.repo)
	assert.Empty(t, ref.tag)
}

func TestParseOCIRef_HostPortWithRepoAndTag(t *testing.T) {
	ref := parseOCIRef("registry.example.com:5000/myorg/myimage:v1.0")
	assert.Equal(t, "registry.example.com:5000", ref.host)
	assert.Equal(t, "myorg/myimage", ref.repo)
	assert.Equal(t, "v1.0", ref.tag)
}

// --- S3 Probe Tests ---

func TestProbeS3_MissingEndpoint(t *testing.T) {
	result := probeS3(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"AWS_S3_BUCKET": "mybucket"},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "Missing required field: AWS_S3_ENDPOINT")
}

func TestProbeS3_NoBucket_ListBuckets(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `<?xml version="1.0"?><ListAllMyBucketsResult><Buckets></Buckets></ListAllMyBucketsResult>`)
	}))
	defer ts.Close()

	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       ts.URL,
			"AWS_ACCESS_KEY_ID":     "key",
			"AWS_SECRET_ACCESS_KEY": "secret",
		},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "credentials are valid")
}

func TestProbeS3_ConnectionRefused(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	addr := ln.Addr().String()
	ln.Close()

	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       "http://" + addr,
			"AWS_S3_BUCKET":         "test",
			"AWS_ACCESS_KEY_ID":     "key",
			"AWS_SECRET_ACCESS_KEY": "secret",
		},
		InsecureSkipVerify: true,
	})
	assert.False(t, result.Success)
	assert.Equal(t, "CONNECTION_FAILED", result.Error)
}

func TestProbeS3_MetadataBlocked(t *testing.T) {
	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       "http://169.254.169.254",
			"AWS_S3_BUCKET":         "test",
			"AWS_ACCESS_KEY_ID":     "key",
			"AWS_SECRET_ACCESS_KEY": "secret",
		},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "not allowed")
}

func TestProbeS3_MockHeadBucketSuccess(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       ts.URL,
			"AWS_S3_BUCKET":         "test-bucket",
			"AWS_ACCESS_KEY_ID":     "testkey",
			"AWS_SECRET_ACCESS_KEY": "testsecret",
		},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "test-bucket")
}

func TestProbeS3_MockHeadBucketNotFound(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       ts.URL,
			"AWS_S3_BUCKET":         "nonexistent",
			"AWS_ACCESS_KEY_ID":     "testkey",
			"AWS_SECRET_ACCESS_KEY": "testsecret",
		},
		InsecureSkipVerify: true,
	})
	assert.False(t, result.Success)
	assert.Equal(t, "CONNECTION_FAILED", result.Error)
}

func TestProbeS3_MockHeadBucketForbidden(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer ts.Close()

	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       ts.URL,
			"AWS_S3_BUCKET":         "private-bucket",
			"AWS_ACCESS_KEY_ID":     "badkey",
			"AWS_SECRET_ACCESS_KEY": "badsecret",
		},
		InsecureSkipVerify: true,
	})
	assert.False(t, result.Success)
	assert.Equal(t, "CONNECTION_FAILED", result.Error)
}

// --- OCI Auth Extraction Tests ---

func TestExtractOCIAuth_ExactHost(t *testing.T) {
	dockercfg := fmt.Sprintf(`{"auths":{"quay.io":{"auth":"%s"}}}`, "dXNlcjpwYXNz")
	header, ok := extractOCIAuth(dockercfg, "quay.io", "")
	assert.True(t, ok)
	assert.Equal(t, "Basic dXNlcjpwYXNz", header)
}

func TestExtractOCIAuth_URLFormKey(t *testing.T) {
	dockercfg := fmt.Sprintf(`{"auths":{"https://quay.io":{"auth":"%s"}}}`, "dXNlcjpwYXNz")
	header, ok := extractOCIAuth(dockercfg, "quay.io", "")
	assert.True(t, ok)
	assert.Equal(t, "Basic dXNlcjpwYXNz", header)
}

func TestExtractOCIAuth_URLFormWithPath(t *testing.T) {
	dockercfg := fmt.Sprintf(`{"auths":{"https://quay.io/v1/":{"auth":"%s"}}}`, "dXNlcjpwYXNz")
	header, ok := extractOCIAuth(dockercfg, "quay.io", "")
	assert.True(t, ok)
	assert.Equal(t, "Basic dXNlcjpwYXNz", header)
}

func TestExtractOCIAuth_NoMatch(t *testing.T) {
	dockercfg := `{"auths":{"other.io":{"auth":"dXNlcjpwYXNz"}}}`
	_, ok := extractOCIAuth(dockercfg, "quay.io", "")
	assert.False(t, ok)
}

func TestExtractOCIAuth_EmptyUsername(t *testing.T) {
	dockercfg := fmt.Sprintf(`{"auths":{"quay.io":{"auth":"%s"}}}`, base64.StdEncoding.EncodeToString([]byte(":password")))
	_, ok := extractOCIAuth(dockercfg, "quay.io", "")
	assert.False(t, ok)
}

func TestExtractOCIAuth_InvalidJSON(t *testing.T) {
	_, ok := extractOCIAuth("not-json", "quay.io", "")
	assert.False(t, ok)
}

// --- Path-based credential matching (mirrors kubelet) ---

func TestExtractOCIAuth_PathBased_ExactRepo(t *testing.T) {
	dockercfg := fmt.Sprintf(`{"auths":{"quay.io/redhat-ai-services":{"auth":"%s"}}}`, "dXNlcjpwYXNz")
	_, ok := extractOCIAuth(dockercfg, "quay.io", "redhat-ai-services/modelcar")
	assert.True(t, ok)
}

func TestExtractOCIAuth_PathBased_FullRepoPath(t *testing.T) {
	dockercfg := fmt.Sprintf(`{"auths":{"quay.io/redhat-ai-services/modelcar":{"auth":"%s"}}}`, "dXNlcjpwYXNz")
	_, ok := extractOCIAuth(dockercfg, "quay.io", "redhat-ai-services/modelcar")
	assert.True(t, ok)
}

func TestExtractOCIAuth_PathBased_FallsBackToHost(t *testing.T) {
	dockercfg := fmt.Sprintf(`{"auths":{"quay.io":{"auth":"%s"}}}`, "dXNlcjpwYXNz")
	_, ok := extractOCIAuth(dockercfg, "quay.io", "redhat-ai-services/modelcar")
	assert.True(t, ok)
}

func TestExtractOCIAuth_PathBased_NoMatchDifferentOrg(t *testing.T) {
	dockercfg := `{"auths":{"quay.io/other-org":{"auth":"dXNlcjpwYXNz"}}}`
	_, ok := extractOCIAuth(dockercfg, "quay.io", "redhat-ai-services/modelcar")
	assert.False(t, ok)
}

func TestSingleDockerConfigHost_BareHost(t *testing.T) {
	host, ok := singleDockerConfigHost(`{"auths":{"quay.io":{"auth":"abc"}}}`)
	assert.True(t, ok)
	assert.Equal(t, "quay.io", host)
}

func TestSingleDockerConfigHost_URLForm(t *testing.T) {
	host, ok := singleDockerConfigHost(`{"auths":{"https://quay.io/v1/":{"auth":"abc"}}}`)
	assert.True(t, ok)
	assert.Equal(t, "quay.io", host)
}

func TestSingleDockerConfigHost_Empty(t *testing.T) {
	_, ok := singleDockerConfigHost(`{"auths":{}}`)
	assert.False(t, ok)
}

func TestSingleDockerConfigHost_MultiRegistry(t *testing.T) {
	_, ok := singleDockerConfigHost(`{"auths":{"quay.io":{"auth":"abc"},"ghcr.io":{"auth":"def"}}}`)
	assert.False(t, ok)
}

// --- Build Registry Tests ---

func TestBuildRegistry_RealMode(t *testing.T) {
	registry := buildRegistry(false)
	assert.Len(t, registry, len(probeEntries))
	for key := range probeEntries {
		_, ok := registry[key]
		assert.True(t, ok, "real registry missing key: %s", key)
	}
}

func TestBuildRegistry_MockMode(t *testing.T) {
	registry := buildRegistry(true)
	assert.Len(t, registry, len(probeEntries))
	for key := range probeEntries {
		_, ok := registry[key]
		assert.True(t, ok, "mock registry missing key: %s", key)
	}
}

// --- Security Edge Case Tests ---

func TestProbeS3_FileSchemeBlocked(t *testing.T) {
	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       "file:///etc/passwd",
			"AWS_S3_BUCKET":         "test",
			"AWS_ACCESS_KEY_ID":     "key",
			"AWS_SECRET_ACCESS_KEY": "secret",
		},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "http or https")
}

func TestProbeS3_NoSchemeBlocked(t *testing.T) {
	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       "minio:9000",
			"AWS_S3_BUCKET":         "test",
			"AWS_ACCESS_KEY_ID":     "key",
			"AWS_SECRET_ACCESS_KEY": "secret",
		},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "http or https")
}

func TestProbeS3_EndpointWithPathBlocked(t *testing.T) {
	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       "http://minio:9000/some/path",
			"AWS_S3_BUCKET":         "test",
			"AWS_ACCESS_KEY_ID":     "key",
			"AWS_SECRET_ACCESS_KEY": "secret",
		},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "must not include a path")
}

func TestProbeS3_MissingAccessKey(t *testing.T) {
	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       "http://minio:9000",
			"AWS_S3_BUCKET":         "test",
			"AWS_SECRET_ACCESS_KEY": "secret",
		},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "AWS_ACCESS_KEY_ID")
}

func TestProbeS3_MissingSecretKey(t *testing.T) {
	result := probeS3(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":   "http://minio:9000",
			"AWS_S3_BUCKET":     "test",
			"AWS_ACCESS_KEY_ID": "key",
		},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "AWS_SECRET_ACCESS_KEY")
}

func TestProbeURI_EmptyHost(t *testing.T) {
	result := probeURI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"URI": "https://"},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "valid host")
}

func TestProbeURI_GoogleMetadataBlocked(t *testing.T) {
	result := probeURI(ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"URI": "http://metadata.google.internal/computeMetadata/v1"},
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "not allowed")
}

func TestProbeOCI_StripOCIScheme(t *testing.T) {
	ref := parseOCIRef("oci://registry.example.com/myorg/myimage:v1")
	assert.Equal(t, "registry.example.com", ref.host)
	assert.Equal(t, "myorg/myimage", ref.repo)
	assert.Equal(t, "v1", ref.tag)
}

func TestParseOCIRef_WithOCIScheme(t *testing.T) {
	ref := parseOCIRef("oci://quay.io/org/repo:tag")
	assert.Equal(t, "quay.io", ref.host)
	assert.Equal(t, "org/repo", ref.repo)
	assert.Equal(t, "tag", ref.tag)
}

func TestProbeOCI_BearerTokenExchange(t *testing.T) {
	tokenServer := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Basic dXNlcjpwYXNz" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"token":"test-bearer-token-123"}`)
	}))
	defer tokenServer.Close()

	registry := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/myorg/myimage/manifests/v1" {
			auth := r.Header.Get("Authorization")
			if auth == "Bearer test-bearer-token-123" {
				w.WriteHeader(http.StatusOK)
				return
			}
			w.Header().Set("Www-Authenticate",
				fmt.Sprintf(`Bearer realm="%s",service="test-registry",scope="repository:myorg/myimage:pull"`, tokenServer.URL))
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer registry.Close()

	host := registry.Listener.Addr().String()
	dockercfg := fmt.Sprintf(`{"auths":{"%s":{"auth":"dXNlcjpwYXNz"}}}`, host)

	result := probeOCI(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"OCI_HOST":          host + "/myorg/myimage:v1",
			".dockerconfigjson": dockercfg,
		},
		InsecureSkipVerify: true,
	})
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "myorg/myimage:v1")
}

func TestProbeOCI_BearerTokenExchange_BadCredentials(t *testing.T) {
	tokenServer := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer tokenServer.Close()

	registry := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Www-Authenticate",
			fmt.Sprintf(`Bearer realm="%s",service="test-registry",scope="repository:org/repo:pull"`, tokenServer.URL))
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer registry.Close()

	host := registry.Listener.Addr().String()
	dockercfg := fmt.Sprintf(`{"auths":{"%s":{"auth":"YmFkOnBhc3M="}}}`, host)

	result := probeOCI(ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"OCI_HOST":          host + "/org/repo:tag",
			".dockerconfigjson": dockercfg,
		},
		InsecureSkipVerify: true,
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "Access denied")
}

func TestParseBearerChallenge(t *testing.T) {
	challenge := `realm="https://auth.example.com/token",service="registry.example.com",scope="repository:org/repo:pull"`
	params := parseBearerChallenge(challenge)
	assert.Equal(t, "https://auth.example.com/token", params["realm"])
	assert.Equal(t, "registry.example.com", params["service"])
	assert.Equal(t, "repository:org/repo:pull", params["scope"])
}

func TestParseBearerChallenge_Empty(t *testing.T) {
	params := parseBearerChallenge("")
	assert.Empty(t, params)
}

func TestFetchBearerToken_RejectsHTTPRealm(t *testing.T) {
	challenge := `Bearer realm="http://attacker.com/token",service="evil"`
	_, ok := fetchBearerToken(t.Context(), newTLSHTTPClient(nil, true), challenge, "Basic dXNlcjpwYXNz")
	assert.False(t, ok)
}

func TestFetchBearerToken_RejectsMetadataRealm(t *testing.T) {
	challenge := `Bearer realm="https://169.254.169.254/latest/meta-data",service="evil"`
	_, ok := fetchBearerToken(t.Context(), newTLSHTTPClient(nil, true), challenge, "Basic dXNlcjpwYXNz")
	assert.False(t, ok)
}

// --- normalizeConnectionType ---

func TestNormalizeConnectionType_ExactMatch(t *testing.T) {
	assert.Equal(t, "s3", normalizeConnectionType("s3"))
	assert.Equal(t, "uri", normalizeConnectionType("uri"))
	assert.Equal(t, "oci", normalizeConnectionType("oci"))
}

func TestNormalizeConnectionType_VersionedDash(t *testing.T) {
	assert.Equal(t, "s3", normalizeConnectionType("s3-v1"))
	assert.Equal(t, "uri", normalizeConnectionType("uri-v1"))
	assert.Equal(t, "oci", normalizeConnectionType("oci-v2"))
}

func TestNormalizeConnectionType_VersionedUnderscore(t *testing.T) {
	assert.Equal(t, "s3", normalizeConnectionType("s3_v1"))
	assert.Equal(t, "uri", normalizeConnectionType("uri_v2"))
}

func TestNormalizeConnectionType_Unknown(t *testing.T) {
	assert.Equal(t, "mysql", normalizeConnectionType("mysql"))
	assert.Equal(t, "custom-type", normalizeConnectionType("custom-type"))
}

// --- Error message sanitization ---

func TestProbeURI_DNSError_NoResolverIP(t *testing.T) {
	pc := ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"URI": "https://this-host-does-not-exist-1234567890.invalid"},
		RootCAs:     nil,
	}
	result := probeURI(pc)
	assert.False(t, result.Success)
	// Must match our sanitized format — no raw Go DNS error details
	assert.Contains(t, result.Message, "check the hostname")
	assert.NotContains(t, result.Message, "lookup")
	assert.NotContains(t, result.Message, "no such host")
}

func TestProbeOCI_DNSError_NoResolverIP(t *testing.T) {
	pc := ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"OCI_HOST": "nonexistent-registry-xyz.invalid"},
		RootCAs:     nil,
	}
	result := probeOCI(pc)
	assert.False(t, result.Success)
	assert.NotContains(t, result.Message, "lookup")
	assert.NotContains(t, result.Message, "no such host")
}

func TestProbeS3_DNSError_NoResolverIP(t *testing.T) {
	pc := ProbeContext{
		Ctx: t.Context(),
		FieldValues: map[string]string{
			"AWS_S3_ENDPOINT":       "https://nonexistent-s3-xyz.invalid",
			"AWS_ACCESS_KEY_ID":     "testkey",
			"AWS_SECRET_ACCESS_KEY": "testsecret",
		},
		RootCAs: nil,
	}
	result := probeS3(pc)
	assert.False(t, result.Success)
	assert.NotContains(t, result.Message, "lookup")
	assert.NotContains(t, result.Message, "no such host")
}

// --- Error output format validation ---

func TestTestConnection_ErrorResponse_HasCorrectFormat(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	body := `{"connectionType":"unknown-type-xyz","fieldValues":{"key":"value"}}`
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	var resp map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	assert.NoError(t, err)
	errObj, ok := resp["error"].(map[string]interface{})
	assert.True(t, ok, "response must have 'error' object")
	assert.Equal(t, "UNSUPPORTED_TYPE", errObj["code"])
	assert.Contains(t, errObj["message"], "unknown-type-xyz")
}

func TestTestConnection_SuccessResponse_HasCorrectFormat(t *testing.T) {
	app := newTestApp()
	app.config.MockHTTPClient = true
	admin := k8mocks.DefaultTestUsers[0]

	body := `{"connectionType":"uri","fieldValues":{"URI":"https://example.com"}}`
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTestPath, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.TestConnectionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	assert.NoError(t, err)
	data, ok := resp["data"].(map[string]interface{})
	assert.True(t, ok, "response must have 'data' envelope")
	assert.Equal(t, true, data["success"])
	assert.NotEmpty(t, data["message"])
}

// --- IPv6 OCI host port validation ---

func TestProbeOCI_IPv6Host_PortValidation(t *testing.T) {
	// [fe80::1]:5000 should pass port validation but get blocked (link-local)
	pc := ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"OCI_HOST": "[fe80::1]:5000"},
		RootCAs:     nil,
	}
	result := probeOCI(pc)
	assert.False(t, result.Success)
	assert.NotContains(t, result.Message, "port must be numeric")
	assert.Contains(t, result.Message, "not allowed")
}

func TestProbeOCI_NonNumericPort_Rejected(t *testing.T) {
	pc := ProbeContext{
		Ctx:         t.Context(),
		FieldValues: map[string]string{"OCI_HOST": "registry.example.com:latest"},
		RootCAs:     nil,
	}
	result := probeOCI(pc)
	assert.False(t, result.Success)
	assert.Contains(t, result.Message, "port must be numeric")
}

// --- Unpadded base64 docker auth ---

func TestDecodeDockerAuth_PaddedBase64(t *testing.T) {
	encoded := base64.StdEncoding.EncodeToString([]byte("user:pass"))
	auth, ok := decodeDockerAuth(encoded)
	assert.True(t, ok)
	assert.Equal(t, "Basic "+encoded, auth)
}

func TestDecodeDockerAuth_UnpaddedBase64(t *testing.T) {
	encoded := base64.RawStdEncoding.EncodeToString([]byte("user:pass"))
	auth, ok := decodeDockerAuth(encoded)
	assert.True(t, ok)
	assert.Equal(t, "Basic "+encoded, auth)
}

func TestDecodeDockerAuth_InvalidBase64(t *testing.T) {
	_, ok := decodeDockerAuth("not-valid-base64!!!")
	assert.False(t, ok)
}
