package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestNewNamespaceModelFromNamespace(t *testing.T) {
	displayName := func(name string) *string { return &name }
	isAiProject := func(value bool) *bool { return &value }
	for _, tc := range []struct {
		name     string
		ns       corev1.Namespace
		expected NamespaceModel
	}{
		{
			name: "unset label leaves AI classification absent",
			ns:   corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
			expected: NamespaceModel{
				Name: "default", DisplayName: displayName("default"),
			},
		},
		{
			name: "list keeps name as display name and omits phase",
			ns: corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "project", Annotations: map[string]string{"openshift.io/display-name": "My Project"},
					Labels: map[string]string{"opendatahub.io/dashboard": "true"},
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceTerminating},
			},
			expected: NamespaceModel{
				Name: "project", DisplayName: displayName("project"), IsAiProject: isAiProject(true),
			},
		},
		{
			name: "label must be exactly true",
			ns: corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
				Name: "project", Labels: map[string]string{"opendatahub.io/dashboard": "True"},
			}},
			expected: NamespaceModel{Name: "project", DisplayName: displayName("project"), IsAiProject: isAiProject(false)},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, NewNamespaceModelFromNamespace(tc.ns))
		})
	}
}

func TestNamespaceModelOptionalClassificationJSON(t *testing.T) {
	for _, tc := range []struct {
		name     string
		labels   map[string]string
		expected string
	}{
		{"unset label", nil, `{"name":"project","displayName":"project"}`},
		{"AI project", map[string]string{"opendatahub.io/dashboard": "true"}, `{"name":"project","displayName":"project","isAiProject":true}`},
		{"non-AI project", map[string]string{"opendatahub.io/dashboard": "false"}, `{"name":"project","displayName":"project","isAiProject":false}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			model := NewNamespaceModelFromNamespace(corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
				Name: "project", Labels: tc.labels,
			}})
			encoded, err := json.Marshal(model)
			assert.NoError(t, err)
			assert.JSONEq(t, tc.expected, string(encoded))
		})
	}
}

func TestNewNamespaceLookupModelFromNamespace(t *testing.T) {
	ns := corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:        "project",
			Annotations: map[string]string{"openshift.io/display-name": "My Project"},
			Labels:      map[string]string{"opendatahub.io/dashboard": "true"},
		},
		Status: corev1.NamespaceStatus{Phase: corev1.NamespaceTerminating},
	}
	assert.Equal(t, NamespaceLookupModel{
		Name: "project", DisplayName: "My Project", Phase: "Terminating", IsAiProject: true,
	}, NewNamespaceLookupModelFromNamespace(ns))

	ns.Annotations = nil
	ns.Labels = nil
	assert.Equal(t, NamespaceLookupModel{
		Name: "project", DisplayName: "project", Phase: "Terminating",
	}, NewNamespaceLookupModelFromNamespace(ns))
}
