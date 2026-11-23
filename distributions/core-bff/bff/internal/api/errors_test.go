package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestK8sErrorResponse(t *testing.T) {
	gr := schema.GroupResource{Group: "serving.kserve.io", Resource: "servingruntimes"}

	tests := []struct {
		name        string
		err         error
		wantStatus  int
		wantCode    string
		wantReason  string
		wantMessage string
	}{
		{
			name:        "NotFound returns 404",
			err:         k8serrors.NewNotFound(gr, "test-runtime"),
			wantStatus:  http.StatusNotFound,
			wantCode:    "NOT_FOUND",
			wantReason:  "NotFound",
			wantMessage: "404: the requested resource was not found",
		},
		{
			name:        "Forbidden returns 403",
			err:         k8serrors.NewForbidden(gr, "test-runtime", fmt.Errorf("access denied")),
			wantStatus:  http.StatusForbidden,
			wantCode:    "FORBIDDEN",
			wantReason:  "Forbidden",
			wantMessage: "the requested operation is forbidden",
		},
		{
			name:        "Conflict returns 409",
			err:         k8serrors.NewConflict(gr, "test-runtime", fmt.Errorf("already modified")),
			wantStatus:  http.StatusConflict,
			wantCode:    "CONFLICT",
			wantReason:  "Conflict",
			wantMessage: "the resource was modified by another request",
		},
		{
			name:        "AlreadyExists returns 409",
			err:         k8serrors.NewAlreadyExists(gr, "test-runtime"),
			wantStatus:  http.StatusConflict,
			wantCode:    "CONFLICT",
			wantReason:  "AlreadyExists",
			wantMessage: "the resource already exists",
		},
		{
			name:        "Non-K8s error falls back to 500",
			err:         fmt.Errorf("unexpected failure"),
			wantStatus:  http.StatusInternalServerError,
			wantCode:    "INTERNAL_SERVER_ERROR",
			wantMessage: "the server encountered a problem and could not process your request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := newTestApp()

			// Native endpoints keep the BFF envelope with the upstream status.
			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/api/v1/servingruntimes", nil)
			app.k8sErrorResponse(rr, req, tt.err)
			assert.Equal(t, tt.wantStatus, rr.Code)
			var body HTTPError
			err := json.Unmarshal(rr.Body.Bytes(), &body)
			require.NoError(t, err)
			assert.Equal(t, tt.wantCode, body.Error.Code)
			assert.Equal(t, tt.wantMessage, body.Error.Message)
			assert.NotContains(t, rr.Body.String(), "test-runtime", "response must not leak resource names")
			assert.NotContains(t, rr.Body.String(), "servingruntimes", "response must not leak resource types")

			if tt.wantStatus == 500 {
				return
			}
			// Kubernetes proxy boundaries keep the Kubernetes Status shape.
			proxyRR := httptest.NewRecorder()
			proxyReq := httptest.NewRequest(http.MethodGet, "/api/k8s/apis/serving.kserve.io/v1/servingruntimes", nil)
			app.k8sErrorResponse(proxyRR, proxyReq, tt.err)
			assert.Equal(t, tt.wantStatus, proxyRR.Code)
			var status metav1.Status
			require.NoError(t, json.Unmarshal(proxyRR.Body.Bytes(), &status))
			assert.Equal(t, tt.wantReason, string(status.Reason))
			assert.Equal(t, "Status", status.Kind)
			assert.NotContains(t, proxyRR.Body.String(), "test-runtime")
		})
	}
}
