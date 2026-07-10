package k8sutil

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"k8s.io/apimachinery/pkg/api/meta"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

func TestIsDiscoveryError_MethodNotSupported(t *testing.T) {
	err := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Reason: metav1.StatusReasonMethodNotAllowed,
		Code:   405,
	}}
	assert.True(t, IsDiscoveryError(err))
}

func TestIsDiscoveryError_NoKindMatch(t *testing.T) {
	err := &meta.NoKindMatchError{
		GroupKind:        schema.GroupKind{Group: "opendatahub.io", Kind: "Auth"},
		SearchedVersions: []string{"v1alpha1"},
	}
	assert.True(t, IsDiscoveryError(err))
}

func TestIsDiscoveryError_NoResourceMatch(t *testing.T) {
	err := &meta.NoResourceMatchError{
		PartialResource: schema.GroupVersionResource{Group: "opendatahub.io", Version: "v1alpha1", Resource: "auths"},
	}
	assert.True(t, IsDiscoveryError(err))
}

func TestIsDiscoveryError_404_NilDetails(t *testing.T) {
	err := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Reason:  metav1.StatusReasonNotFound,
		Code:    404,
		Message: "the server could not find the requested resource",
		Details: nil,
	}}
	assert.True(t, IsDiscoveryError(err))
}

func TestIsDiscoveryError_404_EmptyDetails(t *testing.T) {
	err := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Reason:  metav1.StatusReasonNotFound,
		Code:    404,
		Message: "the server could not find the requested resource",
		Details: &metav1.StatusDetails{},
	}}
	assert.True(t, IsDiscoveryError(err))
}

func TestIsDiscoveryError_404_WithDetails_IsNotDiscovery(t *testing.T) {
	err := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Reason:  metav1.StatusReasonNotFound,
		Code:    404,
		Message: `auths.opendatahub.io "auth" not found`,
		Details: &metav1.StatusDetails{
			Name:  "auth",
			Group: "opendatahub.io",
			Kind:  "auths",
		},
	}}
	assert.False(t, IsDiscoveryError(err))
}

func TestIsDiscoveryError_Forbidden_IsNotDiscovery(t *testing.T) {
	err := k8serrors.NewForbidden(schema.GroupResource{Group: "opendatahub.io", Resource: "auths"}, "auth", fmt.Errorf("forbidden"))
	assert.False(t, IsDiscoveryError(err))
}

func TestIsDiscoveryError_GenericError_IsNotDiscovery(t *testing.T) {
	err := fmt.Errorf("something went wrong")
	assert.False(t, IsDiscoveryError(err))
}

func TestIsResourceUnavailable_NotFound(t *testing.T) {
	err := k8serrors.NewNotFound(schema.GroupResource{Group: "opendatahub.io", Resource: "auths"}, "auth")
	assert.True(t, IsResourceUnavailable(err))
}

func TestIsResourceUnavailable_DiscoveryError(t *testing.T) {
	err := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Reason: metav1.StatusReasonMethodNotAllowed,
		Code:   405,
	}}
	assert.True(t, IsResourceUnavailable(err))
}

func TestIsResourceUnavailable_Forbidden_IsNot(t *testing.T) {
	err := k8serrors.NewForbidden(schema.GroupResource{Group: "opendatahub.io", Resource: "auths"}, "auth", fmt.Errorf("forbidden"))
	assert.False(t, IsResourceUnavailable(err))
}
