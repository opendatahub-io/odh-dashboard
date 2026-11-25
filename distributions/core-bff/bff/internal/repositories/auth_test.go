package repositories

import (
	"context"
	"testing"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	fakediscovery "k8s.io/client-go/discovery/fake"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8stesting "k8s.io/client-go/testing"
)

func TestGetAuth_ErrorClassification(t *testing.T) {
	// 404 (NotFound) means the CRD exists but the "auth" instance is missing.
	// This should NOT be treated as CRD absent - it should return an error
	// so resolveIsAllowed falls through to SSAR instead of granting access.
	notFound := k8serrors.NewNotFound(schema.GroupResource{Group: "services.platform.opendatahub.io", Resource: "auths"}, "auth")
	assert.True(t, k8serrors.IsNotFound(notFound))
	assert.False(t, k8sutil.IsDiscoveryError(notFound))

	// 403 (Forbidden) should NOT be treated as CRD absent
	forbidden := k8serrors.NewForbidden(schema.GroupResource{Group: "services.platform.opendatahub.io", Resource: "auths"}, "auth", nil)
	assert.True(t, k8serrors.IsForbidden(forbidden))
	assert.False(t, k8sutil.IsDiscoveryError(forbidden))
}

func TestGetAuth_ParsesAuthConfig(t *testing.T) {
	spec := map[string]any{
		"adminGroups":   []any{"admin-group-1", "admin-group-2"},
		"allowedGroups": []any{models.SystemAuthenticated, "allowed-group"},
	}

	auth := &AuthConfig{}
	if groups, ok := spec["adminGroups"].([]any); ok {
		for _, g := range groups {
			if s, ok := g.(string); ok {
				auth.AdminGroups = append(auth.AdminGroups, s)
			}
		}
	}
	if groups, ok := spec["allowedGroups"].([]any); ok {
		for _, g := range groups {
			if s, ok := g.(string); ok {
				auth.AllowedGroups = append(auth.AllowedGroups, s)
			}
		}
	}

	assert.Equal(t, []string{"admin-group-1", "admin-group-2"}, auth.AdminGroups)
	assert.Equal(t, []string{models.SystemAuthenticated, "allowed-group"}, auth.AllowedGroups)
}

func TestGetAuth_EmptySpec(t *testing.T) {
	spec := map[string]any{}

	auth := &AuthConfig{}
	if groups, ok := spec["adminGroups"].([]any); ok {
		for _, g := range groups {
			if s, ok := g.(string); ok {
				auth.AdminGroups = append(auth.AdminGroups, s)
			}
		}
	}

	assert.Nil(t, auth.AdminGroups)
	assert.Nil(t, auth.AllowedGroups)
}

// The bootstrap contract gives each Auth failure mode its own behaviour, so
// Lookup must tell them apart rather than collapsing them into one error.
func TestAuthLookup_ClassifiesEachFailureMode(t *testing.T) {
	authGR := schema.GroupResource{Group: "services.platform.opendatahub.io", Resource: "auths"}

	cases := []struct {
		name         string
		err          error
		availability AuthAvailability
		wantMessage  string
	}{
		{
			name:         "CRD not installed",
			err:          &meta.NoKindMatchError{GroupKind: schema.GroupKind{Group: authGR.Group, Kind: "Auth"}, SearchedVersions: []string{"v1alpha1"}},
			availability: AuthCRDAbsent,
		},
		{
			name:         "singleton not provisioned",
			err:          k8serrors.NewNotFound(authGR, "auth"),
			availability: AuthInstanceMissing,
			wantMessage:  "auth instance not found",
		},
		{
			name:         "service account may not read it",
			err:          k8serrors.NewForbidden(authGR, "auth", nil),
			availability: AuthForbidden,
			wantMessage:  "forbidden reading auth config",
		},
		{
			name:         "method not supported is ambiguous, not CRD absence",
			err:          k8serrors.NewMethodNotSupported(authGR, "get"),
			availability: AuthUnavailable,
			wantMessage:  "auth read returned method not supported",
		},
		{
			name:         "upstream failure",
			err:          k8serrors.NewInternalError(assert.AnError),
			availability: AuthUnavailable,
			wantMessage:  "failed to get auth config",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := NewAuthRepository(newFakeDynClientFailingWith(tc.err), emptyDiscovery())

			lookup := repo.Lookup(context.Background())

			assert.Equal(t, tc.availability, lookup.Availability)
			assert.Nil(t, lookup.Config)
			if tc.wantMessage == "" {
				assert.NoError(t, lookup.Err)
			} else {
				require.Error(t, lookup.Err)
				assert.Contains(t, lookup.Err.Error(), tc.wantMessage)
				assert.ErrorIs(t, lookup.Err, tc.err)
			}
		})
	}
}

