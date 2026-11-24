package api

import (
	"k8s.io/client-go/discovery"
	fakediscovery "k8s.io/client-go/discovery/fake"
	k8stesting "k8s.io/client-go/testing"
)

// emptyDiscovery serves no API groups, so it confirms any API is absent.
func emptyDiscovery() discovery.DiscoveryInterface {
	return &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{}}
}
