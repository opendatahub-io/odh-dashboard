package main

import (
	"context"
	"errors"
	"net/http/httptest"
	"testing"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type readinessReader struct {
	getErr error
}

func (r readinessReader) Get(_ context.Context, _ client.ObjectKey, _ client.Object, _ ...client.GetOption) error {
	return r.getErr
}

func (readinessReader) List(context.Context, client.ObjectList, ...client.ListOption) error {
	return nil
}

func TestAPIServerReadyz(t *testing.T) {
	testCases := []struct {
		name    string
		getErr  error
		wantErr bool
	}{
		{name: "reachable", getErr: nil},
		{
			name: "reachable without Dashboard",
			getErr: apierrors.NewNotFound(
				schema.GroupResource{Group: dashboardv1alpha1.GroupVersion.Group, Resource: "dashboards"},
				dashboardv1alpha1.DashboardInstanceName,
			),
		},
		{name: "unreachable", getErr: errors.New("connection refused"), wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			request := httptest.NewRequest("GET", "/readyz", nil)
			err := apiServerReadyz(readinessReader{getErr: testCase.getErr})(request)
			if testCase.wantErr {
				require.Error(t, err)
				require.ErrorContains(t, err, "check API server connectivity")
			} else {
				require.NoError(t, err)
			}
		})
	}
}
