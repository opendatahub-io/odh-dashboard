package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/event"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestNamespaceNamespacedRBACOptInChangedPredicate(t *testing.T) {
	p := namespaceNamespacedRBACOptInChangedPredicate()
	unlabelled := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "target"}}
	optedIn := unlabelled.DeepCopy()
	optedIn.Labels = map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true"}

	assert.False(t, p.Create(event.CreateEvent{Object: unlabelled}))
	assert.True(t, p.Create(event.CreateEvent{Object: optedIn}))
	assert.True(t, p.Update(event.UpdateEvent{ObjectOld: unlabelled, ObjectNew: optedIn}))
	assert.True(t, p.Update(event.UpdateEvent{ObjectOld: optedIn, ObjectNew: unlabelled}))
	assert.False(t, p.Update(event.UpdateEvent{ObjectOld: optedIn, ObjectNew: optedIn.DeepCopy()}))
	assert.True(t, p.Delete(event.DeleteEvent{Object: optedIn}))
	assert.False(t, p.Delete(event.DeleteEvent{Object: unlabelled}))
}

func TestMapNamespacedRBACNamespaceToDashboard(t *testing.T) {
	requests := mapNamespacedRBACNamespaceToDashboard(context.Background(), &corev1.Namespace{})
	require.Len(t, requests, 1)
	assert.Equal(t, v1alpha1.DashboardInstanceName, requests[0].Name)
}
