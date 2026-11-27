package repositories

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

// RHAI-50760: native gateway discovery for xKS, matching model-serving-api.

var gatewayListKinds = map[schema.GroupVersionResource]string{models.GatewayGVR: "GatewayList"}

func newGatewayDyn(objs ...*unstructured.Unstructured) *dynamicfake.FakeDynamicClient {
	dyn := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), gatewayListKinds)
	for _, obj := range objs {
		if _, err := dyn.Resource(models.GatewayGVR).Namespace(obj.GetNamespace()).Create(context.Background(), obj, metav1.CreateOptions{}); err != nil {
			panic(err)
		}
	}
	return dyn
}

func testGateway(namespace, name string, listeners []any, conditions []any, annotations map[string]any) *unstructured.Unstructured {
	metadata := map[string]any{"name": name, "namespace": namespace}
	if annotations != nil {
		metadata["annotations"] = annotations
	}
	obj := map[string]any{
		"apiVersion": "gateway.networking.k8s.io/v1",
		"kind":       "Gateway",
		"metadata":   metadata,
		"spec":       map[string]any{"listeners": listeners},
	}
	if conditions != nil {
		obj["status"] = map[string]any{"conditions": conditions}
	}
	return &unstructured.Unstructured{Object: obj}
}

func testListener(name string, namespaces map[string]any) map[string]any {
	l := map[string]any{"name": name}
	if namespaces != nil {
		l["allowedRoutes"] = map[string]any{"namespaces": namespaces}
	}
	return l
}

func cond(t, s string) map[string]any { return map[string]any{"type": t, "status": s} }

// callerRepo returns a repository on the caller policy whose service-account
// clients fail every call, so any service-account use fails the test.
func callerRepo(t *testing.T, typed kubernetes.Interface, dyn dynamic.Interface) *GatewayDiscoveryRepository {
	t.Helper()
	saDyn := newGatewayDyn()
	saDyn.PrependReactor("*", "*", func(a k8stesting.Action) (bool, runtime.Object, error) {
		t.Errorf("service-account dynamic client used: %s %s", a.GetVerb(), a.GetResource().Resource)
		return true, nil, errors.New("service account must not be used")
	})
	saTyped := fake.NewSimpleClientset()
	saTyped.PrependReactor("*", "*", func(a k8stesting.Action) (bool, runtime.Object, error) {
		t.Errorf("service-account typed client used: %s %s", a.GetVerb(), a.GetResource().Resource)
		return true, nil, errors.New("service account must not be used")
	})
	return &GatewayDiscoveryRepository{clients: clientSource{
		policy:  CredentialPolicyCaller,
		saTyped: saTyped,
		saDyn:   saDyn,
		caller: func(context.Context) (kubernetes.Interface, dynamic.Interface, error) {
			return typed, dyn, nil
		},
	}}
}

func namespaceWithLabels(name string, labels map[string]string) *corev1.Namespace {
	return &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: name, Labels: labels}}
}

func TestGatewayDiscovery_ListenerAdmission(t *testing.T) {
	selector := func(labels map[string]any) map[string]any {
		return map[string]any{"from": "Selector", "selector": map[string]any{"matchLabels": labels}}
	}
	dyn := newGatewayDyn(
		testGateway("gw-ns", "gw", []any{
			testListener("all", map[string]any{"from": "All"}),
			testListener("same", map[string]any{"from": "Same"}),
			testListener("unset", nil),
			testListener("namespaces-unset", map[string]any{}),
			testListener("selector-match", selector(map[string]any{"team": "a"})),
			testListener("selector-miss", selector(map[string]any{"team": "b"})),
			testListener("selector-nil", map[string]any{"from": "Selector"}),
			testListener("selector-invalid", map[string]any{"from": "Selector", "selector": map[string]any{
				"matchExpressions": []any{map[string]any{"key": "team", "operator": "Bogus"}},
			}}),
			testListener("unknown-from", map[string]any{"from": "Elsewhere"}),
		}, nil, nil),
		testGateway("project", "local", []any{
			testListener("same", map[string]any{"from": "Same"}),
			testListener("unset", nil),
		}, nil, nil),
	)
	typed := fake.NewSimpleClientset(namespaceWithLabels("project", map[string]string{"team": "a"}))

	refs, err := callerRepo(t, typed, dyn).Discover(context.Background(), "project")
	require.NoError(t, err)

	var got []string
	for _, r := range refs {
		got = append(got, r.Namespace+"/"+r.Name+"/"+r.Listener)
	}
	assert.Equal(t, []string{"gw-ns/gw/all", "gw-ns/gw/selector-match", "project/local/same", "project/local/unset"}, got)
}

