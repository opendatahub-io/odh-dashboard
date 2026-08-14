package api

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func newTestK8sHandler() (*K8sHandler, *mockK8sService, *mockK8sRepo) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := new(mockK8sService)
	repo := new(mockK8sRepo)
	return &K8sHandler{logger: logger, k8sService: svc, repo: repo}, svc, repo
}

// ---------- UserHandler ----------

func TestUserHandler(t *testing.T) {
	tests := []struct {
		name           string
		userInfo       *kubernetes.UserInfo
		svcErr         error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name: "success",
			userInfo: &kubernetes.UserInfo{
				UserID:       "test-user",
				ClusterAdmin: true,
			},
			svcErr:         nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"userId": "test-user"`,
		},
		{
			name:           "unauthorized",
			userInfo:       nil,
			svcErr:         kubernetes.ErrUnauthorized,
			wantStatusCode: http.StatusUnauthorized,
			wantBodySubstr: `"code": "401"`,
		},
		{
			name:           "forbidden",
			userInfo:       nil,
			svcErr:         kubernetes.ErrForbidden,
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: `"code": "403"`,
		},
		{
			name:           "server error",
			userInfo:       nil,
			svcErr:         errors.New("unexpected failure"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, svc, _ := newTestK8sHandler()
			svc.On("GetUserInfo", mock.Anything).Return(tt.userInfo, tt.svcErr)

			req := httptest.NewRequest(http.MethodGet, "/api/v1/user", nil)
			rr := httptest.NewRecorder()

			h.UserHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			svc.AssertExpectations(t)
		})
	}
}

// ---------- GetNamespacesHandler ----------

func TestGetNamespacesHandler(t *testing.T) {
	tests := []struct {
		name           string
		namespaces     []kubernetes.NamespaceInfo
		svcErr         error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name: "success",
			namespaces: []kubernetes.NamespaceInfo{
				{Name: "ns-a", DisplayName: "Namespace A"},
				{Name: "ns-b", DisplayName: "Namespace B"},
			},
			svcErr:         nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"name": "ns-a"`,
		},
		{
			name:           "success with empty list",
			namespaces:     []kubernetes.NamespaceInfo{},
			svcErr:         nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"data": []`,
		},
		{
			name:           "unauthorized",
			namespaces:     nil,
			svcErr:         kubernetes.ErrUnauthorized,
			wantStatusCode: http.StatusUnauthorized,
			wantBodySubstr: `"code": "401"`,
		},
		{
			name:           "forbidden",
			namespaces:     nil,
			svcErr:         kubernetes.ErrForbidden,
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: `"code": "403"`,
		},
		{
			name:           "server error",
			namespaces:     nil,
			svcErr:         errors.New("cluster unavailable"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, svc, _ := newTestK8sHandler()
			svc.On("GetAccessibleNamespaceInfos", mock.Anything).Return(tt.namespaces, tt.svcErr)

			req := httptest.NewRequest(http.MethodGet, "/api/v1/namespaces", nil)
			rr := httptest.NewRecorder()

			h.GetNamespacesHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			svc.AssertExpectations(t)
		})
	}
}

// ---------- GetSecretsHandler ----------

func TestGetSecretsHandler(t *testing.T) {
	tests := []struct {
		name           string
		namespace      string // empty = no namespace in context
		queryType      string // secret type query param
		repoSecrets    []kubernetes.SecretInfo
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:      "success without type filter",
			namespace: "test-ns",
			queryType: "",
			repoSecrets: []kubernetes.SecretInfo{
				{UUID: "uid-1", Name: "my-secret", Type: "Opaque", Data: map[string]string{"key": "val"}},
			},
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"name": "my-secret"`,
		},
		{
			name:      "success with storage type filter",
			namespace: "test-ns",
			queryType: "storage",
			repoSecrets: []kubernetes.SecretInfo{
				{UUID: "uid-2", Name: "s3-creds", Type: "storage", Data: map[string]string{"access": "key"}},
			},
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"name": "s3-creds"`,
		},
		{
			name:           "missing namespace returns 400",
			namespace:      "", // no namespace in context
			queryType:      "",
			repoSecrets:    nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing namespace",
		},
		{
			name:           "invalid type returns 400",
			namespace:      "test-ns",
			queryType:      "invalid-type",
			repoSecrets:    nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "type",
		},
		{
			name:           "repo not found error",
			namespace:      "test-ns",
			queryType:      "",
			repoSecrets:    nil,
			repoErr:        kubernetes.ErrNotFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "repo forbidden error",
			namespace:      "test-ns",
			queryType:      "",
			repoSecrets:    nil,
			repoErr:        kubernetes.ErrForbidden,
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: `"code": "403"`,
		},
		{
			name:           "repo unauthorized error",
			namespace:      "test-ns",
			queryType:      "",
			repoSecrets:    nil,
			repoErr:        kubernetes.ErrUnauthorized,
			wantStatusCode: http.StatusUnauthorized,
			wantBodySubstr: `"code": "401"`,
		},
		{
			name:           "repo invalid/bad request error",
			namespace:      "test-ns",
			queryType:      "",
			repoSecrets:    nil,
			repoErr:        kubernetes.ErrInvalid,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo bad request error",
			namespace:      "test-ns",
			queryType:      "",
			repoSecrets:    nil,
			repoErr:        kubernetes.ErrBadRequest,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo server error",
			namespace:      "test-ns",
			queryType:      "",
			repoSecrets:    nil,
			repoErr:        errors.New("internal failure"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, svc, repo := newTestK8sHandler()

			// Build request URL
			url := "/api/v1/secrets"
			if tt.queryType != "" {
				url += "?type=" + tt.queryType
			}
			req := httptest.NewRequest(http.MethodGet, url, nil)

			// Inject namespace into context if provided
			if tt.namespace != "" {
				ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, tt.namespace)
				req = req.WithContext(ctx)
			}

			// Only set up repo expectation if we expect the handler to reach the repo call
			if tt.namespace != "" && (tt.queryType == "" || tt.queryType == "storage") {
				repo.On("GetFilteredSecrets", svc, mock.Anything, tt.namespace, tt.queryType).
					Return(tt.repoSecrets, tt.repoErr)
			}

			rr := httptest.NewRecorder()
			h.GetSecretsHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			repo.AssertExpectations(t)
		})
	}
}
