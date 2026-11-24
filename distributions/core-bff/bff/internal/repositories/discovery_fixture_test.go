package repositories

import (
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/discovery"
	fakediscovery "k8s.io/client-go/discovery/fake"
	k8stesting "k8s.io/client-go/testing"
)

// emptyDiscovery serves no API groups, so it confirms any API is absent.
func emptyDiscovery() discovery.DiscoveryInterface {
	return &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{}}
}

// servesAuth lists the Auth resource, as discovery does wherever the CRD is installed.
func servesAuth() discovery.DiscoveryInterface {
	return &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{Resources: []*metav1.APIResourceList{{
		GroupVersion: models.AuthGVR.GroupVersion().String(),
		APIResources: []metav1.APIResource{{Name: models.AuthGVR.Resource}},
	}}}}
}
