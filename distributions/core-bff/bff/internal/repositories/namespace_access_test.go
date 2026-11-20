package repositories

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

var errReview = errors.New("review failed")

// rbacClient answers access reviews from a rule table, the way an authorizer
// would. Rules are "<namespace>|<group>/<resource>|<verb>"; "*" as namespace
// matches every namespace (a cluster-wide grant), and "" matches only a review
// made without a namespace.
type rbacClient struct {
	k8s.KubernetesClientInterface
	mu            sync.Mutex
	allow         map[string]bool
	fail          map[string]bool // same key format: the review request errors
	indeterminate map[string]bool // same key format: completes with no decision
	canList       bool
	listErr       error
	reviewErr     error // every review errors
	namespaces    map[string]*corev1.Namespace
	reviews       atomic.Int32
	reviewed      []k8s.AccessReviewAttributes
	inFlight      atomic.Int32
	maxFlight     atomic.Int32
}

func key(ns, group, resource, verb string) string {
	return ns + "|" + PermissionKey(group, resource) + "|" + verb
}

func (c *rbacClient) ReviewAccess(_ context.Context, _ *k8s.RequestIdentity, a k8s.AccessReviewAttributes) (k8s.AccessReviewResult, error) {
	verb, group, resource, namespace := a.Verb, a.Group, a.Resource, a.Namespace
	n := c.inFlight.Add(1)
	defer c.inFlight.Add(-1)
	for {
		m := c.maxFlight.Load()
		if n <= m || c.maxFlight.CompareAndSwap(m, n) {
			break
		}
	}
	c.reviews.Add(1)
	c.mu.Lock()
	defer c.mu.Unlock()
	c.reviewed = append(c.reviewed, a)
	if c.reviewErr != nil {
		return k8s.AccessReviewDenied, c.reviewErr
	}
	k := key(namespace, group, resource, verb)
	switch {
	case c.fail[k]:
		return k8s.AccessReviewDenied, errReview
	case c.indeterminate[k]:
		return k8s.AccessReviewIndeterminate, nil
	case namespace == "" && resource == "namespaces" && verb == "list":
		return boolResult(c.canList), nil
	}
	return boolResult(c.allow[k] || c.allow[key("*", group, resource, verb)]), nil
}

func boolResult(allowed bool) k8s.AccessReviewResult {
	if allowed {
		return k8s.AccessReviewAllowed
	}
	return k8s.AccessReviewDenied
}

func (c *rbacClient) GetNamespace(_ context.Context, _ *k8s.RequestIdentity, name string) (*corev1.Namespace, error) {
	if ns, ok := c.namespaces[name]; ok {
		return ns, nil
	}
	return nil, k8serrors.NewNotFound(schema.GroupResource{Resource: "namespaces"}, name)
}

func (c *rbacClient) GetNamespaces(context.Context, *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	if c.listErr != nil {
		return nil, c.listErr
	}
	out := []corev1.Namespace{}
	for _, ns := range c.namespaces {
		out = append(out, *ns)
	}
	return out, nil
}

func activeNS(name, display string) *corev1.Namespace {
	ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: name}, Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive}}
	if display != "" {
		ns.Annotations = map[string]string{"openshift.io/display-name": display}
	}
	return ns
}

// grant adds the verbs of one matrix resource in ns.
func grant(allow map[string]bool, ns, group, resource string, verbs ...string) {
	for _, v := range verbs {
		allow[key(ns, group, resource, v)] = true
	}
}

func deployer(allow map[string]bool, ns string) {
	grant(allow, ns, groupServing, "llminferenceservices", "get", "list", "watch", "create", "update", "patch", "delete")
	grant(allow, ns, "", "secrets", "create", "get", "patch", "delete")
	grant(allow, ns, "", "namespaces", "get")
}

func viewer(allow map[string]bool, ns string) {
	grant(allow, ns, groupServing, "llminferenceservices", "get", "list", "watch")
	grant(allow, ns, "", "namespaces", "get")
}

func names(list models.NamespaceAccessList) []string {
	out := []string{}
	for _, ns := range list.Namespaces {
		out = append(out, ns.Name)
	}
	return out
}

