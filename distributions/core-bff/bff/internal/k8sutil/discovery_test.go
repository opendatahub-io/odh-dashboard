package k8sutil

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	fakediscovery "k8s.io/client-go/discovery/fake"
	k8stesting "k8s.io/client-go/testing"
)

var clusterVersions = schema.GroupVersionResource{Group: "config.openshift.io", Version: "v1", Resource: "clusterversions"}

func fakeDiscovery(resources ...*metav1.APIResourceList) *fakediscovery.FakeDiscovery {
	return &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{Resources: resources}}
}

// blockingDiscovery never answers, like a hung discovery request.
type blockingDiscovery struct {
	discovery.DiscoveryInterface
	release chan struct{}
}

func (b blockingDiscovery) ServerGroups() (*metav1.APIGroupList, error) {
	<-b.release
	return nil, errors.New("released")
}

func TestConfirmAPIAbsent(t *testing.T) {
	failingGroups := fakeDiscovery()
	failingGroups.PrependReactor("get", "group", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("bare 404 from an intermediary")
	})

	for _, tc := range []struct {
		name   string
		disc   discovery.DiscoveryInterface
		absent bool
	}{
		{"group not served", fakeDiscovery(), true},
		{"other group versions only", fakeDiscovery(&metav1.APIResourceList{GroupVersion: "config.openshift.io/v2",
			APIResources: []metav1.APIResource{{Name: "clusterversions"}}}), true},
		{"group version served without the resource", fakeDiscovery(&metav1.APIResourceList{GroupVersion: "config.openshift.io/v1",
			APIResources: []metav1.APIResource{{Name: "infrastructures"}}}), true},
		{"resource served", fakeDiscovery(&metav1.APIResourceList{GroupVersion: "config.openshift.io/v1",
			APIResources: []metav1.APIResource{{Name: "clusterversions"}}}), false},
		{"group list fails", failingGroups, false},
		{"no discovery client", nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			absent, err := ConfirmAPIAbsent(context.Background(), tc.disc, clusterVersions)
			assert.Equal(t, tc.absent, absent)
			if tc.absent {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
			}
		})
	}
}

func TestConfirmAPIAbsent_HonoursTheContextDeadline(t *testing.T) {
	release := make(chan struct{})
	defer close(release)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	absent, err := ConfirmAPIAbsent(ctx, blockingDiscovery{release: release}, clusterVersions)
	require.Error(t, err)
	assert.False(t, absent)
	assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
}
