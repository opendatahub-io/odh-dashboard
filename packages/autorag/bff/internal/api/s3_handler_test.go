package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// silentLogger returns a logger that discards all output.
func silentLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// ctxWithNamespace returns a context with a namespace value attached.
func ctxWithNamespace(ns string) context.Context {
	return context.WithValue(context.Background(), constants.NamespaceHeaderParameterKey, ns)
}

// newGetFileRequest creates an httptest.NewRequest for GetS3FileHandler with
// namespace in context and optional query params.
func newGetFileRequest(t *testing.T, ns, key, queryString string) *http.Request {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/s3/files/placeholder", nil)
	if queryString != "" {
		req.URL.RawQuery = queryString
	}
	if ns != "" {
		req = req.WithContext(ctxWithNamespace(ns))
	}
	return req
}

// --- GetS3FileHandler tests ---

func TestGetS3FileHandler(t *testing.T) {
	tests := []struct {
		name             string
		namespace        string
		key              string
		queryString      string
		setupMock        func(repo *mockS3Repo)
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:        "success returns object body",
			namespace:   "test-ns",
			key:         "data.csv",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "data.csv").
					Return(&repositories.GetObjectResult{
						Body:          io.NopCloser(strings.NewReader("col1,col2\na,b\n")),
						ContentType:   "text/csv",
						ForceDownload: false,
					}, nil)
			},
			wantStatusCode:   http.StatusOK,
			wantBodyContains: "col1,col2",
		},
		{
			name:             "invalid secretName returns 400",
			namespace:        "test-ns",
			key:              "data.csv",
			queryString:      "secretName=INVALID_NAME%21%21%21",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "invalid secretName",
		},
		{
			name:             "missing key returns 400",
			namespace:        "test-ns",
			key:              "",
			queryString:      "secretName=my-secret",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "key",
		},
		{
			name:             "missing namespace returns 400",
			namespace:        "",
			key:              "data.csv",
			queryString:      "secretName=my-secret",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "missing namespace",
		},
		{
			name:        "repo ErrNotFound returns 404",
			namespace:   "test-ns",
			key:         "missing.csv",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "missing.csv").
					Return(nil, fmt.Errorf("secret not found: %w", kubernetes.ErrNotFound))
			},
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not found",
		},
		{
			name:        "repo ErrForbidden returns 403",
			namespace:   "test-ns",
			key:         "secret.csv",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "secret.csv").
					Return(nil, fmt.Errorf("forbidden: %w", kubernetes.ErrForbidden))
			},
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "forbidden",
		},
		{
			name:        "repo ErrUnauthorized returns 401",
			namespace:   "test-ns",
			key:         "data.csv",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "data.csv").
					Return(nil, fmt.Errorf("unauthorized: %w", kubernetes.ErrUnauthorized))
			},
			wantStatusCode:   http.StatusUnauthorized,
			wantBodyContains: "unauthorized",
		},
		{
			name:        "repo s3.ErrObjectNotFound returns 404",
			namespace:   "test-ns",
			key:         "gone.csv",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "gone.csv").
					Return(nil, fmt.Errorf("object missing: %w", s3.ErrObjectNotFound))
			},
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not found",
		},
		{
			name:        "repo s3.ErrAccessDenied returns 403",
			namespace:   "test-ns",
			key:         "denied.csv",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "denied.csv").
					Return(nil, fmt.Errorf("s3 denied: %w", s3.ErrAccessDenied))
			},
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "access denied",
		},
		{
			name:        "repo generic error returns 500",
			namespace:   "test-ns",
			key:         "data.csv",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "data.csv").
					Return(nil, errors.New("unexpected failure"))
			},
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "server encountered a problem",
		},
		{
			name:        "force download sets Content-Disposition",
			namespace:   "test-ns",
			key:         "binary.bin",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "binary.bin").
					Return(&repositories.GetObjectResult{
						Body:          io.NopCloser(strings.NewReader("binary data")),
						ContentType:   "application/octet-stream",
						ForceDownload: true,
					}, nil)
			},
			wantStatusCode: http.StatusOK,
		},
		{
			name:        "s3.ErrBucketNotFound returns 404",
			namespace:   "test-ns",
			key:         "data.csv",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.Anything, "data.csv").
					Return(nil, fmt.Errorf("bucket missing: %w", s3.ErrBucketNotFound))
			},
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "bucket not found",
		},
		{
			name:        "no secretName uses DSPA path",
			namespace:   "test-ns",
			key:         "data.csv",
			queryString: "",
			setupMock: func(repo *mockS3Repo) {
				repo.On("GetObject", mock.Anything, mock.MatchedBy(func(req repositories.S3RequestContext) bool {
					return req.SecretName == ""
				}), "data.csv").
					Return(&repositories.GetObjectResult{
						Body:          io.NopCloser(strings.NewReader("csv data")),
						ContentType:   "text/csv",
						ForceDownload: false,
					}, nil)
			},
			wantStatusCode:   http.StatusOK,
			wantBodyContains: "csv data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := new(mockS3Repo)
			tt.setupMock(repo)

			handler := &S3Handler{
				logger: silentLogger(),
				repo:   repo,
			}

			req := newGetFileRequest(t, tt.namespace, tt.key, tt.queryString)
			rr := httptest.NewRecorder()
			ps := httprouter.Params{{Key: "key", Value: tt.key}}

			handler.GetS3FileHandler(rr, req, ps)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}

			// Verify force download headers when applicable.
			if tt.name == "force download sets Content-Disposition" {
				assert.Equal(t, "attachment", rr.Header().Get("Content-Disposition"))
				assert.Equal(t, "nosniff", rr.Header().Get("X-Content-Type-Options"))
			}

			repo.AssertExpectations(t)
		})
	}
}