func identity() *k8s.RequestIdentity { return &k8s.RequestIdentity{UserID: "u"} }

func TestDeriveNamespaceActions_PermissionMatrix(t *testing.T) {
	llm := PermissionKey(groupServing, "llminferenceservices")
	sec := PermissionKey("", "secrets")
	all := func(d models.AccessDecision, verbs ...string) models.ResourcePermissions {
		p := models.ResourcePermissions{}
		for _, v := range verbs {
			p[v] = d
		}
		return p
	}
	for _, tc := range []struct {
		name  string
		perms map[string]models.ResourcePermissions
		want  models.NamespaceActions
	}{
		{
			name:  "full deployer",
			perms: map[string]models.ResourcePermissions{llm: all(models.AccessAllowed, "get", "list", "create", "update", "patch", "delete"), sec: all(models.AccessAllowed, "create", "get", "patch", "delete")},
			want:  models.NamespaceActions{View: true, Deploy: true, Edit: true, Delete: true, ManageTokenAuth: true},
		},
		{
			name:  "edit needs update as well as patch",
			perms: map[string]models.ResourcePermissions{llm: {"get": models.AccessAllowed, "list": models.AccessAllowed, "patch": models.AccessAllowed, "update": models.AccessDenied}},
			want:  models.NamespaceActions{View: true},
		},
		{
			name:  "errored update fails edit closed",
			perms: map[string]models.ResourcePermissions{llm: {"get": models.AccessAllowed, "list": models.AccessAllowed, "patch": models.AccessAllowed, "update": models.AccessError}},
			want:  models.NamespaceActions{View: true},
		},
		{
			name:  "update without patch is not edit",
			perms: map[string]models.ResourcePermissions{llm: {"get": models.AccessAllowed, "list": models.AccessAllowed, "patch": models.AccessDenied, "update": models.AccessAllowed}},
			want:  models.NamespaceActions{View: true},
		},
		{
			name:  "read-only is never offered mutations",
			perms: map[string]models.ResourcePermissions{llm: {"get": models.AccessAllowed, "list": models.AccessAllowed, "create": models.AccessDenied, "patch": models.AccessDenied, "delete": models.AccessDenied}},
			want:  models.NamespaceActions{View: true},
		},
		{
			name:  "view needs both list and get",
			perms: map[string]models.ResourcePermissions{llm: {"list": models.AccessAllowed, "get": models.AccessDenied}},
			want:  models.NamespaceActions{},
		},
		{
			name:  "errored create fails closed",
			perms: map[string]models.ResourcePermissions{llm: {"get": models.AccessAllowed, "list": models.AccessAllowed, "create": models.AccessError, "delete": models.AccessError}},
			want:  models.NamespaceActions{View: true},
		},
		{
			name:  "token auth needs every Secret verb including the owner-reference patch",
			perms: map[string]models.ResourcePermissions{sec: {"create": models.AccessAllowed, "get": models.AccessAllowed, "patch": models.AccessDenied, "delete": models.AccessAllowed}},
			want:  models.NamespaceActions{},
		},
		{
			name:  "Secret access alone does not grant model actions",
			perms: map[string]models.ResourcePermissions{sec: all(models.AccessAllowed, "create", "get", "patch", "delete")},
			want:  models.NamespaceActions{ManageTokenAuth: true},
		},
		{name: "nothing", perms: map[string]models.ResourcePermissions{}, want: models.NamespaceActions{}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, DeriveNamespaceActions(tc.perms))
		})
	}
}