func TestGatewayDiscovery_Status(t *testing.T) {
	tests := []struct {
		name       string
		conditions []any
		want       string
	}{
		{"accepted and programmed", []any{cond("Accepted", "True"), cond("Programmed", "True")}, models.GatewayStatusReady},
		{"not accepted", []any{cond("Accepted", "False"), cond("Programmed", "True")}, models.GatewayStatusNotReady},
		{"not programmed", []any{cond("Accepted", "True"), cond("Programmed", "False")}, models.GatewayStatusNotReady},
		{"programmed unknown", []any{cond("Accepted", "True"), cond("Programmed", "Unknown")}, models.GatewayStatusUnknown},
		{"accepted only", []any{cond("Accepted", "True")}, models.GatewayStatusUnknown},
		{"no status", nil, models.GatewayStatusUnknown},
		{"unparsable timestamp", []any{
			map[string]any{"type": "Accepted", "status": "True", "lastTransitionTime": "not-a-time"},
			cond("Programmed", "True"),
		}, models.GatewayStatusReady},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{testListener("http", map[string]any{"from": "All"})}, tt.conditions, nil))
			refs, err := callerRepo(t, fake.NewSimpleClientset(), dyn).Discover(context.Background(), "project")
			require.NoError(t, err)
			require.Len(t, refs, 1)
			assert.Equal(t, tt.want, refs[0].Status)
		})
	}
}

func TestGatewayDiscovery_Annotations(t *testing.T) {
	dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{testListener("http", map[string]any{"from": "All"})}, nil,
		map[string]any{models.GatewayAnnotationDisplayName: "Shared", models.GatewayAnnotationDescription: "For everyone"}))
	refs, err := callerRepo(t, fake.NewSimpleClientset(), dyn).Discover(context.Background(), "project")
	require.NoError(t, err)
	assert.Equal(t, []models.GatewayRef{{
		Name: "gw", Namespace: "gw-ns", Listener: "http", Status: models.GatewayStatusUnknown,
		DisplayName: "Shared", Description: "For everyone",
	}}, refs)
}

// The namespace is read only when a listener needs its labels.
func TestGatewayDiscovery_ReadsTheNamespaceOnlyForSelectors(t *testing.T) {
	dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{testListener("http", map[string]any{"from": "All"})}, nil, nil))
	typed := fake.NewSimpleClientset()
	_, err := callerRepo(t, typed, dyn).Discover(context.Background(), "project")
	require.NoError(t, err)
	assert.Empty(t, typed.Actions(), "no listener selects by label, so the namespace must not be read")
}

// A caller who cannot read the namespace sees the listeners that do not
// depend on its labels; selector listeners are left out, never guessed.
func TestGatewayDiscovery_UnreadableNamespaceSkipsSelectorListeners(t *testing.T) {
	for name, nsErr := range map[string]error{
		"forbidden": k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "project", errors.New("denied")),
		"not found": k8serrors.NewNotFound(schema.GroupResource{Resource: "namespaces"}, "project"),
	} {
		t.Run(name, func(t *testing.T) {
			dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{
				testListener("all", map[string]any{"from": "All"}),
				testListener("selector-team", map[string]any{"from": "Selector", "selector": map[string]any{
					"matchLabels": map[string]any{"team": "a"},
				}}),
			}, nil, nil))
			typed := fake.NewSimpleClientset()
			typed.PrependReactor("get", "namespaces", func(k8stesting.Action) (bool, runtime.Object, error) {
				return true, nil, nsErr
			})
			refs, err := callerRepo(t, typed, dyn).Discover(context.Background(), "project")
			require.NoError(t, err)
			require.Len(t, refs, 1)
			assert.Equal(t, "all", refs[0].Listener)
		})
	}
}

