package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestNewNamespaceModelFromNamespace(t *testing.T) {
	for _, tc := range []struct {
		name     string
		ns       corev1.Namespace
		expected NamespaceModel
	}{
		{
			name: "unset label returns false AI classification",
			ns:   corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
			expected: NamespaceModel{
				Name: "default", DisplayName: "default",
			},
		},
		{
			name: "list maps annotation, phase and label",
			ns: corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "project", Annotations: map[string]string{"openshift.io/display-name": "My Project"},
					Labels: map[string]string{"opendatahub.io/dashboard": "true"},
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceTerminating},
			},
			expected: NamespaceModel{
				Name: "project", DisplayName: "My Project", Phase: "Terminating", IsAiProject: true,
			},
		},
		{
			name: "label must be exactly true",
			ns: corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
				Name: "project", Labels: map[string]string{"opendatahub.io/dashboard": "True"},
			}},
			expected: NamespaceModel{Name: "project", DisplayName: "project", IsAiProject: false},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, NewNamespaceModelFromNamespace(tc.ns))
		})
	}
}
func TestNamespaceModelJSON(t *testing.T) {
	for _, tc := range []struct {
		name     string
		labels   map[string]string
		expected string
	}{
		{"unset label", nil, `{"name":"project","displayName":"project","phase":"Active","isAiProject":false}`},
		{"AI project", map[string]string{"opendatahub.io/dashboard": "true"}, `{"name":"project","displayName":"project","phase":"Active","isAiProject":true}`},
		{"non-AI project", map[string]string{"opendatahub.io/dashboard": "false"}, `{"name":"project","displayName":"project","phase":"Active","isAiProject":false}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			model := NewNamespaceModelFromNamespace(corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{Name: "project", Labels: tc.labels},
				Status:     corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			})
			encoded, err := json.Marshal(model)
			assert.NoError(t, err)
			assert.JSONEq(t, tc.expected, string(encoded))
		})
	}
}
