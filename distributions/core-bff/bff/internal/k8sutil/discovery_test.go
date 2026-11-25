package k8sutil

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
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

// Review 6058010211: the caller's context reaches the discovery request, so a
// caller that leaves cancels the in-flight HTTP request instead of leaving it
// running.
func TestConfirmAPIAbsent_CancellationReachesTheTransport(t *testing.T) {
	started := make(chan struct{})
	cancelled := make(chan struct{})
	var startOnce, cancelOnce sync.Once
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startOnce.Do(func() { close(started) })
		<-r.Context().Done()
		cancelOnce.Do(func() { close(cancelled) })
	}))
	defer srv.Close()

	disc, err := discovery.NewDiscoveryClientForConfig(&rest.Config{Host: srv.URL})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		<-started
		cancel()
	}()

	absent, err := ConfirmAPIAbsent(ctx, disc, clusterVersions)
	assert.False(t, absent)
	assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
	assert.ErrorIs(t, err, context.Canceled)
	select {
	case <-cancelled:
	case <-time.After(5 * time.Second):
		t.Fatal("the discovery request was not cancelled on the server side")
	}
}

func TestConfirmAPIAbsent_AlreadyCancelledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	absent, err := ConfirmAPIAbsent(ctx, fakeDiscovery(), clusterVersions)
	assert.False(t, absent)
	assert.ErrorIs(t, err, context.Canceled)
}

// Review 6058010211: the decision uses the resource list that was validated.
// Successive reads return different bodies; the list is read once and that
// same body decides.
func TestConfirmAPIAbsent_DecidesFromTheValidatedResourceList(t *testing.T) {
	const apiDoc = `{"kind":"APIVersions","apiVersion":"v1","versions":["v1"],"serverAddressByClientCIDRs":[]}`
	const listsConfig = `{"kind":"APIGroupList","apiVersion":"v1","groups":[{"name":"config.openshift.io",` +
		`"versions":[{"groupVersion":"config.openshift.io/v1","version":"v1"}],` +
		`"preferredVersion":{"groupVersion":"config.openshift.io/v1","version":"v1"}}]}`
	const servesClusterVersions = `{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"config.openshift.io/v1",` +
		`"resources":[{"name":"clusterversions","singularName":"","namespaced":false,"kind":"ClusterVersion","verbs":["get"]}]}`
	for _, tc := range []struct {
		name   string
		bodies []string
	}{
		{"malformed, then a list serving the resource", []string{`{}`, servesClusterVersions}},
		{"another group version's list, then a list serving the resource", []string{
			`{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"config.openshift.io/v2","resources":[]}`, servesClusterVersions}},
		{"a list serving the resource, then malformed", []string{servesClusterVersions, `{}`}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var reads atomic.Int32
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				switch r.URL.Path {
				case "/api":
					_, _ = w.Write([]byte(apiDoc))
				case "/apis":
					_, _ = w.Write([]byte(listsConfig))
				case "/apis/config.openshift.io/v1":
					n := int(reads.Add(1)) - 1
					_, _ = w.Write([]byte(tc.bodies[min(n, len(tc.bodies)-1)]))
				default:
					http.NotFound(w, r)
				}
			}))
			defer srv.Close()

			disc, err := discovery.NewDiscoveryClientForConfig(&rest.Config{Host: srv.URL})
			require.NoError(t, err)
			absent, err := ConfirmAPIAbsent(context.Background(), disc, clusterVersions)
			assert.False(t, absent)
			assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
			assert.Equal(t, int32(1), reads.Load(), "the resource list is read once")
		})
	}
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
		// Review 6059203374: groups and resources are required by the schema;
		// a missing or null list is not an empty one.
		{"group list without groups", `{"kind":"APIGroupList","apiVersion":"v1"}`, "", false},
		{"group list with null groups", `{"kind":"APIGroupList","apiVersion":"v1","groups":null}`, "", false},
		{"listed group, resource list without resources", listsConfig,
			`{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"config.openshift.io/v1"}`, false},
		{"listed group, resource list with null resources", listsConfig,
			`{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"config.openshift.io/v1","resources":null}`, false},
		{"listed group, empty resource list", listsConfig,
			`{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"config.openshift.io/v1","resources":[]}`, true},
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

// /api must carry its versions list too; without it the core group is not shown.
func TestConfirmAPIAbsent_CoreDocumentWithoutVersions(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api":
			_, _ = w.Write([]byte(`{"kind":"APIVersions","apiVersion":"v1"}`))
		case "/apis":
			_, _ = w.Write([]byte(`{"kind":"APIGroupList","apiVersion":"v1","groups":[]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	disc, err := discovery.NewDiscoveryClientForConfig(&rest.Config{Host: srv.URL})
	require.NoError(t, err)
	absent, err := ConfirmAPIAbsent(context.Background(), disc, clusterVersions)
	assert.False(t, absent)
	assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
}