// --- GetS3FilesHandler tests ---

func TestGetS3FilesHandler(t *testing.T) {
	tests := []struct {
		name             string
		namespace        string
		queryString      string
		setupMock        func(repo *mockS3Repo)
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:        "success returns file list",
			namespace:   "test-ns",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("ListObjects", mock.Anything, mock.Anything, mock.Anything).
					Return(&s3.ListObjectsResponse{
						Contents: []s3.ObjectInfo{{Key: "file1.csv", Size: 100}},
						KeyCount: 1,
					}, nil)
			},
			wantStatusCode:   http.StatusOK,
			wantBodyContains: "file1.csv",
		},
		{
			name:             "empty path param returns 400",
			namespace:        "test-ns",
			queryString:      "secretName=my-secret&path=",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "path",
		},
		{
			name:             "search with slash returns 400",
			namespace:        "test-ns",
			queryString:      "secretName=my-secret&search=foo/bar",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "search",
		},
		{
			name:             "invalid limit returns 400",
			namespace:        "test-ns",
			queryString:      "secretName=my-secret&limit=0",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "limit",
		},
		{
			name:             "limit exceeds max returns 400",
			namespace:        "test-ns",
			queryString:      "secretName=my-secret&limit=9999",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "limit",
		},
		{
			name:             "non-numeric limit returns 400",
			namespace:        "test-ns",
			queryString:      "secretName=my-secret&limit=abc",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "limit",
		},
		{
			name:             "empty next param returns 400",
			namespace:        "test-ns",
			queryString:      "secretName=my-secret&next=",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "next",
		},
		{
			name:             "missing namespace returns 400",
			namespace:        "",
			queryString:      "secretName=my-secret",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "namespace",
		},
		{
			name:        "repo error returns appropriate status",
			namespace:   "test-ns",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("ListObjects", mock.Anything, mock.Anything, mock.Anything).
					Return(nil, fmt.Errorf("access denied: %w", s3.ErrAccessDenied))
			},
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "access denied",
		},
		{
			name:        "nil result returns 500",
			namespace:   "test-ns",
			queryString: "secretName=my-secret",
			setupMock: func(repo *mockS3Repo) {
				repo.On("ListObjects", mock.Anything, mock.Anything, mock.Anything).
					Return(nil, nil)
			},
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "server encountered a problem",
		},
		{
			name:        "with valid limit and path",
			namespace:   "test-ns",
			queryString: "secretName=my-secret&limit=50&path=folder/",
			setupMock: func(repo *mockS3Repo) {
				repo.On("ListObjects", mock.Anything, mock.Anything, mock.MatchedBy(func(opts s3.ListObjectsOptions) bool {
					return opts.Limit == 50 && opts.Path == "folder/"
				})).
					Return(&s3.ListObjectsResponse{
						Contents: []s3.ObjectInfo{},
						KeyCount: 0,
					}, nil)
			},
			wantStatusCode: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := new(mockS3Repo)
			tt.setupMock(repo)

			handler := &S3Handler{
				logger: silentLogger(),
				repo:   repo,
			}

			target := "/api/v1/s3/files"
			if tt.queryString != "" {
				target += "?" + tt.queryString
			}
			req := httptest.NewRequest(http.MethodGet, target, nil)
			if tt.namespace != "" {
				req = req.WithContext(ctxWithNamespace(tt.namespace))
			}
			rr := httptest.NewRecorder()

			handler.GetS3FilesHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
			repo.AssertExpectations(t)
		})
	}
}