// Without the namespace read, kubernetes.io/metadata.name is still known (the
// API server sets it to the name), so selectors that use only that label, or
// select everything, are still decided.
func TestGatewayDiscovery_UnreadableNamespaceStillDecidesNameSelectors(t *testing.T) {
	sel := func(selector map[string]any) map[string]any {
		return map[string]any{"from": "Selector", "selector": selector}
	}
	dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{
		testListener("everything", sel(map[string]any{})),
		testListener("name-match", sel(map[string]any{"matchLabels": map[string]any{corev1.LabelMetadataName: "project"}})),
		testListener("name-miss", sel(map[string]any{"matchLabels": map[string]any{corev1.LabelMetadataName: "other"}})),
		testListener("name-in", sel(map[string]any{"matchExpressions": []any{map[string]any{
			"key": corev1.LabelMetadataName, "operator": "In", "values": []any{"project", "x"},
		}}})),
		testListener("name-and-team", sel(map[string]any{"matchLabels": map[string]any{
			corev1.LabelMetadataName: "project", "team": "a",
		}})),
		testListener("nil-selector", map[string]any{"from": "Selector"}),
	}, nil, nil))
	typed := fake.NewSimpleClientset()
	typed.PrependReactor("get", "namespaces", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "project", errors.New("denied"))
	})
	refs, err := callerRepo(t, typed, dyn).Discover(context.Background(), "project")
	require.NoError(t, err)
	var got []string
	for _, r := range refs {
		got = append(got, r.Listener)
	}
	assert.Equal(t, []string{"everything", "name-match", "name-in"}, got)
}

// With a partial view (namespace unreadable), every operator on the name key is
// decided exactly as with the full labels, and anything else is skipped.
func TestGatewayDiscovery_PartialViewOperators(t *testing.T) {
	expr := func(key, op string, values ...any) map[string]any {
		e := map[string]any{"key": key, "operator": op}
		if values != nil {
			e["values"] = values
		}
		return e
	}
	tests := []struct {
		name     string
		selector map[string]any
		admitted bool
		skipped  bool
	}{
		{"name NotIn other", map[string]any{"matchExpressions": []any{expr(corev1.LabelMetadataName, "NotIn", "other")}}, true, false},
		{"name NotIn self", map[string]any{"matchExpressions": []any{expr(corev1.LabelMetadataName, "NotIn", "project")}}, false, false},
		{"name Exists", map[string]any{"matchExpressions": []any{expr(corev1.LabelMetadataName, "Exists")}}, true, false},
		{"name DoesNotExist", map[string]any{"matchExpressions": []any{expr(corev1.LabelMetadataName, "DoesNotExist")}}, false, false},
		{"name In plus team Exists", map[string]any{"matchExpressions": []any{
			expr(corev1.LabelMetadataName, "In", "project"), expr("team", "Exists"),
		}}, false, true},
		{"team DoesNotExist", map[string]any{"matchExpressions": []any{expr("team", "DoesNotExist")}}, false, true},
		{"unparsable", map[string]any{"matchExpressions": []any{expr("team", "Bogus")}}, false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{
				testListener("sel", map[string]any{"from": "Selector", "selector": tt.selector}),
				// Forces the namespace read, so every case runs on the partial view.
				testListener("team", map[string]any{"from": "Selector", "selector": map[string]any{"matchLabels": map[string]any{"team": "x"}}}),
			}, nil, nil))
			typed := fake.NewSimpleClientset()
			typed.PrependReactor("get", "namespaces", func(k8stesting.Action) (bool, runtime.Object, error) {
				return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "project", errors.New("denied"))
			})
			var buf bytes.Buffer
			ctx := context.WithValue(context.Background(), constants.TraceLoggerKey, slog.New(slog.NewTextHandler(&buf, nil)))
			refs, err := callerRepo(t, typed, dyn).Discover(ctx, "project")
			require.NoError(t, err)
			assert.Equal(t, tt.admitted, len(refs) == 1, "admitted")
			skipped := 1 // the "team" listener
			if tt.skipped {
				skipped++
			}
			assert.Contains(t, buf.String(), fmt.Sprintf("skippedListeners=%d", skipped))
		})
	}
}

