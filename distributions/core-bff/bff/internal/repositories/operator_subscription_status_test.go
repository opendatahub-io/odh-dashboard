package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/rest"
	k8stesting "k8s.io/client-go/testing"
)

func subscription(name, namespace, channel, lastUpdated, installedCSV string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "operators.coreos.com/v1alpha1",
		"kind":       "Subscription",
		"metadata": map[string]any{
			"name":      name,
			"namespace": namespace,
		},
		"spec":   map[string]any{"channel": channel},
		"status": map[string]any{"installedCSV": installedCSV, "lastUpdated": lastUpdated},
	}}
}

func dataScienceCluster(releaseName string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "datasciencecluster.opendatahub.io/v2",
		"kind":       "DataScienceCluster",
		"metadata":   map[string]any{"name": "default-dsc"},
		"status":     map[string]any{"release": map[string]any{"name": releaseName}},
	}}
}

func TestGetOperatorSubscriptionStatus(t *testing.T) {
	tests := []struct {
		name          string
		releaseName   string
		subscriptions []runtime.Object
		expected      string
		lastUpdated   string
		notFound      bool
	}{
		{
			name:          "returns RHOAI channel",
			releaseName:   selfManagedRHOAIReleaseName,
			subscriptions: []runtime.Object{subscription("rhods-operator", "redhat-ods-operator", "stable", "2026-09-25T12:00:00Z", "rhods-operator.v3.0.0")},
			expected:      "stable",
			lastUpdated:   "2026-09-25T12:00:00Z",
		},
		{
			name:          "returns ODH channel",
			releaseName:   "Open Data Hub",
			subscriptions: []runtime.Object{subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z", "opendatahub-operator.v2.0.0")},
			expected:      "fast",
			lastUpdated:   "2026-09-25T13:00:00Z",
		},
		{
			name:          "keeps last updated when channel is empty",
			releaseName:   selfManagedRHOAIReleaseName,
			subscriptions: []runtime.Object{subscription("rhods-operator", "redhat-ods-operator", "", "2026-09-25T12:00:00Z", "rhods-operator.v3.0.0")},
			expected:      "Unknown",
			lastUpdated:   "2026-09-25T12:00:00Z",
		},
		{
			name:        "returns not found when selected operator is not installed",
			releaseName: "Open Data Hub",
			notFound:    true,
		},
		{
			name:          "returns not found when selected operator CSV does not match",
			releaseName:   "Open Data Hub",
			subscriptions: []runtime.Object{subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z", "another-operator.v1.0.0")},
			notFound:      true,
		},
		{
			name:          "returns not found when selected operator has no installed CSV",
			releaseName:   "Open Data Hub",
			subscriptions: []runtime.Object{subscription("opendatahub-operator", "opendatahub-operator", "fast", "2026-09-25T13:00:00Z", "")},
			notFound:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			objects := append([]runtime.Object{dataScienceCluster(tt.releaseName)}, tt.subscriptions...)
			dynClient := fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{
				models.DataScienceClusterGVR: "DataScienceClusterList",
			}, objects...)
			repo := NewOperatorSubscriptionStatusRepository(dynClient, "")

			status, err := repo.GetOperatorSubscriptionStatus(context.Background())

			if tt.notFound {
				require.Error(t, err)
				assert.True(t, apierrors.IsNotFound(err))
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, status.Channel)
			assert.Equal(t, tt.lastUpdated, status.LastUpdated)
		})
	}
}

func TestGetOperatorSubscriptionStatus_ReleaseSelection(t *testing.T) {
	for _, tt := range []struct {
		name, release, expected string
		rhoaiInstalled          bool
		odhInstalled            bool
	}{
		{name: "self-managed selects RHOAI", release: selfManagedRHOAIReleaseName, expected: "stable", rhoaiInstalled: true, odhInstalled: true},
		{name: "cloud service selects RHOAI", release: managedRHOAIReleaseName, expected: "stable", rhoaiInstalled: true, odhInstalled: true},
		{name: "ODH selects ODH", release: openDataHubReleaseName, expected: "fast", rhoaiInstalled: true, odhInstalled: true},
		{name: "RHOAI never falls back to ODH", release: selfManagedRHOAIReleaseName, odhInstalled: true},
		{name: "ODH never falls back to RHOAI", release: openDataHubReleaseName, rhoaiInstalled: true},
		{name: "unknown release keeps RHOAI preference", release: "unrecognized", expected: "stable", rhoaiInstalled: true, odhInstalled: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			objects := []runtime.Object{dataScienceCluster(tt.release)}
			if tt.rhoaiInstalled {
				objects = append(objects, subscription("rhods-operator", "redhat-ods-operator", "stable", "", "rhods-operator.v3.0.0"))
			}
			if tt.odhInstalled {
				objects = append(objects, subscription("opendatahub-operator", "opendatahub-operator", "fast", "", "opendatahub-operator.v3.0.0"))
			}
			cli := fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{
				models.DataScienceClusterGVR: "DataScienceClusterList",
			}, objects...)
			status, err := NewOperatorSubscriptionStatusRepository(cli, "").GetOperatorSubscriptionStatus(context.Background())
			if tt.expected == "" {
				require.Error(t, err)
				assert.True(t, apierrors.IsNotFound(err))
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, status.Channel)
		})
	}
}