// --- PostS3FileHandler tests ---

// newMultipartRequest builds a multipart/form-data request with a file part.
func newMultipartRequest(t *testing.T, ns, key, queryString, filename, fileContent, partContentType string) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, filename))
	if partContentType != "" {
		h.Set("Content-Type", partContentType)
	}
	part, err := writer.CreatePart(h)
	if err != nil {
		t.Fatal(err)
	}
	_, err = part.Write([]byte(fileContent))
	if err != nil {
		t.Fatal(err)
	}
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/s3/files/placeholder", &buf)
	if queryString != "" {
		req.URL.RawQuery = queryString
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if ns != "" {
		req = req.WithContext(ctxWithNamespace(ns))
	}
	return req
}

func TestPostS3FileHandler(t *testing.T) {
	tests := []struct {
		name             string
		namespace        string
		key              string
		queryString      string
		filename         string
		fileContent      string
		partContentType  string
		setupMock        func(repo *mockS3Repo)
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:            "success uploads file",
			namespace:       "test-ns",
			key:             "upload.csv",
			queryString:     "secretName=my-secret",
			filename:        "upload.csv",
			fileContent:     "a,b\n1,2\n",
			partContentType: "text/csv",
			setupMock: func(repo *mockS3Repo) {
				repo.On("UploadFile", mock.Anything, mock.Anything, "upload.csv", mock.Anything, "text/csv", 0).
					Return("upload.csv", nil)
			},
			wantStatusCode:   http.StatusCreated,
			wantBodyContains: `"uploaded": true`,
		},
		{
			name:             "missing secretName returns 400",
			namespace:        "test-ns",
			key:              "upload.csv",
			queryString:      "",
			filename:         "upload.csv",
			fileContent:      "a,b\n1,2\n",
			partContentType:  "text/csv",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "secretName",
		},
		{
			name:             "invalid secretName returns 400",
			namespace:        "test-ns",
			key:              "upload.csv",
			queryString:      "secretName=BAD_NAME%21",
			filename:         "upload.csv",
			fileContent:      "a,b\n1,2\n",
			partContentType:  "text/csv",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "invalid secretName",
		},
		{
			name:             "missing key returns 400",
			namespace:        "test-ns",
			key:              "",
			queryString:      "secretName=my-secret",
			filename:         "upload.csv",
			fileContent:      "a,b\n1,2\n",
			partContentType:  "text/csv",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "key",
		},
		{
			name:             "missing namespace returns 400",
			namespace:        "",
			key:              "upload.csv",
			queryString:      "secretName=my-secret",
			filename:         "upload.csv",
			fileContent:      "a,b\n1,2\n",
			partContentType:  "text/csv",
			setupMock:        func(repo *mockS3Repo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "namespace",
		},
		{
			name:            "repo ErrNotFound returns 404",
			namespace:       "test-ns",
			key:             "upload.csv",
			queryString:     "secretName=my-secret",
			filename:        "upload.csv",
			fileContent:     "a,b\n1,2\n",
			partContentType: "text/csv",
			setupMock: func(repo *mockS3Repo) {
				repo.On("UploadFile", mock.Anything, mock.Anything, "upload.csv", mock.Anything, "text/csv", 0).
					Return("", fmt.Errorf("not found: %w", kubernetes.ErrNotFound))
			},
			wantStatusCode: http.StatusNotFound,
		},
		{
			name:            "repo ErrObjectAlreadyExists returns 409",
			namespace:       "test-ns",
			key:             "upload.csv",
			queryString:     "secretName=my-secret",
			filename:        "upload.csv",
			fileContent:     "a,b\n1,2\n",
			partContentType: "text/csv",
			setupMock: func(repo *mockS3Repo) {
				repo.On("UploadFile", mock.Anything, mock.Anything, "upload.csv", mock.Anything, "text/csv", 0).
					Return("", fmt.Errorf("already exists: %w", s3.ErrObjectAlreadyExists))
			},
			wantStatusCode:   http.StatusConflict,
			wantBodyContains: "already exists",
		},
		{
			name:            "repo ErrMaxCollisionsExceeded returns 409",
			namespace:       "test-ns",
			key:             "upload.csv",
			queryString:     "secretName=my-secret",
			filename:        "upload.csv",
			fileContent:     "a,b\n1,2\n",
			partContentType: "text/csv",
			setupMock: func(repo *mockS3Repo) {
				repo.On("UploadFile", mock.Anything, mock.Anything, "upload.csv", mock.Anything, "text/csv", 0).
					Return("", fmt.Errorf("collision: %w", s3.ErrMaxCollisionsExceeded))
			},
			wantStatusCode:   http.StatusConflict,
			wantBodyContains: "unique filename",
		},
		{
			name:            "repo generic error returns 500",
			namespace:       "test-ns",
			key:             "upload.csv",
			queryString:     "secretName=my-secret",
			filename:        "upload.csv",
			fileContent:     "a,b\n1,2\n",
			partContentType: "text/csv",
			setupMock: func(repo *mockS3Repo) {
				repo.On("UploadFile", mock.Anything, mock.Anything, "upload.csv", mock.Anything, "text/csv", 0).
					Return("", errors.New("unexpected"))
			},
			wantStatusCode: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := new(mockS3Repo)
			tt.setupMock(repo)

			handler := &S3Handler{
				logger: silentLogger(),
				repo:   repo,
			}

			req := newMultipartRequest(t, tt.namespace, tt.key, tt.queryString, tt.filename, tt.fileContent, tt.partContentType)
			rr := httptest.NewRecorder()
			ps := httprouter.Params{{Key: "key", Value: tt.key}}

			handler.PostS3FileHandler(rr, req, ps)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
			repo.AssertExpectations(t)
		})
	}
}

