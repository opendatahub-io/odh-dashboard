package repositories

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type fakeMaaSClient struct {
	response maas.Response
	err      error
	config   maas.RequestConfig
}

func (f *fakeMaaSClient) ListModels(_ context.Context, _ string, _ map[string]string, configs ...maas.RequestConfig) (maas.Response, error) {
	if len(configs) > 0 {
		f.config = configs[0]
	}
	return f.response, f.err
}

func TestMaaSServiceNormalizesAndSkipsInvalidModels(t *testing.T) {
	var response maas.Response
	response.Data.Data = []maas.Model{{ModelID: "model-a", DisplayNameV2: "Model A"}, {Name: "ignored"}}
	result, err := NewMaaSService(&fakeMaaSClient{response: response}, nil).ListModels(context.Background(), "", "", nil, "")
	if err != nil || len(result.Data.Models) != 1 || result.Data.Models[0].ID != "model-a" {
		t.Fatalf("result/error = %+v/%v", result, err)
	}
}

func TestMaaSServiceClassifiesTransportErrors(t *testing.T) {
	for _, test := range []struct {
		status int
		want   error
	}{
		{http.StatusUnauthorized, ErrMaaSUnauthorized}, {http.StatusForbidden, ErrMaaSForbidden},
		{http.StatusBadRequest, ErrMaaSBadRequest}, {http.StatusBadGateway, ErrMaaSBadResponse},
		{http.StatusServiceUnavailable, ErrMaaSUnavailable},
	} {
		_, err := NewMaaSService(&fakeMaaSClient{err: &maas.TransportError{StatusCode: test.status}}, nil).ListModels(context.Background(), "", "", nil, "")
		if !errors.Is(err, test.want) {
			t.Errorf("status %d: error = %v", test.status, err)
		}
	}
}

func TestMaaSServiceLoadsSecretBackedCredentials(t *testing.T) {
	client := &fakeMaaSClient{}
	k8s := &mockK8sService{getSecretFn: func(_ context.Context, namespace, name string) (*v1.Secret, error) {
		if namespace != "test" || name != "maas-secret" {
			t.Fatalf("secret lookup = %s/%s", namespace, name)
		}
		return &v1.Secret{Data: map[string][]byte{
			"maas_base_url": []byte("https://maas.example.com/api/v1"),
			"maas_api_key":  []byte("secret-key"),
		}}, nil
	}}

	_, err := NewMaaSService(client, k8s).ListModels(context.Background(), "test", "", nil, "maas-secret")
	if err != nil {
		t.Fatal(err)
	}
	if client.config.BaseURL != "https://maas.example.com/api/v1" || client.config.APIKey != "secret-key" {
		t.Fatalf("request config = %+v", client.config)
	}
}

func TestMaaSServiceMapsSecretErrorsWithoutCredentials(t *testing.T) {
	for _, test := range []struct {
		name string
		data map[string][]byte
		want error
	}{
		{"missing base URL", map[string][]byte{"MAAS_API_KEY": []byte("secret-key")}, ErrMaaSCredentialsInvalid},
		{"missing API key", map[string][]byte{"MAAS_BASE_URL": []byte("https://maas.example.com")}, ErrMaaSCredentialsInvalid},
		{"invalid endpoint", map[string][]byte{"MAAS_BASE_URL": []byte("http://127.0.0.1"), "MAAS_API_KEY": []byte("secret-key")}, ErrMaaSCredentialsInvalid},
	} {
		t.Run(test.name, func(t *testing.T) {
			k8s := &mockK8sService{getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
				return &v1.Secret{Data: test.data}, nil
			}}
			_, err := NewMaaSService(&fakeMaaSClient{}, k8s).ListModels(context.Background(), "test", "", nil, "secret")
			if !errors.Is(err, test.want) || strings.Contains(err.Error(), "secret-key") || strings.Contains(err.Error(), "maas.example.com") {
				t.Fatalf("error = %v", err)
			}
		})
	}
}

func TestMaaSServiceMapsMissingSecret(t *testing.T) {
	k8s := &mockK8sService{getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
		return nil, apierrors.NewNotFound(schema.GroupResource{Resource: "secrets"}, "secret")
	}}
	_, err := NewMaaSService(&fakeMaaSClient{}, k8s).ListModels(context.Background(), "test", "", nil, "secret")
	if !errors.Is(err, ErrMaaSSecretNotFound) || strings.Contains(err.Error(), "secret-key") {
		t.Fatalf("error = %v", err)
	}
}

func TestMaaSServiceDoesNotLoadSecretWithoutSecretName(t *testing.T) {
	client := &fakeMaaSClient{}
	k8s := &mockK8sService{getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
		t.Fatal("unexpected secret lookup")
		return nil, nil
	}}

	if _, err := NewMaaSService(client, k8s).ListModels(context.Background(), "test", "token", nil, ""); err != nil {
		t.Fatal(err)
	}
}