func TestGetOperatorSubscriptionStatus_Namespaces(t *testing.T) {
	for _, tt := range []struct {
		name, namespace, configured string
		forbiddenDefault            bool
	}{
		{name: "standard ODH", namespace: "opendatahub-operator"},
		{name: "legacy ODH", namespace: "openshift-operators"},
		{name: "missing primary namespace has no role", namespace: "openshift-operators", forbiddenDefault: true},
		{name: "custom operator namespace", namespace: "custom-operators", configured: "custom-operators"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			cli := fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{models.DataScienceClusterGVR: "DataScienceClusterList"}, dataScienceCluster("Open Data Hub"), subscription("opendatahub-operator", tt.namespace, "fast", "", "opendatahub-operator.v3.0.0"))
			if tt.forbiddenDefault {
				cli.PrependReactor("get", "subscriptions", func(action k8stesting.Action) (bool, runtime.Object, error) {
					if action.GetNamespace() == "opendatahub-operator" {
						return true, nil, apierrors.NewForbidden(models.SubscriptionGVR.GroupResource(), "opendatahub-operator", errors.New("no role"))
					}
					return false, nil, nil
				})
			}
			status, err := NewOperatorSubscriptionStatusRepository(cli, tt.configured).GetOperatorSubscriptionStatus(context.Background())
			require.NoError(t, err)
			assert.Equal(t, "fast", status.Channel)
			for _, action := range cli.Actions() {
				if action.GetResource() == models.SubscriptionGVR {
					assert.Equal(t, "get", action.GetVerb(), "subscription access must remain a named GET")
				}
			}
		})
	}
}

func TestGetOperatorSubscriptionStatus_PreservesErrors(t *testing.T) {
	for _, err := range []error{apierrors.NewForbidden(models.SubscriptionGVR.GroupResource(), "opendatahub-operator", errors.New("denied")), errors.New("connection failed")} {
		cli := fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{models.DataScienceClusterGVR: "DataScienceClusterList"}, dataScienceCluster("Open Data Hub"))
		cli.PrependReactor("get", "subscriptions", func(k8stesting.Action) (bool, runtime.Object, error) { return true, nil, err })
		_, got := NewOperatorSubscriptionStatusRepository(cli, "").GetOperatorSubscriptionStatus(context.Background())
		require.ErrorIs(t, got, err)
	}
}

func TestGetOperatorSubscriptionStatus_UnknownRelease(t *testing.T) {
	for _, release := range []string{"no DSC", "missing release", "", "unrecognized release"} {
		for _, operator := range operatorSubscriptions {
			t.Run(release+"/"+operator.name, func(t *testing.T) {
				objects := []runtime.Object{subscription(operator.name, operator.namespace, "stable", "", operator.name+".v3.0.0")}
				if release != "no DSC" {
					dsc := dataScienceCluster(release)
					if release == "missing release" {
						unstructured.RemoveNestedField(dsc.Object, "status", "release")
					}
					objects = append(objects, dsc)
				}
				cli := fake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{models.DataScienceClusterGVR: "DataScienceClusterList"}, objects...)
				status, err := NewOperatorSubscriptionStatusRepository(cli, "").GetOperatorSubscriptionStatus(context.Background())
				require.NoError(t, err)
				assert.Equal(t, "stable", status.Channel)
			})
		}
	}
}

func TestGetOperatorSubscriptionStatus_Deadline(t *testing.T) {
	for _, resource := range []string{"datascienceclusters", "subscriptions"} {
		t.Run(resource, func(t *testing.T) {
			t.Parallel()
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
				if strings.Contains(req.URL.Path, resource) {
					<-req.Context().Done()
					return
				}
				w.Header().Set("Content-Type", "application/json")
				assert.NoError(t, json.NewEncoder(w).Encode(map[string]any{
					"apiVersion": "datasciencecluster.opendatahub.io/v2", "kind": "DataScienceClusterList",
					"items": []any{dataScienceCluster(selfManagedRHOAIReleaseName).Object},
				}))
			}))
			defer server.Close()
			cli, err := dynamic.NewForConfig(&rest.Config{Host: server.URL})
			require.NoError(t, err)
			started := time.Now()
			_, err = NewOperatorSubscriptionStatusRepository(cli, "").GetOperatorSubscriptionStatus(context.Background())
			require.ErrorIs(t, err, context.DeadlineExceeded)
			assert.Less(t, time.Since(started), operatorSubscriptionQueryTimeout+2*time.Second)
		})
	}
}