// --- rejectDeclaredOversizedS3Post tests ---

func TestRejectDeclaredOversizedS3Post(t *testing.T) {
	tests := []struct {
		name           string
		contentLength  int64
		wantStatusCode int
		wantBlocked    bool
	}{
		{
			name:           "normal request passes through",
			contentLength:  1024,
			wantStatusCode: http.StatusOK,
			wantBlocked:    false,
		},
		{
			name:           "oversized Content-Length returns 413",
			contentLength:  200 << 20, // 200 MiB exceeds the 32 MiB + 64 MiB max
			wantStatusCode: http.StatusRequestEntityTooLarge,
			wantBlocked:    true,
		},
		{
			name:           "unknown length (chunked) passes through",
			contentLength:  -1,
			wantStatusCode: http.StatusOK,
			wantBlocked:    false,
		},
		{
			name:           "zero length passes through",
			contentLength:  0,
			wantStatusCode: http.StatusOK,
			wantBlocked:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := &S3Handler{
				logger: silentLogger(),
			}

			innerCalled := false
			inner := func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
				innerCalled = true
				w.WriteHeader(http.StatusOK)
			}

			wrapped := handler.rejectDeclaredOversizedS3Post(inner)

			req := httptest.NewRequest(http.MethodPost, "/upload", nil)
			req.ContentLength = tt.contentLength
			rr := httptest.NewRecorder()

			wrapped(rr, req, httprouter.Params{})

			if tt.wantBlocked {
				assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)
				assert.False(t, innerCalled)
			} else {
				assert.Equal(t, http.StatusOK, rr.Code)
				assert.True(t, innerCalled)
			}
		})
	}
}

