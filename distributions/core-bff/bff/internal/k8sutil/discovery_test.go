package k8sutil

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	fakediscovery "k8s.io/client-go/discovery/fake"
	"k8s.io/client-go/rest"
	k8stesting "k8s.io/client-go/testing"
)

var clusterVersions = schema.GroupVersionResource{Group: "config.openshift.io", Version: "v1", Resource: "clusterversions"}

// coreGroup is what every real API server lists; without it a discovery
// answer is not trusted.
var coreGroup = &metav1.APIResourceList{GroupVersion: "v1", APIResources: []metav1.APIResource{{Name: "pods"}}}

func fakeDiscovery(resources ...*metav1.APIResourceList) *fakediscovery.FakeDiscovery {
	return &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{Resources: append([]*metav1.APIResourceList{coreGroup}, resources...)}}
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
		// A stub from an intermediary decodes to a list without the core group.
		{"answer without the core group", &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{}}, false},
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

// The reviewer's reproduction through the real discovery client: a proxy that
// answers /api with 404 and /apis with a JSON stub decodes to an empty group
// list, which must not confirm absence.
func TestConfirmAPIAbsent_StubDiscoveryOverHTTP(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/apis" {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"message":"ok"}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer srv.Close()

	disc, err := discovery.NewDiscoveryClientForConfig(&rest.Config{Host: srv.URL})
	require.NoError(t, err)
	absent, err := ConfirmAPIAbsent(context.Background(), disc, clusterVersions)
	assert.False(t, absent)
	assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
}

// Fullsend/CodeRabbit: the core group comes from /api, so a malformed but
// successful /apis body must not confirm absence of a non-core API, while a
// valid empty group list still does. The same applies to the resource list of
// a listed group version.
func TestConfirmAPIAbsent_ValidatesDiscoveryDocumentsOverHTTP(t *testing.T) {
	const apiDoc = `{"kind":"APIVersions","apiVersion":"v1","versions":["v1"],"serverAddressByClientCIDRs":[]}`
	const listsConfig = `{"kind":"APIGroupList","apiVersion":"v1","groups":[{"name":"config.openshift.io",` +
		`"versions":[{"groupVersion":"config.openshift.io/v1","version":"v1"}],` +
		`"preferredVersion":{"groupVersion":"config.openshift.io/v1","version":"v1"}}]}`
	for _, tc := range []struct {
		name      string
		apis      string
		resources string
		absent    bool
	}{
		{"malformed /apis", `{"message":"ok"}`, "", false},
		{"/apis of another kind", `{"kind":"Status","apiVersion":"v1","status":"Success"}`, "", false},
		{"valid empty group list", `{"kind":"APIGroupList","apiVersion":"v1","groups":[]}`, "", true},
		{"listed group, malformed resource list", listsConfig, `{}`, false},
		{"listed group, resource list without the resource", listsConfig,
			`{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"config.openshift.io/v1","resources":[{"name":"infrastructures","singularName":"","namespaced":false,"kind":"Infrastructure","verbs":["get"]}]}`, true},
		{"listed group, resource served", listsConfig,
			`{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"config.openshift.io/v1","resources":[{"name":"clusterversions","singularName":"","namespaced":false,"kind":"ClusterVersion","verbs":["get"]}]}`, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				switch r.URL.Path {
				case "/api":
					_, _ = w.Write([]byte(apiDoc))
				case "/apis":
					_, _ = w.Write([]byte(tc.apis))
				case "/apis/config.openshift.io/v1":
					if tc.resources == "" {
						http.NotFound(w, r)
						return
					}
					_, _ = w.Write([]byte(tc.resources))
				default:
					http.NotFound(w, r)
				}
			}))
			defer srv.Close()

			disc, err := discovery.NewDiscoveryClientForConfig(&rest.Config{Host: srv.URL})
			require.NoError(t, err)
			absent, err := ConfirmAPIAbsent(context.Background(), disc, clusterVersions)
			assert.Equal(t, tc.absent, absent)
			if tc.absent {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
			}
		})
	}
}
