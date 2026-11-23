package repositories

import (
	"context"
	"errors"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

// RHOAIENG-101218: under the caller policy every user-initiated operation runs
// with the caller's clients; a missing or failing caller credential never falls
// back to the service account; a denied caller stays denied even when the
// service account could have done it.

const credNS = "rhaii"

// clientPair is one identity's typed and dynamic fakes.
type clientPair struct {
	typed *fake.Clientset
	dyn   *dynamicfake.FakeDynamicClient
}

func newClientPair(objs ...runtime.Object) clientPair {
	scheme := runtime.NewScheme()
	return clientPair{
		typed: fake.NewSimpleClientset(objs...),
		dyn: dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme, map[schema.GroupVersionResource]string{
			models.ServingRuntimeGVR:  "ServingRuntimeList",
			models.DashboardConfigGVR: "OdhDashboardConfigList",
			models.OdhApplicationGVR:  "OdhApplicationList",
		}, dashboardConfigObject()),
	}
}

func (p clientPair) actions() int {
	return len(p.typed.Actions()) + len(p.dyn.Actions())
}

func dashboardConfigObject() *unstructured.Unstructured {
	u := &unstructured.Unstructured{}
	u.SetGroupVersionKind(models.DashboardConfigGVR.GroupVersion().WithKind("OdhDashboardConfig"))
	u.SetNamespace(credNS)
	u.SetName("odh-dashboard-config")
	return u
}

func connectionTypeCM(name string) *corev1.ConfigMap {
	return &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: name, Namespace: credNS,
		Labels: map[string]string{models.LabelDashboardResource: "true", models.LabelConnectionType: "true"},
	}}
}

func callerFrom(p clientPair) CallerClientsFunc {
	return func(context.Context) (kubernetes.Interface, dynamic.Interface, error) {
		return p.typed, p.dyn, nil
	}
}

var errNoCaller = errors.New("no caller credential")

func failingCaller(context.Context) (kubernetes.Interface, dynamic.Interface, error) {
	return nil, nil, errNoCaller
}

func reposWith(sa clientPair, policy CredentialPolicy, caller CallerClientsFunc) *Repositories {
	return NewRepositories(RepositoriesConfig{
		Platform:         config.PlatformXKS,
		SADynClient:      sa.dyn,
		SAClientset:      sa.typed,
		CredentialPolicy: policy,
		CallerClients:    caller,
		Namespace:        credNS,
	})
}

// userInitiated lists every repository operation that follows the policy.
var userInitiated = []struct {
	name string
	run  func(context.Context, *Repositories) error
}{
	{"namespace mutation", func(ctx context.Context, r *Repositories) error {
		return r.NamespaceMutation.ApplyMutation(ctx, credNS, models.KServePromotion, false)
	}},
	{"namespace mutation dry-run", func(ctx context.Context, r *Repositories) error {
		return r.NamespaceMutation.ApplyMutation(ctx, credNS, models.KServePromotion, true)
	}},
	{"serving runtime create", func(ctx context.Context, r *Repositories) error {
		obj := &unstructured.Unstructured{}
		obj.SetGroupVersionKind(models.ServingRuntimeGVR.GroupVersion().WithKind("ServingRuntime"))
		obj.SetName("rt")
		_, err := r.ServingRuntime.Create(ctx, credNS, obj, "")
		return err
	}},
	{"serving runtime create dry-run", func(ctx context.Context, r *Repositories) error {
		obj := &unstructured.Unstructured{}
		obj.SetGroupVersionKind(models.ServingRuntimeGVR.GroupVersion().WithKind("ServingRuntime"))
		obj.SetName("rt")
		_, err := r.ServingRuntime.Create(ctx, credNS, obj, metav1.DryRunAll)
		return err
	}},
	{"connection type create", func(ctx context.Context, r *Repositories) error {
		return mutationErr(r.ConnectionType.Create(ctx, credNS, connectionTypeCM("new")))
	}},
	{"connection type update", func(ctx context.Context, r *Repositories) error {
		return mutationErr(r.ConnectionType.Update(ctx, credNS, "s3", connectionTypeCM("s3")))
	}},
	{"connection type patch", func(ctx context.Context, r *Repositories) error {
		return mutationErr(r.ConnectionType.Patch(ctx, credNS, "s3", []byte(`[{"op":"add","path":"/data","value":{}}]`)))
	}},
	{"connection type delete", func(ctx context.Context, r *Repositories) error {
		return mutationErr(r.ConnectionType.Delete(ctx, credNS, "s3"))
	}},
	{"component remove", func(ctx context.Context, r *Repositories) error {
		return mutationErr(r.Components.RemoveComponent(ctx, credNS, "app", "enabled-apps"))
	}},
	{"cluster settings read", func(ctx context.Context, r *Repositories) error {
		_, err := r.ClusterSettings.GetClusterSettings(ctx, credNS, nil)
		return err
	}},
	{"cluster settings update", func(ctx context.Context, r *Repositories) error {
		s := models.DefaultClusterSettings
		// The access review is covered by the PlanUpdate tests; here the plan's
		// reads and the writes must use the policy's clients.
		cs, err := r.ClusterSettings.clients.typed(ctx)
		if err != nil {
			return err
		}
		plan, err := r.ClusterSettings.buildPlan(ctx, cs, credNS, "odh-dashboard-config", &s, nil)
		if err != nil {
			return err
		}
		return r.ClusterSettings.UpdateConfigMaps(ctx, credNS, plan)
	}},
	{"dashboard config admin read", func(ctx context.Context, r *Repositories) error {
		_, err := r.DashboardConfig.GetRawDashboardConfig(ctx, credNS, "odh-dashboard-config")
		return err
	}},
	{"dashboard config patch", func(ctx context.Context, r *Repositories) error {
		_, err := r.DashboardConfig.PatchRawDashboardConfig(ctx, credNS, "odh-dashboard-config", []byte(`{"spec":{}}`), types.MergePatchType)
		return err
	}},
}

