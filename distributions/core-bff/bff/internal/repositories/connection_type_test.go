package repositories

import (
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestIsConnectionTypeConfigMap_Valid(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Labels: map[string]string{
				models.LabelDashboardResource: "true",
				models.LabelConnectionType:    "true",
			},
		},
	}
	assert.True(t, isConnectionTypeConfigMap(cm))
}

func TestIsConnectionTypeConfigMap_MissingConnectionTypeLabel(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Labels: map[string]string{
				models.LabelDashboardResource: "true",
			},
		},
	}
	assert.False(t, isConnectionTypeConfigMap(cm))
}

func TestIsConnectionTypeConfigMap_MissingDashboardLabel(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Labels: map[string]string{
				models.LabelConnectionType: "true",
			},
		},
	}
	assert.False(t, isConnectionTypeConfigMap(cm))
}

func TestIsConnectionTypeConfigMap_NoLabels(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{},
	}
	assert.False(t, isConnectionTypeConfigMap(cm))
}

func TestIsConnectionTypeConfigMap_Nil(t *testing.T) {
	assert.False(t, isConnectionTypeConfigMap(nil))
}

func TestIsConnectionTypeConfigMap_FalseValues(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Labels: map[string]string{
				models.LabelDashboardResource: "false",
				models.LabelConnectionType:    "true",
			},
		},
	}
	assert.False(t, isConnectionTypeConfigMap(cm))
}
