package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type fakeMaaSService struct {
	response   repositories.MaaSModelsResponse
	err        error
	token      string
	headers    map[string]string
	secretName string
}

func (f *fakeMaaSService) ListModels(_ context.Context, _ string, token string, headers map[string]string, secretName string) (repositories.MaaSModelsResponse, error) {
	f.token, f.headers = token, headers
	f.secretName = secretName
	return f.response, f.err
}

func TestMaaSModelsHandlerValidatesAndPassesSecretName(t *testing.T) {
	service := &fakeMaaSService{}
	handler := &MaaSHandler{logger: slog.Default(), service: service}
	recorder := httptest.NewRecorder()
	r := maasRequest()
	r.URL.RawQuery = "namespace=test&secretName=maas-secret"
	handler.ModelsHandler(recorder, r, httprouter.Params{})
	if recorder.Code != http.StatusOK || service.secretName != "maas-secret" {
		t.Fatalf("status/secret = %d/%q", recorder.Code, service.secretName)
	}

	for _, name := range []string{"INVALID", "bad/name", ""} {
		recorder = httptest.NewRecorder()
		r = maasRequest()
		r.URL.RawQuery = "namespace=test&secretName=" + name
		handler.ModelsHandler(recorder, r, httprouter.Params{})
		if recorder.Code != http.StatusBadRequest {
			t.Errorf("secretName %q: status = %d", name, recorder.Code)
		}
	}
}

func maasRequest() *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/api/v1/maas/models?namespace=test", nil)
	ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, "test")
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, &kubernetes.RequestIdentity{Token: "user-token"})
	return r.WithContext(ctx)
}

func TestMaaSModelsHandler(t *testing.T) {
	service := &fakeMaaSService{response: repositories.MaaSModelsResponse{Data: repositories.MaaSModelsData{Models: []repositories.MaaSModel{{ID: "model-a"}}}}}
	handler := &MaaSHandler{logger: slog.Default(), service: service, authMethod: "internal"}
	recorder := httptest.NewRecorder()
	r := maasRequest()
	r.Header.Set(constants.KubeflowUserIDHeader, "user")
	handler.ModelsHandler(recorder, r, httprouter.Params{})
	if recorder.Code != http.StatusOK || service.token != "user-token" || service.headers["X-MaaS-Return-All-Models"] != "true" {
		t.Fatalf("status/request = %d/%q/%v", recorder.Code, service.token, service.headers)
	}
	var response repositories.MaaSModelsResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil || len(response.Data.Models) != 1 {
		t.Fatalf("response/error = %s/%v", recorder.Body, err)
	}
}

func TestMaaSModelsHandlerMapsErrors(t *testing.T) {
	for _, test := range []struct {
		err  error
		want int
	}{
		{repositories.ErrMaaSUnavailable, http.StatusServiceUnavailable},
		{repositories.ErrMaaSUnauthorized, http.StatusUnauthorized},
		{repositories.ErrMaaSForbidden, http.StatusForbidden},
		{repositories.ErrMaaSBadRequest, http.StatusBadRequest},
		{repositories.ErrMaaSBadResponse, http.StatusBadGateway},
		{repositories.ErrMaaSSecretNotFound, http.StatusNotFound},
		{repositories.ErrMaaSSecretForbidden, http.StatusForbidden},
		{repositories.ErrMaaSCredentialsInvalid, http.StatusBadRequest},
		{errors.New("unknown"), http.StatusInternalServerError},
	} {
		handler := &MaaSHandler{logger: slog.Default(), service: &fakeMaaSService{err: test.err}}
		recorder := httptest.NewRecorder()
		handler.ModelsHandler(recorder, maasRequest(), httprouter.Params{})
		if recorder.Code != test.want {
			t.Errorf("error %v: status = %d, want %d", test.err, recorder.Code, test.want)
		}
	}
}

func TestMaaSModelsHandlerDoesNotExposeSecretDetails(t *testing.T) {
	handler := &MaaSHandler{
		logger:  slog.Default(),
		service: &fakeMaaSService{err: errors.New("secret-key and https://sensitive.example.com")},
	}
	recorder := httptest.NewRecorder()
	handler.ModelsHandler(recorder, maasRequest(), httprouter.Params{})
	if recorder.Code != http.StatusInternalServerError ||
		strings.Contains(recorder.Body.String(), "secret-key") ||
		strings.Contains(recorder.Body.String(), "sensitive.example.com") {
		t.Fatalf("status/body = %d/%s", recorder.Code, recorder.Body)
	}
}

func TestMaaSModelsHandlerValidatesNamespace(t *testing.T) {
	handler := &MaaSHandler{logger: slog.Default(), service: &fakeMaaSService{}}
	recorder := httptest.NewRecorder()
	handler.ModelsHandler(recorder, httptest.NewRequest(http.MethodGet, "/", nil), httprouter.Params{})
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", recorder.Code)
	}
}
