package repositories

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// TestMergeManagedTokenKeysOnly_preservesCLIKeys ensures we do not wipe unrelated spec.limits entries when syncing token limits.
func TestMergeManagedTokenKeysOnly_preservesCLIKeys(t *testing.T) {
	t.Parallel()
	existing := map[string]interface{}{
		"operator-custom-limit": map[string]interface{}{"rates": []interface{}{map[string]interface{}{"limit": int64(1), "window": "1s"}}},
		"tier0-tokens":          map[string]interface{}{"stale": true},
	}
	limits := map[string]models.TierLimits{
		"tier0": {TokensPerUnit: []models.RateLimit{{Count: 42, Time: 2, Unit: models.GEP_2257_HOUR}}},
	}
	out := mergeManagedTokenKeysOnly(existing, []string{"tier0"}, limits, "maas-default-gateway")
	if _, ok := out["operator-custom-limit"]; !ok {
		t.Fatal("expected CLI / operator limit key to be preserved")
	}
	tok := out["tier0-tokens"]
	m, ok := tok.(map[string]interface{})
	if !ok {
		t.Fatalf("expected tier0-tokens to be a map, got %T", tok)
	}
	if _, has := m["stale"]; has {
		t.Fatal("expected stale tier0-tokens entry to be replaced by dashboard-managed shape")
	}
}

// TestMergeManagedRequestKeysOnly_removesEmptyRequestTier verifies clearing request limits deletes only the managed request key.
// TestBuildManagedTokenLimitEntry_unstructuredSetDoesNotPanic guards against []map[string]interface{}
// in rates/when/counters, which causes runtime.DeepCopyJSONValue to panic inside SetNestedMap.
func TestBuildManagedTokenLimitEntry_unstructuredSetDoesNotPanic(t *testing.T) {
	t.Parallel()
	obj := &unstructured.Unstructured{Object: map[string]interface{}{}}
	limits := map[string]interface{}{
		"tier-x-tokens": buildManagedTokenLimitEntry("tier-x", "gw", []models.RateLimit{
			{Count: 10, Time: 1, Unit: models.GEP_2257_HOUR},
		}),
	}
	spec := map[string]interface{}{
		"limits": limits,
	}
	if err := unstructured.SetNestedMap(obj.Object, spec, "spec"); err != nil {
		t.Fatal(err)
	}
}

func TestMergeManagedRequestKeysOnly_removesEmptyRequestTier(t *testing.T) {
	t.Parallel()
	existing := map[string]interface{}{
		"tier0-requests": map[string]interface{}{"rates": []interface{}{map[string]interface{}{"limit": int64(5), "window": "1m"}}},
	}
	limits := map[string]models.TierLimits{
		"tier0": {RequestsPerUnit: nil},
	}
	out := mergeManagedRequestKeysOnly(existing, []string{"tier0"}, limits, "gw")
	if _, ok := out["tier0-requests"]; ok {
		t.Fatal("expected tier0-requests to be removed when RequestsPerUnit is empty")
	}
}