// Selectors decidable from the name need no namespace read, so its failures
// cannot fail the request.
func TestGatewayDiscovery_NameOnlySelectorsNeedNoNamespaceRead(t *testing.T) {
	dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{
		testListener("everything", map[string]any{"from": "Selector", "selector": map[string]any{}}),
		testListener("name", map[string]any{"from": "Selector", "selector": map[string]any{"matchLabels": map[string]any{corev1.LabelMetadataName: "project"}}}),
		testListener("unparsable", map[string]any{"from": "Selector", "selector": map[string]any{"matchExpressions": []any{
			map[string]any{"key": "team", "operator": "Bogus"},
		}}}),
	}, nil, nil))
	typed := fake.NewSimpleClientset()
	typed.PrependReactor("get", "namespaces", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewTooManyRequests("slow down", 1)
	})
	refs, err := callerRepo(t, typed, dyn).Discover(context.Background(), "project")
	require.NoError(t, err)
	assert.Len(t, refs, 2)
	assert.Empty(t, typed.Actions())
}

// NotFound is "no Gateway API" only on the first page; later it means the API
// went away mid-list and must not read as "no gateways".
func TestGatewayDiscovery_NotFoundMidListIsAnError(t *testing.T) {
	dyn := pagedDyn{fn: func(_ context.Context, opts metav1.ListOptions) (*unstructured.UnstructuredList, error) {
		if opts.Continue == "" {
			list := &unstructured.UnstructuredList{}
			list.SetContinue("page-2")
			list.Items = []unstructured.Unstructured{*testGateway("gw-ns", "gw", []any{testListener("http", map[string]any{"from": "All"})}, nil, nil)}
			return list, nil
		}
		return nil, k8serrors.NewNotFound(schema.GroupResource{Group: "gateway.networking.k8s.io", Resource: "gateways"}, "")
	}}
	_, err := callerRepo(t, fake.NewSimpleClientset(), dyn).Discover(context.Background(), "project")
	require.Error(t, err)
	assert.True(t, k8serrors.IsNotFound(err))
}

// A Selector listener with no selector admits nothing and needs no read.
func TestGatewayDiscovery_NilSelectorNeedsNoNamespaceRead(t *testing.T) {
	dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{testListener("nil", map[string]any{"from": "Selector"})}, nil, nil))
	typed := fake.NewSimpleClientset()
	refs, err := callerRepo(t, typed, dyn).Discover(context.Background(), "project")
	require.NoError(t, err)
	assert.Empty(t, refs)
	assert.Empty(t, typed.Actions())
}

func TestGatewayDiscovery_NamespaceReadFailureIsAnError(t *testing.T) {
	dyn := newGatewayDyn(testGateway("gw-ns", "gw", []any{
		testListener("selector", map[string]any{"from": "Selector", "selector": map[string]any{"matchLabels": map[string]any{"team": "a"}}}),
	}, nil, nil))
	typed := fake.NewSimpleClientset()
	typed.PrependReactor("get", "namespaces", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewServiceUnavailable("apiserver down")
	})
	_, err := callerRepo(t, typed, dyn).Discover(context.Background(), "project")
	require.Error(t, err)
	assert.True(t, k8serrors.IsServiceUnavailable(err), "the API server's error must reach the handler: %v", err)
}

