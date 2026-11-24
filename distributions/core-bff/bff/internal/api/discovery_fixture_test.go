package api

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/discovery"
	fakediscovery "k8s.io/client-go/discovery/fake"
	k8stesting "k8s.io/client-go/testing"
)

// emptyDiscovery serves only the core group, so it confirms any other API is absent.
func emptyDiscovery() discovery.DiscoveryInterface {
	return &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{Resources: []*metav1.APIResourceList{coreGroup()}}}
}

// coreGroup is listed by every real API server; discovery is not trusted without it.
func coreGroup() *metav1.APIResourceList {
	return &metav1.APIResourceList{GroupVersion: "v1", APIResources: []metav1.APIResource{{Name: "pods"}}}
}