func mutationErr(resp *models.MutationResponse, err error) error {
	if err != nil {
		return err
	}
	if resp != nil && !resp.Success {
		return errors.New(resp.Error)
	}
	return nil
}

func seededPair() clientPair {
	return newClientPair(
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: credNS}},
		connectionTypeCM("s3"),
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "enabled-apps", Namespace: credNS}, Data: map[string]string{"app": "true"}},
	)
}

func TestCredentialPolicyFor(t *testing.T) {
	assert.Equal(t, CredentialPolicyCaller, CredentialPolicyFor(config.PlatformXKS))
	assert.Equal(t, CredentialPolicyServiceAccount, CredentialPolicyFor(config.PlatformOpenShift))
	assert.Equal(t, CredentialPolicyServiceAccount, CredentialPolicyFor(""))
}

func TestCallerPolicy_UsesCallerClientsNotServiceAccount(t *testing.T) {
	for _, op := range userInitiated {
		t.Run(op.name, func(t *testing.T) {
			sa, caller := seededPair(), seededPair()
			repos := reposWith(sa, CredentialPolicyCaller, callerFrom(caller))

			require.NoError(t, op.run(context.Background(), repos))
			assert.Positive(t, caller.actions(), "the caller's clients performed the operation")
			assert.Zero(t, sa.actions(), "the service account must not be touched")
		})
	}
}

func TestCallerPolicy_NoServiceAccountFallback(t *testing.T) {
	resolvers := []struct {
		name   string
		caller CallerClientsFunc
	}{
		{"caller credential missing", failingCaller},
		{"no resolver configured", nil},
		{"resolver returns nil clients", func(context.Context) (kubernetes.Interface, dynamic.Interface, error) { return nil, nil, nil }},
	}
	for _, res := range resolvers {
		for _, op := range userInitiated {
			t.Run(res.name+"/"+op.name, func(t *testing.T) {
				sa := seededPair()
				repos := reposWith(sa, CredentialPolicyCaller, res.caller)

				err := op.run(context.Background(), repos)
				require.Error(t, err)
				assert.ErrorIs(t, err, ErrCallerClientsUnavailable)
				assert.Zero(t, sa.actions(), "a missing caller credential must never fall back to the service account")
			})
		}
	}
}

// The fixture's service account could perform every operation; the caller is
// forbidden. The caller must stay forbidden.
func TestCallerPolicy_DeniedCallerStaysDeniedWhenServiceAccountIsPrivileged(t *testing.T) {
	for _, op := range userInitiated {
		t.Run(op.name, func(t *testing.T) {
			sa, caller := seededPair(), seededPair()
			forbid := func(action k8stesting.Action) (bool, runtime.Object, error) {
				return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: action.GetResource().Resource}, "", errors.New("caller lacks RBAC"))
			}
			caller.typed.PrependReactor("*", "*", forbid)
			caller.dyn.PrependReactor("*", "*", forbid)
			repos := reposWith(sa, CredentialPolicyCaller, callerFrom(caller))

			err := op.run(context.Background(), repos)
			require.Error(t, err)
			// The denial must surface as the API server's Forbidden, not be
			// folded into a 200 {success:false}, so the handler answers 403.
			assert.True(t, k8serrors.IsForbidden(err), "want a Forbidden status error, got %v", err)
			assert.Zero(t, sa.actions())
		})
	}
}

// OpenShift keeps the privileged-watcher model: the service account performs
// the operation and the caller resolver is never consulted.
func TestServiceAccountPolicy_Unchanged(t *testing.T) {
	for _, op := range userInitiated {
		t.Run(op.name, func(t *testing.T) {
			sa := seededPair()
			consulted := false
			repos := NewRepositories(RepositoriesConfig{
				Platform:    config.PlatformOpenShift,
				SADynClient: sa.dyn,
				SAClientset: sa.typed,
				CallerClients: func(context.Context) (kubernetes.Interface, dynamic.Interface, error) {
					consulted = true
					return nil, nil, errNoCaller
				},
				Namespace: credNS,
			})

			require.NoError(t, op.run(context.Background(), repos))
			assert.Positive(t, sa.actions())
			assert.False(t, consulted)
		})
	}
}

// The platform alone selects the policy when none is configured explicitly.
func TestNewRepositories_XKSDefaultsToCallerPolicy(t *testing.T) {
	sa, caller := seededPair(), seededPair()
	repos := NewRepositories(RepositoriesConfig{
		Platform:      config.PlatformXKS,
		SADynClient:   sa.dyn,
		SAClientset:   sa.typed,
		CallerClients: callerFrom(caller),
		Namespace:     credNS,
	})
	require.NoError(t, repos.NamespaceMutation.ApplyMutation(context.Background(), credNS, models.KServePromotion, false))
	assert.Zero(t, sa.actions())
	assert.Positive(t, caller.actions())
}

// The documented service-account reads stay on the service account under the
// caller policy, so a non-admin still bootstraps (docs/bootstrap-contract.md).
func TestCallerPolicy_DocumentedServiceAccountReadsStay(t *testing.T) {
	sa := seededPair()
	repos := reposWith(sa, CredentialPolicyCaller, failingCaller)

	_, err := repos.ConnectionType.List(context.Background(), credNS)
	require.NoError(t, err)
	_, err = repos.ConnectionType.Get(context.Background(), credNS, "s3")
	require.NoError(t, err)
	_, err = repos.Components.ListComponents(context.Background(), credNS, false)
	require.NoError(t, err)
	assert.Positive(t, sa.actions())
}
