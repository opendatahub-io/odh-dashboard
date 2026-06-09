package repositories

import (
	"context"
	"encoding/base64"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8stesting "k8s.io/client-go/testing"
)

func fakeNotebook(name, namespace, username, userType, lastActivity string) *unstructured.Unstructured {
	return &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "kubeflow.org/v1",
			"kind":       "Notebook",
			"metadata": map[string]interface{}{
				"name":      name,
				"namespace": namespace,
				"annotations": map[string]interface{}{
					"opendatahub.io/username":              username,
					"notebooks.kubeflow.org/last-activity": lastActivity,
				},
				"labels": map[string]interface{}{
					"opendatahub.io/user-type": userType,
				},
			},
		},
	}
}

func newFakeDynWithNotebooks(notebooks ...*unstructured.Unstructured) *dynamicfake.FakeDynamicClient {
	scheme := runtime.NewScheme()
	objects := make([]runtime.Object, len(notebooks))
	for i, n := range notebooks {
		objects[i] = n
	}
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{
			models.NotebookGVR: "NotebookList",
		},
		objects...,
	)
}

func TestGetAllowedUsers_WithNotebooks(t *testing.T) {
	fakeDyn := newFakeDynWithNotebooks(
		fakeNotebook("nb-1", "test-ns", "user-a@example.com", "user", "2024-01-01T00:00:00Z"),
		fakeNotebook("nb-2", "test-ns", "user-b@example.com", "admin", "2024-01-02T00:00:00Z"),
	)
	repo := NewAllowedUsersRepository(fakeDyn)

	users, err := repo.GetAllowedUsers(context.Background(), "test-ns")
	require.NoError(t, err)
	assert.Len(t, users, 2)
}

func TestGetAllowedUsers_DeduplicatesByUsername(t *testing.T) {
	fakeDyn := newFakeDynWithNotebooks(
		fakeNotebook("nb-1", "test-ns", "user-a@example.com", "user", "2024-01-01T00:00:00Z"),
		fakeNotebook("nb-2", "test-ns", "user-a@example.com", "admin", "2024-01-02T00:00:00Z"),
	)
	repo := NewAllowedUsersRepository(fakeDyn)

	users, err := repo.GetAllowedUsers(context.Background(), "test-ns")
	require.NoError(t, err)
	assert.Len(t, users, 1)
	assert.Equal(t, "Admin", users[0].Privilege)
}

func TestGetAllowedUsers_CRDAbsent_ReturnsEmpty(t *testing.T) {
	emptyDyn := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		runtime.NewScheme(),
		map[schema.GroupVersionResource]string{
			models.NotebookGVR: "NotebookList",
		},
	)
	emptyDyn.PrependReactor("list", models.NotebookGVR.Resource, func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewNotFound(models.NotebookGVR.GroupResource(), models.NotebookGVR.Resource)
	})
	repo := NewAllowedUsersRepository(emptyDyn)

	users, err := repo.GetAllowedUsers(context.Background(), "test-ns")
	require.NoError(t, err)
	assert.Empty(t, users)
}

func TestGetAllowedUsers_NilClient_ReturnsEmpty(t *testing.T) {
	repo := NewAllowedUsersRepository(nil)

	users, err := repo.GetAllowedUsers(context.Background(), "test-ns")
	require.NoError(t, err)
	assert.Empty(t, users)
}

func TestDecodeNotebookUsername_Plain(t *testing.T) {
	annotations := map[string]interface{}{
		"opendatahub.io/username": "user@example.com",
	}
	assert.Equal(t, "user@example.com", decodeNotebookUsername(annotations))
}

func TestDecodeNotebookUsername_B64Encoded(t *testing.T) {
	encoded := kubeSafePrefix + base64.StdEncoding.EncodeToString([]byte("user@example.com"))
	annotations := map[string]interface{}{
		"opendatahub.io/username": encoded,
	}
	assert.Equal(t, "user@example.com", decodeNotebookUsername(annotations))
}

func TestDecodeNotebookUsername_Empty(t *testing.T) {
	assert.Equal(t, "", decodeNotebookUsername(nil))
	assert.Equal(t, "", decodeNotebookUsername(map[string]interface{}{}))
}