func TestAuthLookup_AvailableReturnsGroups(t *testing.T) {
	repo := NewAuthRepository(newFakeDynClientWithAuth([]string{models.SystemAuthenticated, "allowed-group"}), emptyDiscovery())

	lookup := repo.Lookup(context.Background())

	require.NoError(t, lookup.Err)
	assert.Equal(t, AuthAvailable, lookup.Availability)
	require.NotNil(t, lookup.Config)
	assert.Equal(t, []string{"odh-admins"}, lookup.Config.AdminGroups)
	assert.Equal(t, []string{models.SystemAuthenticated, "allowed-group"}, lookup.Config.AllowedGroups)
}

// GetAuth keeps its existing contract for callers that only need the config.
func TestGetAuth_PreservesExistingContract(t *testing.T) {
	t.Run("CRD absent returns nil without error", func(t *testing.T) {
		cfg, err := NewAuthRepository(newFakeDynClientCRDAbsent(), emptyDiscovery()).GetAuth(context.Background())
		assert.NoError(t, err)
		assert.Nil(t, cfg)
	})

	t.Run("instance missing returns an error", func(t *testing.T) {
		notFound := k8serrors.NewNotFound(schema.GroupResource{Group: "services.platform.opendatahub.io", Resource: "auths"}, "auth")
		cfg, err := NewAuthRepository(newFakeDynClientFailingWith(notFound), emptyDiscovery()).GetAuth(context.Background())
		assert.Error(t, err)
		assert.Nil(t, cfg)
	})
}

func newFakeDynClientFailingWith(err error) *dynamicfake.FakeDynamicClient {
	client := dynamicfake.NewSimpleDynamicClient(runtime.NewScheme())
	client.PrependReactor("get", "auths", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, err
	})
	return client
}

// A bare 404 on the Auth read looks like a missing CRD, but an intermediary can
// return it while the CRD is installed. CRD absence admits without a review, so
// it needs discovery's confirmation; otherwise admission takes the review path.
func TestLookup_BareNotFoundNeedsDiscoveryToConfirmAbsence(t *testing.T) {
	bare404 := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Status: metav1.StatusFailure, Code: 404, Reason: metav1.StatusReasonNotFound,
	}}

	lookup := NewAuthRepository(newFakeDynClientFailingWith(bare404), emptyDiscovery()).Lookup(context.Background())
	assert.Equal(t, AuthCRDAbsent, lookup.Availability, "discovery confirms the CRD is not served")

	for name, disc := range map[string]discovery.DiscoveryInterface{
		"discovery serves the CRD": servesAuth(),
		"no discovery client":      nil,
	} {
		t.Run(name, func(t *testing.T) {
			lookup := NewAuthRepository(newFakeDynClientFailingWith(bare404), disc).Lookup(context.Background())
			assert.Equal(t, AuthUnavailable, lookup.Availability)
			assert.ErrorIs(t, lookup.Err, k8sutil.ErrAbsenceUnconfirmed)

			client := &mockUserAllowedClient{allowed: false}
			got := admit(client, NewAuthRepository(newFakeDynClientFailingWith(bare404), disc), config.AdmissionModeAuthResource, false)
			assert.False(t, got.Admitted, "the caller's own review decides")
			assert.Equal(t, 1, client.calls)
		})
	}
}