// --- handleS3RepoError comprehensive tests ---

func TestHandleS3RepoError(t *testing.T) {
	tests := []struct {
		name             string
		err              error
		key              string
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:             "kubernetes ErrNotFound",
			err:              fmt.Errorf("wrapped: %w", kubernetes.ErrNotFound),
			key:              "file.csv",
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not found",
		},
		{
			name:             "kubernetes ErrForbidden",
			err:              fmt.Errorf("wrapped: %w", kubernetes.ErrForbidden),
			key:              "file.csv",
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "insufficient permissions",
		},
		{
			name:           "kubernetes ErrUnauthorized",
			err:            fmt.Errorf("wrapped: %w", kubernetes.ErrUnauthorized),
			key:            "file.csv",
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name:             "pipelines ErrNoDSPAFound",
			err:              fmt.Errorf("wrapped: %w", pipelines.ErrNoDSPAFound),
			key:              "",
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "Pipeline Server",
		},
		{
			name:             "pipelines ErrDSPANotReady",
			err:              fmt.Errorf("wrapped: %w", pipelines.ErrDSPANotReady),
			key:              "",
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "not ready",
		},
		{
			name:             "s3 ErrObjectNotFound",
			err:              fmt.Errorf("wrapped: %w", s3.ErrObjectNotFound),
			key:              "missing.csv",
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "missing.csv",
		},
		{
			name:             "s3 ErrBucketNotFound",
			err:              fmt.Errorf("wrapped: %w", s3.ErrBucketNotFound),
			key:              "",
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "bucket not found",
		},
		{
			name:             "s3 ErrAccessDenied with key",
			err:              fmt.Errorf("wrapped: %w", s3.ErrAccessDenied),
			key:              "secret.csv",
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "secret.csv",
		},
		{
			name:             "s3 ErrAccessDenied without key",
			err:              fmt.Errorf("wrapped: %w", s3.ErrAccessDenied),
			key:              "",
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "access denied to S3 bucket",
		},
		{
			name:             "s3 ErrObjectAlreadyExists",
			err:              fmt.Errorf("wrapped: %w", s3.ErrObjectAlreadyExists),
			key:              "dup.csv",
			wantStatusCode:   http.StatusConflict,
			wantBodyContains: "already exists",
		},
		{
			name:             "repositories ErrDSPAConfiguration",
			err:              fmt.Errorf("DSPA problem: %w", repositories.ErrDSPAConfiguration),
			key:              "",
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "DSPA",
		},
		{
			name:           "s3 ErrInvalidKey",
			err:            fmt.Errorf("wrapped: %w", s3.ErrInvalidKey),
			key:            "bad-key",
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "kubernetes ErrAmbiguousSecretKey",
			err:            fmt.Errorf("wrapped: %w", kubernetes.ErrAmbiguousSecretKey),
			key:            "",
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "s3 ErrEndpointValidation",
			err:            fmt.Errorf("wrapped: %w", s3.ErrEndpointValidation),
			key:            "",
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "repositories ErrS3Configuration",
			err:            fmt.Errorf("wrapped: %w", repositories.ErrS3Configuration),
			key:            "",
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "generic error returns 500",
			err:            errors.New("something broke"),
			key:            "",
			wantStatusCode: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := &S3Handler{
				logger: silentLogger(),
			}

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			rr := httptest.NewRecorder()

			handler.handleS3RepoError(rr, req, tt.err, tt.key)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
		})
	}
}

