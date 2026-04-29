package repositories

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func TestSortPoliciesCanonicalFirst(t *testing.T) {
	t.Parallel()
	a := unstructured.Unstructured{}
	a.SetName("alpha")
	b := unstructured.Unstructured{}
	b.SetName("beta")
	c := unstructured.Unstructured{}
	c.SetName("canonical")
	out := sortPoliciesCanonicalFirst([]unstructured.Unstructured{b, c, a}, "canonical")
	if len(out) != 3 || out[0].GetName() != "canonical" {
		t.Fatalf("expected canonical first, got %#v", namesOf(out))
	}
	if out[1].GetName() != "alpha" || out[2].GetName() != "beta" {
		t.Fatalf("expected alphabetical tail, got %#v", namesOf(out))
	}
}

func namesOf(items []unstructured.Unstructured) []string {
	s := make([]string, len(items))
	for i := range items {
		s[i] = items[i].GetName()
	}
	return s
}

func TestLimitBlockMentionsTierInPredicates(t *testing.T) {
	t.Parallel()
	block := map[string]interface{}{
		"when": []interface{}{
			map[string]interface{}{"predicate": `auth.identity.tier == "enterprise"`},
		},
	}
	if !limitBlockMentionsTierInPredicates(block, "enterprise") {
		t.Fatal("expected match for double-quoted tier")
	}
	if limitBlockMentionsTierInPredicates(block, "free") {
		t.Fatal("expected no match for different tier")
	}
	blockSingle := map[string]interface{}{
		"when": []interface{}{
			map[string]interface{}{"predicate": `auth.identity.tier == 'gold'`},
		},
	}
	if !limitBlockMentionsTierInPredicates(blockSingle, "gold") {
		t.Fatal("expected match for single-quoted tier")
	}
}

func TestDiscoverTokenRateLimitsForTier_arbitraryKeyWithPredicate(t *testing.T) {
	t.Parallel()
	pol := unstructured.Unstructured{
		Object: map[string]interface{}{
			"spec": map[string]interface{}{
				"limits": map[string]interface{}{
					"cli-custom": map[string]interface{}{
						"when": []interface{}{
							map[string]interface{}{"predicate": `auth.identity.tier == "mytier"`},
						},
						"rates": []interface{}{
							map[string]interface{}{"limit": int64(7), "window": "1h"},
						},
					},
				},
			},
		},
	}
	pol.SetName("orphan-trlp")
	rates, err := discoverTokenRateLimitsForTier("mytier", []unstructured.Unstructured{pol})
	if err != nil {
		t.Fatal(err)
	}
	if len(rates) != 1 || rates[0].Count != 7 || rates[0].Unit != models.GEP_2257_HOUR {
		t.Fatalf("unexpected rates: %#v", rates)
	}
}

func TestDiscoverTokenRateLimitsForTier_prefersCanonicalFirst(t *testing.T) {
	t.Parallel()
	orphan := unstructured.Unstructured{
		Object: map[string]interface{}{
			"spec": map[string]interface{}{
				"limits": map[string]interface{}{
					"tier-a-tokens": map[string]interface{}{
						"rates": []interface{}{
							map[string]interface{}{"limit": int64(1), "window": "1m"},
						},
					},
				},
			},
		},
	}
	orphan.SetName("orphan")
	canonical := unstructured.Unstructured{
		Object: map[string]interface{}{
			"spec": map[string]interface{}{
				"limits": map[string]interface{}{
					"tier-a-tokens": map[string]interface{}{
						"rates": []interface{}{
							map[string]interface{}{"limit": int64(99), "window": "1h"},
						},
					},
				},
			},
		},
	}
	canonical.SetName("gw-token-rate-limits")
	rates, err := discoverTokenRateLimitsForTier("tier-a", sortPoliciesCanonicalFirst([]unstructured.Unstructured{orphan, canonical}, "gw-token-rate-limits"))
	if err != nil {
		t.Fatal(err)
	}
	if len(rates) != 1 || rates[0].Count != 99 {
		t.Fatalf("expected canonical limit, got %#v", rates)
	}
}