// A denied Gateway list is the API server's 403, not an empty list and not
// a retry with the service account.
func TestGatewayDiscovery_ForbiddenListIsReturned(t *testing.T) {
	dyn := newGatewayDyn()
	dyn.PrependReactor("list", "gateways", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(schema.GroupResource{Group: "gateway.networking.k8s.io", Resource: "gateways"}, "", errors.New("denied"))
	})
	_, err := callerRepo(t, fake.NewSimpleClientset(), dyn).Discover(context.Background(), "project")
	require.Error(t, err)
	assert.True(t, k8serrors.IsForbidden(err))
}

// Without the Gateway API there is nothing to attach to.
func TestGatewayDiscovery_MissingGatewayAPIIsEmpty(t *testing.T) {
	dyn := newGatewayDyn()
	dyn.PrependReactor("list", "gateways", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewNotFound(schema.GroupResource{Group: "gateway.networking.k8s.io", Resource: "gateways"}, "")
	})
	refs, err := callerRepo(t, fake.NewSimpleClientset(), dyn).Discover(context.Background(), "project")
	require.NoError(t, err)
	assert.NotNil(t, refs)
	assert.Empty(t, refs)
}

func TestGatewayDiscovery_EmptyIsNotNil(t *testing.T) {
	refs, err := callerRepo(t, fake.NewSimpleClientset(), newGatewayDyn()).Discover(context.Background(), "project")
	require.NoError(t, err)
	assert.NotNil(t, refs)
}

// pagedDyn serves Gateway lists through fn, with the ListOptions the
// repository sent (the client-go fake drops Limit and Continue).
type pagedDyn struct {
	dynamic.Interface
	fn func(context.Context, metav1.ListOptions) (*unstructured.UnstructuredList, error)
}

type pagedResource struct {
	dynamic.NamespaceableResourceInterface
	fn func(context.Context, metav1.ListOptions) (*unstructured.UnstructuredList, error)
}

func (p pagedDyn) Resource(schema.GroupVersionResource) dynamic.NamespaceableResourceInterface {
	return pagedResource{fn: p.fn}
}

func (p pagedResource) List(ctx context.Context, opts metav1.ListOptions) (*unstructured.UnstructuredList, error) {
	return p.fn(ctx, opts)
}

func TestGatewayDiscovery_FollowsContinueTokens(t *testing.T) {
	var continues []string
	dyn := pagedDyn{fn: func(_ context.Context, opts metav1.ListOptions) (*unstructured.UnstructuredList, error) {
		continues = append(continues, opts.Continue)
		assert.Equal(t, int64(gatewayListPageSize), opts.Limit)
		list := &unstructured.UnstructuredList{}
		next, name := "", "second"
		if opts.Continue == "" {
			next, name = "page-2", "first"
		}
		list.SetContinue(next)
		list.Items = []unstructured.Unstructured{*testGateway("gw-ns", name, []any{testListener("http", map[string]any{"from": "All"})}, nil, nil)}
		return list, nil
	}}
	refs, err := callerRepo(t, fake.NewSimpleClientset(), dyn).Discover(context.Background(), "project")
	require.NoError(t, err)
	assert.Equal(t, []string{"", "page-2"}, continues)
	require.Len(t, refs, 2)
	assert.Equal(t, "first", refs[0].Name)
	assert.Equal(t, "second", refs[1].Name)
}

func TestGatewayDiscovery_StopsAnEndlessList(t *testing.T) {
	calls := 0
	dyn := pagedDyn{fn: func(context.Context, metav1.ListOptions) (*unstructured.UnstructuredList, error) {
		calls++
		list := &unstructured.UnstructuredList{}
		list.SetContinue(fmt.Sprintf("page-%d", calls))
		return list, nil
	}}
	_, err := callerRepo(t, fake.NewSimpleClientset(), dyn).Discover(context.Background(), "project")
	require.Error(t, err)
	assert.Equal(t, gatewayListMaxPages, calls)
}

