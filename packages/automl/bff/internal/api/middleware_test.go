package api

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPreserveRawPath(t *testing.T) {
	tests := []struct {
		name           string
		path           string
		rawPath        string
		useStripPrefix bool
		expectedPath   string
	}{
		{
			name:         "s3 files path with percent-encoded key swaps Path for RawPath",
			path:         "/api/v1/s3/files/docs/file.csv",
			rawPath:      "/api/v1/s3/files/docs%2Ffile.csv",
			expectedPath: "/api/v1/s3/files/docs%2Ffile.csv",
		},
		{
			name:         "s3 files path without encoding is unchanged",
			path:         "/api/v1/s3/files/simple.csv",
			rawPath:      "",
			expectedPath: "/api/v1/s3/files/simple.csv",
		},
		{
			name:         "double-encoded key preserves %25 literal via RawPath",
			path:         "/api/v1/s3/files/docs%2Ffile.csv",
			rawPath:      "/api/v1/s3/files/docs%252Ffile.csv",
			expectedPath: "/api/v1/s3/files/docs%252Ffile.csv",
		},
		{
			name:         "double-encoded key re-encodes when RawPath is empty",
			path:         "/api/v1/s3/files/docs%2Ffile.csv",
			rawPath:      "",
			expectedPath: "/api/v1/s3/files/docs%252Ffile.csv",
		},
		{
			name:         "non-s3 path with RawPath is unchanged",
			path:         "/api/v1/models",
			rawPath:      "/api/v1/models",
			expectedPath: "/api/v1/models",
		},
		{
			name:           "prefixed path is matched after StripPrefix removes prefix",
			path:           "/automl/api/v1/s3/files/docs/file.csv",
			rawPath:        "/automl/api/v1/s3/files/docs%2Ffile.csv",
			useStripPrefix: true,
			expectedPath:   "/api/v1/s3/files/docs%2Ffile.csv",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var capturedPath string
			inner := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
				capturedPath = r.URL.Path
			})

			handler := preserveRawPath(inner)
			if tt.useStripPrefix {
				handler = http.StripPrefix(PathPrefix, handler)
			}

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			req.URL = &url.URL{Path: tt.path, RawPath: tt.rawPath}
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedPath, capturedPath)
		})
	}
}
