package repositories

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
)

type fakeMaaSClient struct {
	response maas.Response
	err      error
}

func (f fakeMaaSClient) ListModels(context.Context, string, map[string]string) (maas.Response, error) {
	return f.response, f.err
}

func TestMaaSServiceNormalizesAndSkipsInvalidModels(t *testing.T) {
	var response maas.Response
	response.Data.Data = []maas.Model{{ModelID: "model-a", DisplayNameV2: "Model A"}, {Name: "ignored"}}
	result, err := NewMaaSService(fakeMaaSClient{response: response}, false).ListModels(context.Background(), "", nil)
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
		_, err := NewMaaSService(fakeMaaSClient{err: &maas.TransportError{StatusCode: test.status}}, false).ListModels(context.Background(), "", nil)
		if !errors.Is(err, test.want) {
			t.Errorf("status %d: error = %v", test.status, err)
		}
	}
}

func TestMaaSServiceMock(t *testing.T) {
	result, err := NewMaaSService(nil, true).ListModels(context.Background(), "", nil)
	if err != nil || len(result.Data.Models) != 2 {
		t.Fatalf("result/error = %+v/%v", result, err)
	}
}