func TestDiscover_NoNamespaceListPermission_MixedAccess(t *testing.T) {
	allow := map[string]bool{}
	deployer(allow, "team-a")
	viewer(allow, "team-b")
	// team-c has only unrelated access: it must not appear.
	grant(allow, "team-c", "", "pods", "get", "list")
	client := &rbacClient{allow: allow, namespaces: map[string]*corev1.Namespace{
		"team-a": activeNS("team-a", "Team A"), "team-b": activeNS("team-b", ""), "team-c": activeNS("team-c", ""),
	}}
	repo := NewNamespaceAccessRepository([]string{"team-a", "team-b", "team-c", "secret-ns"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)

	assert.Equal(t, models.NamespaceSourceCandidates, list.Source)
	assert.True(t, list.Complete)
	assert.Empty(t, list.Issues)
	assert.Equal(t, []string{"team-a", "team-b"}, names(list))

	a, b := list.Namespaces[0], list.Namespaces[1]
	assert.Equal(t, models.NamespaceActions{View: true, Deploy: true, Edit: true, Delete: true, ManageTokenAuth: true}, a.Actions)
	assert.Equal(t, "Team A", a.DisplayName)
	assert.Equal(t, "Active", a.Phase)
	assert.Equal(t, models.NamespaceActions{View: true}, b.Actions)
	assert.Equal(t, models.AccessDenied, b.Permissions[PermissionKey(groupServing, "llminferenceservices")]["create"])
	assert.Equal(t, models.AccessDenied, b.Permissions[PermissionKey("", "secrets")]["get"])
	assert.Equal(t, models.AccessAllowed, b.Permissions[PermissionKey("", "namespaces")]["get"])

	// Every matrix entry is reported.
	for _, c := range NamespacePermissionMatrix {
		for _, v := range c.Verbs {
			assert.Contains(t, a.Permissions[PermissionKey(c.Group, c.Resource)], v)
		}
	}
}

func TestDiscover_EmptyResultIsAnArray(t *testing.T) {
	repo := NewNamespaceAccessRepository(nil, "", nil, "opendatahub")
	list, err := repo.Discover(context.Background(), &rbacClient{}, identity(), nil)
	require.NoError(t, err)
	require.NotNil(t, list.Namespaces)
	assert.Empty(t, list.Namespaces)
	assert.NotNil(t, list.Issues)
	assert.True(t, list.Complete)
	assert.Equal(t, models.NamespaceSourceCandidates, list.Source)
}

func TestDiscover_AllCandidatesDeniedIsEmptyNotAnError(t *testing.T) {
	repo := NewNamespaceAccessRepository([]string{"team-a", "team-b"}, "", nil, "opendatahub")
	list, err := repo.Discover(context.Background(), &rbacClient{}, identity(), nil)
	require.NoError(t, err)
	assert.Empty(t, list.Namespaces)
	assert.True(t, list.Complete)
}

func TestDiscover_RequestedNamespacesAreTheManualFallback(t *testing.T) {
	allow := map[string]bool{}
	viewer(allow, "remembered")
	client := &rbacClient{allow: allow, namespaces: map[string]*corev1.Namespace{"remembered": activeNS("remembered", "")}}
	repo := NewNamespaceAccessRepository(nil, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), []string{"remembered", "not-mine"})
	require.NoError(t, err)
	assert.Equal(t, []string{"remembered"}, names(list))
}