// --- PostS3FileHandler payload too large test ---

func TestPostS3FileHandler_PayloadTooLarge(t *testing.T) {
	handler := &S3Handler{
		logger:              silentLogger(),
		repo:                new(mockS3Repo),
		maxFilePartBytes:    10, // Very small limit to trigger MaxBytesError
		maxRequestBodyBytes: 50, // Small total body limit
	}

	// Create a multipart request with a file larger than the cap.
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("file", "large.csv")
	if err != nil {
		t.Fatal(err)
	}
	// Write more data than the maxFilePartBytes limit
	_, err = part.Write(bytes.Repeat([]byte("x"), 100))
	if err != nil {
		t.Fatal(err)
	}
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/s3/files/large.csv?secretName=my-secret", &buf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(ctxWithNamespace("test-ns"))

	rr := httptest.NewRecorder()
	ps := httprouter.Params{{Key: "key", Value: "large.csv"}}

	handler.PostS3FileHandler(rr, req, ps)

	// The handler should detect the oversized body during multipart reading or upload
	// and return either 413 (too large) or 400 (bad request).
	assert.True(t, rr.Code == http.StatusRequestEntityTooLarge || rr.Code == http.StatusBadRequest,
		"expected 413 or 400, got %d", rr.Code)
}

// --- PostS3FileHandler missing file part test ---

func TestPostS3FileHandler_MissingFilePart(t *testing.T) {
	handler := &S3Handler{
		logger: silentLogger(),
		repo:   new(mockS3Repo),
	}

	// Create a multipart request with a non-file part.
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	_ = writer.WriteField("other", "value")
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/s3/files/upload.csv?secretName=my-secret", &buf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(ctxWithNamespace("test-ns"))

	rr := httptest.NewRecorder()
	ps := httprouter.Params{{Key: "key", Value: "upload.csv"}}

	handler.PostS3FileHandler(rr, req, ps)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "file")
}

// --- PostS3FileHandler non-multipart request test ---

func TestPostS3FileHandler_NonMultipartRequest(t *testing.T) {
	handler := &S3Handler{
		logger: silentLogger(),
		repo:   new(mockS3Repo),
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/s3/files/upload.csv?secretName=my-secret",
		strings.NewReader("plain text body"))
	req.Header.Set("Content-Type", "text/plain")
	req = req.WithContext(ctxWithNamespace("test-ns"))

	rr := httptest.NewRecorder()
	ps := httprouter.Params{{Key: "key", Value: "upload.csv"}}

	handler.PostS3FileHandler(rr, req, ps)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "multipart")
}

// --- validateGetS3FilesHandlerParameters tests ---

func TestValidateGetS3FilesHandlerParameters(t *testing.T) {
	tests := []struct {
		name    string
		query   string
		wantErr string
	}{
		{
			name:    "valid params",
			query:   "secretName=s&limit=100&path=folder/",
			wantErr: "",
		},
		{
			name:    "valid minimal params",
			query:   "",
			wantErr: "",
		},
		{
			name:    "path too long",
			query:   "path=" + strings.Repeat("a", 1025),
			wantErr: "path",
		},
		{
			name:    "search too long",
			query:   "search=" + strings.Repeat("a", 1025),
			wantErr: "search",
		},
		{
			name:    "search with slash",
			query:   "search=a/b",
			wantErr: "search",
		},
		{
			name:    "negative limit",
			query:   "limit=-1",
			wantErr: "limit",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test?"+tt.query, nil)
			_, err := validateGetS3FilesHandlerParameters(req)
			if tt.wantErr != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