// Discovery is bounded like model-serving-api's, so a slow API server answers
// with a timeout instead of holding the wizard request open.
func TestGatewayDiscovery_HasADeadline(t *testing.T) {
	var remaining time.Duration
	dyn := pagedDyn{fn: func(ctx context.Context, _ metav1.ListOptions) (*unstructured.UnstructuredList, error) {
		deadline, ok := ctx.Deadline()
		require.True(t, ok, "the Gateway list must run under a deadline")
		remaining = time.Until(deadline)
		return &unstructured.UnstructuredList{}, nil
	}}
	_, err := callerRepo(t, fake.NewSimpleClientset(), dyn).Discover(context.Background(), "project")
	require.NoError(t, err)
	assert.LessOrEqual(t, remaining, GatewayDiscoveryTimeout)
	assert.Greater(t, remaining, GatewayDiscoveryTimeout-time.Second, "the budget must be the documented one, not a shorter one")
}

func TestGatewayDiscovery_LogsSkippedSelectorListeners(t *testing.T) {
	selectorGateway := func() *unstructured.Unstructured {
		return testGateway("gw-ns", "gw", []any{
			testListener("all", map[string]any{"from": "All"}),
			testListener("sel-1", map[string]any{"from": "Selector", "selector": map[string]any{"matchLabels": map[string]any{"team": "a"}}}),
			testListener("sel-2", map[string]any{"from": "Selector", "selector": map[string]any{"matchLabels": map[string]any{"team": "b"}}}),
			testListener("sel-name", map[string]any{"from": "Selector", "selector": map[string]any{}}),
		}, nil, nil)
	}
	discoverWithLog := func(t *testing.T, typed *fake.Clientset) string {
		t.Helper()
		var buf bytes.Buffer
		ctx := context.WithValue(context.Background(), constants.TraceLoggerKey, slog.New(slog.NewTextHandler(&buf, nil)))
		_, err := callerRepo(t, typed, newGatewayDyn(selectorGateway())).Discover(ctx, "project")
		require.NoError(t, err)
		return buf.String()
	}

	denied := fake.NewSimpleClientset()
	denied.PrependReactor("get", "namespaces", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "project", errors.New("denied"))
	})
	out := discoverWithLog(t, denied)
	assert.Contains(t, out, "level=WARN")
	assert.Contains(t, out, "namespace=project")
	assert.Contains(t, out, "code=NAMESPACE_FORBIDDEN")
	assert.Contains(t, out, "skippedListeners=2")
	assert.Contains(t, out, "the caller cannot read the namespace")

	gone := fake.NewSimpleClientset()
	gone.PrependReactor("get", "namespaces", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewNotFound(schema.GroupResource{Resource: "namespaces"}, "project")
	})
	out = discoverWithLog(t, gone)
	assert.Contains(t, out, "code=NAMESPACE_NOT_FOUND")
	assert.Contains(t, out, "the namespace does not exist")

	assert.Empty(t, discoverWithLog(t, fake.NewSimpleClientset(namespaceWithLabels("project", nil))),
		"a readable namespace skips nothing and logs nothing")
}

// Under the caller policy a missing caller credential fails the request; the
// service account is never a substitute (callerRepo fails on any SA call).
func TestGatewayDiscovery_NoCallerCredentialsNoServiceAccountFallback(t *testing.T) {
	repo := callerRepo(t, nil, nil)
	repo.clients.caller = func(context.Context) (kubernetes.Interface, dynamic.Interface, error) {
		return nil, nil, errors.New("no identity")
	}
	_, err := repo.Discover(context.Background(), "project")
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrCallerClientsUnavailable)
}

// The repository NewRepositories builds for xKS uses the caller policy.
func TestGatewayDiscovery_NewRepositoriesUsesCallerPolicyOnXKS(t *testing.T) {
	repos := NewRepositories(RepositoriesConfig{Platform: "XKS", PlatformConfirmed: true})
	assert.Equal(t, CredentialPolicyCaller, repos.GatewayDiscovery.clients.policy)
}