func TestDiscover_FailedReviewsAreReportedWithoutNames(t *testing.T) {
	allow := map[string]bool{}
	deployer(allow, "team-a")
	fail := map[string]bool{}
	for _, c := range NamespacePermissionMatrix {
		for _, v := range c.Verbs {
			fail[key("broken", c.Group, c.Resource, v)] = true
		}
	}
	client := &rbacClient{allow: allow, fail: fail, namespaces: map[string]*corev1.Namespace{"team-a": activeNS("team-a", "")}}
	repo := NewNamespaceAccessRepository([]string{"team-a", "broken"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	assert.Equal(t, []string{"team-a"}, names(list))
	assert.False(t, list.Complete)
	assert.Equal(t, []models.NamespaceDiscoveryIssue{{Code: models.IssueAccessReviewFailed, Count: 1}}, list.Issues)
}

func TestDiscover_PartialReviewFailureKeepsNamespaceButFailsActionClosed(t *testing.T) {
	allow := map[string]bool{}
	viewer(allow, "team-a")
	grant(allow, "team-a", groupServing, "llminferenceservices", "delete")
	client := &rbacClient{
		allow:      allow,
		fail:       map[string]bool{key("team-a", groupServing, "llminferenceservices", "create"): true},
		namespaces: map[string]*corev1.Namespace{"team-a": activeNS("team-a", "")},
	}
	repo := NewNamespaceAccessRepository([]string{"team-a"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	require.Len(t, list.Namespaces, 1)
	ns := list.Namespaces[0]
	assert.Equal(t, models.NamespaceActions{View: true, Delete: true}, ns.Actions)
	assert.Equal(t, models.AccessError, ns.Permissions[PermissionKey(groupServing, "llminferenceservices")]["create"])
	// The namespace is returned, but its failed review is still reported.
	assert.False(t, list.Complete)
	assert.Equal(t, []models.NamespaceDiscoveryIssue{{Code: models.IssueAccessReviewFailed, Count: 1}}, list.Issues)
}

func TestDiscover_IndeterminateReviewsAreErrorsNotDenials(t *testing.T) {
	allow := map[string]bool{}
	viewer(allow, "team-a")
	indeterminate := map[string]bool{key("team-a", groupServing, "llminferenceservices", "create"): true}
	for _, c := range NamespacePermissionMatrix {
		for _, v := range c.Verbs {
			indeterminate[key("webhook-down", c.Group, c.Resource, v)] = true
		}
	}
	client := &rbacClient{allow: allow, indeterminate: indeterminate, namespaces: map[string]*corev1.Namespace{"team-a": activeNS("team-a", "")}}
	repo := NewNamespaceAccessRepository([]string{"team-a", "webhook-down"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	assert.Equal(t, []string{"team-a"}, names(list))
	assert.Equal(t, models.AccessError, list.Namespaces[0].Permissions[PermissionKey(groupServing, "llminferenceservices")]["create"])
	assert.False(t, list.Namespaces[0].Actions.Deploy)
	assert.False(t, list.Complete, "an authorizer failure is not a clean result")
	assert.Equal(t, []models.NamespaceDiscoveryIssue{{Code: models.IssueAccessReviewFailed, Count: 2}}, list.Issues)

	// Indeterminate everywhere is unavailable, never an empty success.
	only := NewNamespaceAccessRepository([]string{"webhook-down"}, "", nil, "opendatahub")
	_, err = only.Discover(context.Background(), client, identity(), nil)
	assert.ErrorIs(t, err, ErrNamespaceDiscoveryUnavailable)
	_, err = only.Get(context.Background(), client, identity(), "webhook-down")
	assert.ErrorIs(t, err, ErrNamespaceAccessReviewFailed)
}

func TestDiscover_IndeterminateClusterListReviewFallsBackToCandidates(t *testing.T) {
	allow := map[string]bool{}
	viewer(allow, "team-a")
	client := &rbacClient{
		allow:         allow,
		canList:       true,
		indeterminate: map[string]bool{key("", "", "namespaces", "list"): true},
		namespaces:    map[string]*corev1.Namespace{"team-a": activeNS("team-a", "")},
	}
	repo := NewNamespaceAccessRepository([]string{"team-a"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	assert.Equal(t, models.NamespaceSourceCandidates, list.Source)
	assert.Equal(t, []string{"team-a"}, names(list))
	assert.Contains(t, list.Issues, models.NamespaceDiscoveryIssue{Code: models.IssueClusterListReviewFailed, Count: 1})
}

func TestDiscover_EveryReviewFailingIsUnavailable(t *testing.T) {
	repo := NewNamespaceAccessRepository([]string{"team-a"}, "", nil, "opendatahub")
	list, err := repo.Discover(context.Background(), &rbacClient{reviewErr: errReview}, identity(), nil)
	require.ErrorIs(t, err, ErrNamespaceDiscoveryUnavailable)
	assert.False(t, list.Complete)
	assert.ElementsMatch(t, []models.NamespaceDiscoveryIssue{
		{Code: models.IssueClusterListReviewFailed, Count: 1},
		{Code: models.IssueAccessReviewFailed, Count: 1},
		{Code: models.IssueSharedAccessReviewFailed, Count: 4},
	}, list.Issues)
}

func TestDiscover_ClusterListUsesTheCallersListAndStillFilters(t *testing.T) {
	allow := map[string]bool{}
	deployer(allow, "*") // cluster-wide grant
	client := &rbacClient{canList: true, allow: allow, namespaces: map[string]*corev1.Namespace{
		"team-a": activeNS("team-a", ""), "team-b": activeNS("team-b", ""),
	}}
	// Configured candidates are not consulted when the caller can list.
	repo := NewNamespaceAccessRepository([]string{"configured"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	assert.Equal(t, models.NamespaceSourceClusterList, list.Source)
	assert.Equal(t, []string{"team-a", "team-b"}, names(list))
}

func TestDiscover_ClusterListFailureFallsBackToCandidates(t *testing.T) {
	allow := map[string]bool{}
	viewer(allow, "team-a")
	client := &rbacClient{canList: true, listErr: errors.New("boom"), allow: allow, namespaces: map[string]*corev1.Namespace{"team-a": activeNS("team-a", "")}}
	repo := NewNamespaceAccessRepository([]string{"team-a"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	assert.Equal(t, models.NamespaceSourceCandidates, list.Source)
	assert.Equal(t, []string{"team-a"}, names(list))
	assert.False(t, list.Complete)
	assert.Equal(t, []models.NamespaceDiscoveryIssue{{Code: models.IssueClusterListFailed, Count: 1}}, list.Issues)
}

func TestDiscover_LabelledNamespacesAreOnlyCandidates(t *testing.T) {
	sa := fake.NewSimpleClientset(
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "labelled-mine", Labels: map[string]string{"opendatahub.io/dashboard": "true"}, Annotations: map[string]string{"openshift.io/display-name": "Mine"}}, Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive}},
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "labelled-other", Labels: map[string]string{"opendatahub.io/dashboard": "true"}}},
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "unlabelled-mine"}},
	)
	allow := map[string]bool{}
	// The caller may use the namespace but cannot read the Namespace object, so
	// the service account's copy must not leak its metadata.
	grant(allow, "labelled-mine", groupServing, "llminferenceservices", "get", "list")
	viewer(allow, "unlabelled-mine")
	repo := NewNamespaceAccessRepository(nil, "opendatahub.io/dashboard=true", sa, "opendatahub")

	list, err := repo.Discover(context.Background(), &rbacClient{allow: allow}, identity(), nil)
	require.NoError(t, err)
	assert.Equal(t, []string{"labelled-mine"}, names(list), "a label never grants access, and unlabelled namespaces are not discovered")
	assert.Empty(t, list.Namespaces[0].DisplayName)
	assert.Equal(t, models.NamespacePhaseUnknown, list.Namespaces[0].Phase)
	assert.Equal(t, models.AccessDenied, list.Namespaces[0].Permissions[PermissionKey("", "namespaces")]["get"])
}

func TestDiscover_LabelDiscoveryFailureIsReported(t *testing.T) {
	sa := fake.NewSimpleClientset()
	sa.PrependReactor("list", "namespaces", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "", errors.New("no"))
	})
	repo := NewNamespaceAccessRepository(nil, "opendatahub.io/dashboard=true", sa, "opendatahub")

	_, err := repo.Discover(context.Background(), &rbacClient{}, identity(), nil)
	require.ErrorIs(t, err, ErrNamespaceDiscoveryUnavailable, "a failed source with nothing found is not an empty result")
}

func TestDiscover_SharedNamespaceReads(t *testing.T) {
	allow := map[string]bool{}
	grant(allow, "opendatahub", groupInfrastructure, "hardwareprofiles", "get", "list")
	repo := NewNamespaceAccessRepository(nil, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), &rbacClient{allow: allow}, identity(), nil)
	require.NoError(t, err)
	assert.Equal(t, "opendatahub", list.Shared.Namespace)
	assert.Equal(t, models.AccessAllowed, list.Shared.Permissions[PermissionKey(groupInfrastructure, "hardwareprofiles")]["list"])
	assert.Equal(t, models.AccessDenied, list.Shared.Permissions[PermissionKey(groupServing, "llminferenceserviceconfigs")]["list"])
	assert.NotContains(t, list.Shared.Permissions, PermissionKey("", "secrets"), "bootstrap needs no shared Secret access")
}

func TestDiscover_BoundsConcurrentReviews(t *testing.T) {
	candidates := []string{}
	allow := map[string]bool{}
	existing := map[string]*corev1.Namespace{}
	for i := 0; i < 40; i++ {
		n := "ns-" + itoa(i)
		candidates = append(candidates, n)
		viewer(allow, n)
		existing[n] = activeNS(n, "")
	}
	client := &rbacClient{allow: allow, namespaces: existing}
	repo := NewNamespaceAccessRepository(candidates, "", nil, "opendatahub")
	repo.reviewConcurrency = 4

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	assert.Len(t, list.Namespaces, 40)
	assert.LessOrEqual(t, client.maxFlight.Load(), int32(4))
}

func TestDiscover_TruncatesCandidates(t *testing.T) {
	requested := make([]string, 0, MaxDiscoveryCandidates+5)
	configured := []string{}
	for i := 0; i < MaxDiscoveryCandidates+5; i++ {
		configured = append(configured, "ns-"+itoa(i))
	}
	repo := NewNamespaceAccessRepository(configured, "", nil, "opendatahub")
	list, err := repo.Discover(context.Background(), &rbacClient{}, identity(), requested)
	require.NoError(t, err, "truncation alone is not a failure")
	assert.False(t, list.Complete)
	assert.Equal(t, []models.NamespaceDiscoveryIssue{{Code: models.IssueCandidatesTruncated, Count: 5}}, list.Issues)
}

func itoa(i int) string {
	const digits = "0123456789"
	if i == 0 {
		return "0"
	}
	out := ""
	for ; i > 0; i /= 10 {
		out = string(digits[i%10]) + out
	}
	return out
}

func TestGet_Outcomes(t *testing.T) {
	allow := map[string]bool{}
	viewer(allow, "mine")
	viewer(allow, "gone") // allowed by RBAC but the namespace does not exist
	grant(allow, "no-meta", groupServing, "llminferenceservices", "create")
	failAll := map[string]bool{}
	for _, c := range NamespacePermissionMatrix {
		for _, v := range c.Verbs {
			failAll[key("broken", c.Group, c.Resource, v)] = true
		}
	}
	client := &rbacClient{allow: allow, fail: failAll, namespaces: map[string]*corev1.Namespace{"mine": activeNS("mine", "Mine")}}
	repo := NewNamespaceAccessRepository(nil, "", nil, "opendatahub")
	ctx := context.Background()

	got, err := repo.Get(ctx, client, identity(), "mine")
	require.NoError(t, err)
	assert.Equal(t, "Mine", got.DisplayName)
	assert.True(t, got.Actions.View)
	assert.False(t, got.Actions.Deploy)

	got, err = repo.Get(ctx, client, identity(), "no-meta")
	require.NoError(t, err)
	assert.True(t, got.Actions.Deploy)
	assert.Equal(t, models.NamespacePhaseUnknown, got.Phase, "the phase is explicit when the caller cannot read the namespace")

	_, err = repo.Get(ctx, client, identity(), "gone")
	assert.ErrorIs(t, err, ErrNamespaceNotFound)

	// Denied and nonexistent-without-access look identical.
	_, err = repo.Get(ctx, client, identity(), "someone-else")
	assert.ErrorIs(t, err, ErrNamespaceAccessDenied)

	_, err = repo.Get(ctx, client, identity(), "broken")
	assert.ErrorIs(t, err, ErrNamespaceAccessReviewFailed)
}

func TestDiscover_LabelledMetadataShownWhenCallerCanRead(t *testing.T) {
	sa := fake.NewSimpleClientset(&corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: "labelled", Labels: map[string]string{"x": "y"}, Annotations: map[string]string{"openshift.io/display-name": "Labelled"}},
		Status:     corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
	})
	allow := map[string]bool{}
	viewer(allow, "labelled")
	repo := NewNamespaceAccessRepository(nil, "x=y", sa, "opendatahub")

	client := &rbacClient{allow: allow}
	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	require.Len(t, list.Namespaces, 1)
	assert.Equal(t, "Labelled", list.Namespaces[0].DisplayName)
	// The metadata is shown because of the caller's own named get, made the way
	// the API server resolves GET /api/v1/namespaces/labelled.
	assert.Contains(t, client.reviewed, k8s.AccessReviewAttributes{Verb: "get", Resource: "namespaces", Namespace: "labelled", Name: "labelled"})
}