// A confirmed absence is reused briefly, so admission does not run discovery
// on every request; a CRD installed later is seen once the window passes.
func TestLookup_ConfirmedAbsenceIsCachedBriefly(t *testing.T) {
	bare404 := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Status: metav1.StatusFailure, Code: 404, Reason: metav1.StatusReasonNotFound,
	}}
	disc := &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{Resources: []*metav1.APIResourceList{coreGroup()}}}
	repo := NewAuthRepository(newFakeDynClientFailingWith(bare404), disc)
	now := time.Unix(1000, 0)
	repo.now = func() time.Time { return now }

	assert.Equal(t, AuthCRDAbsent, repo.Lookup(context.Background()).Availability)
	calls := len(disc.Actions())
	require.NotZero(t, calls)
	assert.Equal(t, AuthCRDAbsent, repo.Lookup(context.Background()).Availability)
	assert.Len(t, disc.Actions(), calls, "a recent confirmation is reused")

	// The CRD is installed afterwards: once the window passes, discovery is
	// asked again and the bare 404 is no longer accepted as absence.
	disc.Resources = []*metav1.APIResourceList{coreGroup(), {
		GroupVersion: models.AuthGVR.GroupVersion().String(),
		APIResources: []metav1.APIResource{{Name: models.AuthGVR.Resource, Kind: "Auth"}},
	}}
	now = now.Add(absenceCacheTTL + time.Second)
	assert.Equal(t, AuthUnavailable, repo.Lookup(context.Background()).Availability)
}

// Review 6060889411: an incomplete discovery entry is not evidence that the
// Auth CRD is absent, so admission keeps the caller's access review.
func TestLookup_IncompleteDiscoveryEntryKeepsTheReview(t *testing.T) {
	bare404 := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Status: metav1.StatusFailure, Code: 404, Reason: metav1.StatusReasonNotFound,
	}}
	for name, entry := range map[string]metav1.APIResource{
		"resource without a name": {Kind: "Auth"},
		"resource without a kind": {Name: "auths"},
	} {
		t.Run(name, func(t *testing.T) {
			disc := &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{Resources: []*metav1.APIResourceList{coreGroup(), {
				GroupVersion: models.AuthGVR.GroupVersion().String(),
				APIResources: []metav1.APIResource{entry},
			}}}}
			lookup := NewAuthRepository(newFakeDynClientFailingWith(bare404), disc).Lookup(context.Background())
			assert.Equal(t, AuthUnavailable, lookup.Availability)
			assert.ErrorIs(t, lookup.Err, k8sutil.ErrAbsenceUnconfirmed)

			client := &mockUserAllowedClient{allowed: false}
			got := admit(client, NewAuthRepository(newFakeDynClientFailingWith(bare404), disc), config.AdmissionModeAuthResource, false)
			assert.False(t, got.Admitted)
			assert.Equal(t, 1, client.calls, "the caller's own review decides")
		})
	}
}

// Fresh review: an Auth CRD that serves only another version (v1alpha1 set to
// served: false during an upgrade) gives a bare 404 on the v1alpha1 read. The
// CRD is installed, so admission must keep the caller's review.
func TestLookup_AuthServedAtAnotherVersionKeepsTheReview(t *testing.T) {
	bare404 := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Status: metav1.StatusFailure, Code: 404, Reason: metav1.StatusReasonNotFound,
	}}
	disc := &fakediscovery.FakeDiscovery{Fake: &k8stesting.Fake{Resources: []*metav1.APIResourceList{coreGroup(), {
		GroupVersion: models.AuthGVR.Group + "/v1",
		APIResources: []metav1.APIResource{{Name: models.AuthGVR.Resource, Kind: "Auth"}},
	}}}}
	lookup := NewAuthRepository(newFakeDynClientFailingWith(bare404), disc).Lookup(context.Background())
	assert.Equal(t, AuthUnavailable, lookup.Availability)
	assert.ErrorIs(t, lookup.Err, k8sutil.ErrAbsenceUnconfirmed)

	client := &mockUserAllowedClient{allowed: false}
	got := admit(client, NewAuthRepository(newFakeDynClientFailingWith(bare404), disc), config.AdmissionModeAuthResource, false)
	assert.False(t, got.Admitted)
	assert.Equal(t, 1, client.calls, "the caller's own review decides")
}
