package k8sutil

import (
	"context"
	"encoding/json"
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
var coreGroup = &metav1.APIResourceList{GroupVersion: "v1", APIResources: []metav1.APIResource{{Name: "pods", Kind: "Pod"}}}

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
		// Version skew: the group is served, only not at this version, so the
		// resource may exist and absence is not confirmed.
		{"group served at another version only", fakeDiscovery(&metav1.APIResourceList{GroupVersion: "config.openshift.io/v2",
			APIResources: []metav1.APIResource{{Name: "clusterversions", Kind: "ClusterVersion"}}}), false},
		{"group version served without the resource", fakeDiscovery(&metav1.APIResourceList{GroupVersion: "config.openshift.io/v1",
			APIResources: []metav1.APIResource{{Name: "infrastructures", Kind: "Infrastructure"}}}), true},
		{"resource served", fakeDiscovery(&metav1.APIResourceList{GroupVersion: "config.openshift.io/v1",
			APIResources: []metav1.APIResource{{Name: "clusterversions", Kind: "ClusterVersion"}}}), false},
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

// Review 6060889411: every field absence is decided from must be present and
// non-empty. An entry missing one (or carrying "") could be the API being
// looked for, so the answer is inconclusive; explicit empty lists still count.
func TestConfirmAPIAbsent_IncompleteEntriesAreInconclusive(t *testing.T) {
	// An unrelated group and resource, complete, so only the mutation decides.
	group := func() map[string]any {
		return map[string]any{
			"name":     "apps.example.io",
			"versions": []any{map[string]any{"groupVersion": "apps.example.io/v1", "version": "v1"}},
		}
	}
	configGroup := map[string]any{
		"name":     "config.openshift.io",
		"versions": []any{map[string]any{"groupVersion": "config.openshift.io/v1", "version": "v1"}},
	}
	resource := func() map[string]any {
		return map[string]any{"name": "infrastructures", "kind": "Infrastructure", "namespaced": false, "verbs": []any{"get"}}
	}
	groupList := func(groups ...any) string {
		if groups == nil {
			groups = []any{}
		}
		b, _ := json.Marshal(map[string]any{"kind": "APIGroupList", "apiVersion": "v1", "groups": groups})
		return string(b)
	}
	resourceList := func(resources ...any) string {
		if resources == nil {
			resources = []any{}
		}
		b, _ := json.Marshal(map[string]any{"kind": "APIResourceList", "apiVersion": "v1",
			"groupVersion": "config.openshift.io/v1", "resources": resources})
		return string(b)
	}
	const coreDoc = `{"kind":"APIVersions","apiVersion":"v1","versions":["v1"]}`

	type mutation struct {
		name string
		edit func(map[string]any)
	}
	missingOrEmpty := func(field string) []mutation {
		return []mutation{
			{field + " missing", func(m map[string]any) { delete(m, field) }},
			{field + " empty", func(m map[string]any) { m[field] = "" }},
		}
	}
	version := func(edit func(map[string]any)) func(map[string]any) {
		return func(g map[string]any) { edit(g["versions"].([]any)[0].(map[string]any)) }
	}

	type tc struct {
		name      string
		core      string
		apis      string
		resources string
		absent    bool
	}
	cases := []tc{
		{"complete documents: absent", coreDoc, groupList(group()), "", true},
		{"explicit empty group list: absent", coreDoc, groupList(), "", true},
		{"group served at another version: inconclusive", coreDoc, groupList(map[string]any{"name": "config.openshift.io",
			"versions": []any{map[string]any{"groupVersion": "config.openshift.io/v2", "version": "v2"}}}), "", false},
		{"explicit empty resource list: absent", coreDoc, groupList(configGroup), resourceList(), true},
		{"complete resource list without the resource: absent", coreDoc, groupList(configGroup), resourceList(resource()), true},
		{"core document with an empty version", `{"kind":"APIVersions","apiVersion":"v1","versions":["v1",""]}`, groupList(), "", false},
		{"group with an explicit empty versions list", coreDoc, groupList(map[string]any{"name": "apps.example.io", "versions": []any{}}), "", false},
		{"group without versions", coreDoc, groupList(map[string]any{"name": "apps.example.io"}), "", false},
		{"version whose groupVersion does not match", coreDoc, groupList(map[string]any{"name": "apps.example.io",
			"versions": []any{map[string]any{"groupVersion": "config.openshift.io/v1", "version": "v1"}}}), "", false},
	}
	for _, m := range missingOrEmpty("name") {
		g := group()
		m.edit(g)
		cases = append(cases, tc{"group " + m.name, coreDoc, groupList(g), "", false})
	}
	for _, field := range []string{"groupVersion", "version"} {
		for _, m := range missingOrEmpty(field) {
			g := group()
			version(m.edit)(g)
			cases = append(cases, tc{"group version " + m.name, coreDoc, groupList(g), "", false})
		}
	}
	for _, field := range []string{"name", "kind"} {
		for _, m := range missingOrEmpty(field) {
			r := resource()
			m.edit(r)
			cases = append(cases, tc{"resource " + m.name, coreDoc, groupList(configGroup), resourceList(r), false})
		}
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				switch {
				case r.URL.Path == "/api":
					_, _ = w.Write([]byte(c.core))
				case r.URL.Path == "/apis":
					_, _ = w.Write([]byte(c.apis))
				case r.URL.Path == "/apis/config.openshift.io/v1" && c.resources != "":
					_, _ = w.Write([]byte(c.resources))
				default:
					http.NotFound(w, r)
				}
			}))
			defer srv.Close()

			disc, err := discovery.NewDiscoveryClientForConfig(&rest.Config{Host: srv.URL})
			require.NoError(t, err)
			absent, err := ConfirmAPIAbsent(context.Background(), disc, clusterVersions)
			assert.Equal(t, c.absent, absent)
			if c.absent {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
			}
		})
	}
}

// The typed path (in-memory clients) applies the same entry rules.
func TestConfirmAPIAbsent_TypedIncompleteEntriesAreInconclusive(t *testing.T) {
	for name, entry := range map[string]metav1.APIResource{
		"resource name empty": {Name: "", Kind: "Infrastructure"},
		"resource kind empty": {Name: "infrastructures", Kind: ""},
	} {
		t.Run(name, func(t *testing.T) {
			disc := fakeDiscovery(&metav1.APIResourceList{GroupVersion: "config.openshift.io/v1", APIResources: []metav1.APIResource{entry}})
			absent, err := ConfirmAPIAbsent(context.Background(), disc, clusterVersions)
			assert.False(t, absent)
			assert.ErrorIs(t, err, ErrAbsenceUnconfirmed)
		})
	}

	// Group entries as the typed path sees them (ServerGroups merges /api in
	// as the unnamed core group).
	require.Error(t, validateGroupList(&metav1.APIGroupList{Groups: []metav1.APIGroup{
		{Name: "apps.example.io", Versions: []metav1.GroupVersionForDiscovery{{Version: "v1"}}},
	}}, true))
	require.Error(t, validateGroupList(&metav1.APIGroupList{Groups: []metav1.APIGroup{
		{Versions: []metav1.GroupVersionForDiscovery{{GroupVersion: "v1", Version: "v1"}}},
	}}, false), "only the merged core group may be unnamed")
	require.NoError(t, validateGroupList(&metav1.APIGroupList{Groups: []metav1.APIGroup{
		{Versions: []metav1.GroupVersionForDiscovery{{GroupVersion: "v1", Version: "v1"}}},
	}}, true))
	require.NoError(t, validateGroupList(&metav1.APIGroupList{}, false), "an explicit empty list is valid")
}