func TestDiscover_ReliableDenialPlusFailureIsPartialEmptyNot503(t *testing.T) {
	fail := map[string]bool{}
	for _, c := range NamespacePermissionMatrix {
		for _, v := range c.Verbs {
			fail[key("broken", c.Group, c.Resource, v)] = true
		}
	}
	client := &rbacClient{allow: map[string]bool{}, fail: fail}
	repo := NewNamespaceAccessRepository([]string{"not-mine", "broken"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err, "a reliable denial means discovery did not fail outright")
	assert.Empty(t, list.Namespaces)
	assert.False(t, list.Complete)
	assert.Equal(t, []models.NamespaceDiscoveryIssue{{Code: models.IssueAccessReviewFailed, Count: 1}}, list.Issues)
}

func TestDiscover_NotFoundStillReportsItsFailedReviews(t *testing.T) {
	allow := map[string]bool{}
	deployer(allow, "gone")
	client := &rbacClient{allow: allow, fail: map[string]bool{key("gone", "", "pods", "list"): true}}
	repo := NewNamespaceAccessRepository([]string{"gone"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err, "a namespace that does not exist is a decided answer")
	assert.Empty(t, list.Namespaces)
	assert.False(t, list.Complete)
	assert.Equal(t, []models.NamespaceDiscoveryIssue{{Code: models.IssueAccessReviewFailed, Count: 1}}, list.Issues)
}

// detailBlockingClient answers the action reviews but never the rest, so the
// deadline expires after a namespace was already authorized.
type detailBlockingClient struct{ rbacClient }

func (c *detailBlockingClient) ReviewAccess(ctx context.Context, id *k8s.RequestIdentity, a k8s.AccessReviewAttributes) (k8s.AccessReviewResult, error) {
	if a.Resource == "pods" || a.Resource == "namespaces" || a.Verb == "watch" {
		<-ctx.Done()
		return k8s.AccessReviewDenied, ctx.Err()
	}
	return c.rbacClient.ReviewAccess(ctx, id, a)
}

func TestGet_DeadlineAfterAnAllowedReviewIsUnavailable(t *testing.T) {
	allow := map[string]bool{}
	viewer(allow, "team-a")
	client := &detailBlockingClient{rbacClient{allow: allow}}
	repo := NewNamespaceAccessRepository(nil, "", nil, "opendatahub")
	repo.timeout = 50 * time.Millisecond

	_, err := repo.Get(context.Background(), client, identity(), "team-a")
	assert.ErrorIs(t, err, ErrNamespaceAccessReviewFailed)
}

// An authorizer can allow a review made without a namespace yet deny the same
// verb in a given namespace (webhooks may decide per namespace). Discovery
// must therefore never reuse a namespace-less answer for a named namespace.
func TestDiscover_EveryActionIsReviewedInTheTargetNamespace(t *testing.T) {
	allow := map[string]bool{}
	deployer(allow, "") // allowed only for reviews without a namespace
	viewer(allow, "team-a")
	client := &rbacClient{allow: allow, namespaces: map[string]*corev1.Namespace{
		"team-a": activeNS("team-a", ""), "team-b": activeNS("team-b", ""),
	}}
	repo := NewNamespaceAccessRepository([]string{"team-a", "team-b"}, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	assert.Equal(t, []string{"team-a"}, names(list))
	assert.Equal(t, models.NamespaceActions{View: true}, list.Namespaces[0].Actions)
	for _, a := range client.reviewed {
		if a.Namespace == "" {
			assert.Equal(t, k8s.AccessReviewAttributes{Verb: "list", Resource: "namespaces"}, a,
				"only the cluster-list review is made without a namespace")
		}
	}
}

func TestDiscover_ServiceAccountMetadataNeedsTheCallersNamedGet(t *testing.T) {
	allow := map[string]bool{}
	deployer(allow, "labelled")
	delete(allow, key("labelled", "", "namespaces", "get"))
	grant(allow, "", "", "namespaces", "get") // a namespace-less get proves nothing here
	sa := fake.NewSimpleClientset(&corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: "labelled", Labels: map[string]string{"opendatahub.io/dashboard": "true"}, Annotations: map[string]string{"openshift.io/display-name": "Secret name"}},
		Status:     corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
	})
	repo := NewNamespaceAccessRepository(nil, "opendatahub.io/dashboard=true", sa, "opendatahub")

	list, err := repo.Discover(context.Background(), &rbacClient{allow: allow}, identity(), nil)
	require.NoError(t, err)
	require.Len(t, list.Namespaces, 1)
	assert.Empty(t, list.Namespaces[0].DisplayName)
	assert.Equal(t, models.NamespacePhaseUnknown, list.Namespaces[0].Phase)
	assert.Equal(t, models.AccessDenied, list.Namespaces[0].Permissions[PermissionKey("", "namespaces")]["get"])
}

func TestDiscover_HiddenNamespacesCostOnlyTheActionReviews(t *testing.T) {
	client := &rbacClient{allow: map[string]bool{}}
	repo := NewNamespaceAccessRepository([]string{"not-mine"}, "", nil, "opendatahub")

	_, err := repo.Discover(context.Background(), client, identity(), nil)
	require.NoError(t, err)
	actionReviews := 0
	for _, c := range actionPermissionMatrix {
		actionReviews += len(c.Verbs)
	}
	perNamespace := 0
	for _, a := range client.reviewed {
		if a.Namespace == "not-mine" {
			perNamespace++
		}
	}
	assert.Equal(t, actionReviews, perNamespace)
}

func TestNamespacePermissionMatrix_CoversEveryActionReview(t *testing.T) {
	verbs := map[string]int{}
	for _, c := range NamespacePermissionMatrix {
		for _, v := range c.Verbs {
			verbs[PermissionKey(c.Group, c.Resource)+"|"+v]++
		}
	}
	assert.Len(t, verbs, 15)
	for k, n := range verbs {
		assert.Equal(t, 1, n, k)
	}
}

func TestDiscover_RequestedNamesSurviveTruncation(t *testing.T) {
	configured := []string{}
	for i := 0; i < MaxDiscoveryCandidates+10; i++ {
		configured = append(configured, "aa-"+itoa(i))
	}
	allow := map[string]bool{}
	viewer(allow, "zz-mine")
	client := &rbacClient{allow: allow, namespaces: map[string]*corev1.Namespace{"zz-mine": activeNS("zz-mine", "")}}
	repo := NewNamespaceAccessRepository(configured, "", nil, "opendatahub")

	list, err := repo.Discover(context.Background(), client, identity(), []string{"zz-mine"})
	require.NoError(t, err)
	assert.Equal(t, []string{"zz-mine"}, names(list))
	assert.Contains(t, list.Issues, models.NamespaceDiscoveryIssue{Code: models.IssueCandidatesTruncated, Count: 11})
}

// blockingClient never answers until the request context ends.
type blockingClient struct{ rbacClient }

func (c *blockingClient) ReviewAccess(ctx context.Context, _ *k8s.RequestIdentity, _ k8s.AccessReviewAttributes) (k8s.AccessReviewResult, error) {
	<-ctx.Done()
	return k8s.AccessReviewDenied, ctx.Err()
}

func TestDiscover_DeadlineFailsClosedAndIsReported(t *testing.T) {
	repo := NewNamespaceAccessRepository([]string{"team-a"}, "", nil, "opendatahub")
	repo.timeout = 50 * time.Millisecond

	list, err := repo.Discover(context.Background(), &blockingClient{}, identity(), nil)
	require.ErrorIs(t, err, ErrNamespaceDiscoveryUnavailable)
	assert.Empty(t, list.Namespaces)
	assert.Contains(t, list.Issues, models.NamespaceDiscoveryIssue{Code: models.IssueDiscoveryDeadlineExceeded, Count: 1})

	_, err = repo.Get(context.Background(), &blockingClient{}, identity(), "team-a")
	assert.ErrorIs(t, err, ErrNamespaceAccessReviewFailed)
}
