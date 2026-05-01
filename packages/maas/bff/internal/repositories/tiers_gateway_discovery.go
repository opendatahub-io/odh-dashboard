package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"slices"
	"strings"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// listPoliciesForGateway returns all Kuadrant TokenRateLimitPolicy or RateLimitPolicy objects in the
// gateway namespace whose spec.targetRef points at this repository's Gateway (same group/kind/name).
func (t *TiersRepository) listPoliciesForGateway(ctx context.Context, gvr schema.GroupVersionResource) ([]unstructured.Unstructured, error) {
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}
	list, err := client.GetDynamicClient().Resource(gvr).Namespace(t.gatewayNamespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var out []unstructured.Unstructured
	for i := range list.Items {
		if policyTargetRefMatchesGateway(&list.Items[i], t.gatewayName) {
			out = append(out, list.Items[i])
		}
	}
	return out, nil
}

func policyTargetRefMatchesGateway(obj *unstructured.Unstructured, gatewayName string) bool {
	if obj == nil {
		return false
	}
	g, gOK, gErr := unstructured.NestedString(obj.Object, "spec", "targetRef", "group")
	if gErr != nil || !gOK {
		return false
	}
	kind, kOK, kErr := unstructured.NestedString(obj.Object, "spec", "targetRef", "kind")
	if kErr != nil || !kOK {
		return false
	}
	name, nOK, nErr := unstructured.NestedString(obj.Object, "spec", "targetRef", "name")
	if nErr != nil || !nOK {
		return false
	}
	return g == "gateway.networking.k8s.io" && kind == "Gateway" && name == gatewayName
}

// sortPoliciesCanonicalFirst returns a copy of items with the named policy first (if present), then others sorted by name.
func sortPoliciesCanonicalFirst(items []unstructured.Unstructured, canonicalName string) []unstructured.Unstructured {
	var first []unstructured.Unstructured
	var rest []unstructured.Unstructured
	for i := range items {
		if items[i].GetName() == canonicalName {
			first = append(first, items[i])
		} else {
			rest = append(rest, items[i])
		}
	}
	slices.SortFunc(rest, func(a, b unstructured.Unstructured) int {
		return strings.Compare(a.GetName(), b.GetName())
	})
	return append(first, rest...)
}

// discoverTokenRateLimitsForTier finds token rates for a tier across all TRLPs targeting the gateway.
// Resolution order (first hit wins):
//  1. spec.limits["<tier>-tokens"] on any policy (canonical first)
//  2. spec.limits["<tier>"] when the value looks like a token limit block (rates / when)
//  3. any other limits entry whose when predicates include auth.identity.tier == "<tier>" (CLI layout)
func discoverTokenRateLimitsForTier(tierName string, policies []unstructured.Unstructured) ([]models.RateLimit, error) {
	for _, pol := range policies {
		for _, key := range []string{managedTokenLimitKey(tierName), tierName} {
			rates, err := convertPolicyToRateLimits(&pol, key)
			if err != nil {
				return nil, err
			}
			if len(rates) > 0 {
				return rates, nil
			}
		}
		limits := extractLimitsMap(&pol)
		for key, raw := range limits {
			if key == managedTokenLimitKey(tierName) || key == tierName {
				continue
			}
			val, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if !limitBlockMentionsTierInPredicates(val, tierName) {
				continue
			}
			rates, err := convertPolicyToRateLimits(&pol, key)
			if err != nil {
				return nil, err
			}
			if len(rates) > 0 {
				return rates, nil
			}
		}
	}
	return nil, nil
}

// discoverRequestRateLimitsForTier is the RateLimitPolicy analogue of discoverTokenRateLimitsForTier.
func discoverRequestRateLimitsForTier(tierName string, policies []unstructured.Unstructured) ([]models.RateLimit, error) {
	for _, pol := range policies {
		for _, key := range []string{managedRequestLimitKey(tierName), tierName} {
			rates, err := convertPolicyToRateLimits(&pol, key)
			if err != nil {
				return nil, err
			}
			if len(rates) > 0 {
				return rates, nil
			}
		}
		limits := extractLimitsMap(&pol)
		for key, raw := range limits {
			if key == managedRequestLimitKey(tierName) || key == tierName {
				continue
			}
			val, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if !limitBlockMentionsTierInPredicates(val, tierName) {
				continue
			}
			rates, err := convertPolicyToRateLimits(&pol, key)
			if err != nil {
				return nil, err
			}
			if len(rates) > 0 {
				return rates, nil
			}
		}
	}
	return nil, nil
}

var (
	tierPredDoubleQuote = regexp.MustCompile(`auth\.identity\.tier\s*==\s*"([^"]+)"`)
	tierPredSingleQuote = regexp.MustCompile(`auth\.identity\.tier\s*==\s*'([^']+)'`)
)

func limitBlockMentionsTierInPredicates(limitBlock map[string]interface{}, tierName string) bool {
	whenRaw, ok := limitBlock["when"]
	if !ok || whenRaw == nil {
		return false
	}
	whenSlice, ok := whenRaw.([]interface{})
	if !ok {
		return false
	}
	var b strings.Builder
	for _, w := range whenSlice {
		m, ok := w.(map[string]interface{})
		if !ok {
			continue
		}
		p, _ := m["predicate"].(string)
		b.WriteString(p)
		b.WriteByte(' ')
	}
	joined := strings.ReplaceAll(b.String(), `\"`, `"`)
	for _, re := range []*regexp.Regexp{tierPredDoubleQuote, tierPredSingleQuote} {
		for _, sm := range re.FindAllStringSubmatch(joined, -1) {
			if len(sm) > 1 && sm[1] == tierName {
				return true
			}
		}
	}
	return false
}

// deleteNonCanonicalGatewayPolicies removes every policy of this GVR in the gateway namespace that targets
// the same Gateway but is not the canonical combined object name. This rolls CLI-created duplicate TRLP/RLP
// objects into the single resource the dashboard manages so Kuadrant stops reporting Overridden policies.
func (t *TiersRepository) deleteNonCanonicalGatewayPolicies(ctx context.Context, gvr schema.GroupVersionResource, canonicalName string) error {
	items, err := t.listPoliciesForGateway(ctx, gvr)
	if err != nil {
		return err
	}
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}
	dyn := client.GetDynamicClient()
	var errs []error
	for i := range items {
		n := items[i].GetName()
		if n == canonicalName {
			continue
		}
		if err := dyn.Resource(gvr).Namespace(t.gatewayNamespace).Delete(ctx, n, metav1.DeleteOptions{}); err != nil {
			if !k8sErrors.IsNotFound(err) {
				errs = append(errs, fmt.Errorf("delete %s %s/%s: %w", gvr.Resource, t.gatewayNamespace, n, err))
			}
			continue
		}
		if t.logger != nil {
			t.logger.Info("removed duplicate gateway-scoped policy after consolidating limits",
				slog.String("resource", gvr.Resource),
				slog.String("namespace", t.gatewayNamespace),
				slog.String("name", n),
				slog.String("canonical", canonicalName),
			)
		}
	}
	return errors.Join(errs...)
}
