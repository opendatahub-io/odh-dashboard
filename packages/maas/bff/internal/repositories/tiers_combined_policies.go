// File tiers_combined_policies.go implements the single-CR Kuadrant model for MaaS tiers.
//
// Background: Kuadrant enforces at most one TokenRateLimitPolicy and one RateLimitPolicy per Gateway
// target. The dashboard used to create tier-<name>-token-rate-limits per tier, so only one tier was
// actually enforced. We now maintain exactly two cluster objects (names configurable, defaulting to
// "<gatewayName>-token-rate-limits" and "<gatewayName>-request-rate-limits") and store every tier
// under spec.limits using keys "<tier>-tokens" and "<tier>-requests".
//
// Read path (see attachTierRateLimits in tiers.go):
//
//	Step 1 — GET the two combined policies by fixed metadata.name (no label selector required).
//	Step 2 — For each tier row from the ConfigMap, read rates from spec.limits using the managed keys.
//	Step 3 — If a tier has no data in the combined object, GET legacy per-tier CRs (pre-upgrade clusters).
//
// Write path (CreateTier / UpdateTier / DeleteTier in tiers.go):
//
//	Step 1 — Persist tier metadata in the tier-to-group-mapping ConfigMap as before.
//	Step 2 — buildLimitsByTierForSync merges live cluster limits with the one tier changed in this request.
//	Step 3 — mergeManagedTokenKeysOnly / mergeManagedRequestKeysOnly copy existing spec.limits and
//	         upsert or delete only the managed keys for tiers still in the ConfigMap (CLI-only keys stay).
//	Step 4 — upsert combined CRs; Update uses mergeGatewayPolicySpec so unknown spec fields survive.
//	Step 5 — delete legacy per-tier policy objects for tiers we touched + tiers just removed.
//
// DeleteTier ordering: ConfigMap row is removed first, then sync runs with tiersRemoved so managed keys
// for the deleted tier are stripped from spec.limits even though that tier no longer appears in the loop.
package repositories

import (
	"context"
	"errors"
	"fmt"
	"slices"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// --- Legacy naming (one Kuadrant policy per tier) -----------------------------------------------
// Kuadrant only enforces one RateLimitPolicy / TokenRateLimitPolicy per Gateway target, so these
// per-tier objects conflict. We still read them as a fallback until migration deletes them.

func legacyPerTierTokenPolicyName(tier string) string {
	return "tier-" + tier + "-token-rate-limits"
}

func legacyPerTierRatePolicyName(tier string) string {
	return "tier-" + tier + "-rate-limits"
}

// --- Managed limit keys inside the combined policies --------------------------------------------
// The dashboard reserves spec.limits keys shaped like "<tierName>-tokens" and "<tierName>-requests".
// Extra keys (e.g. from CLI) are preserved on merge.

func managedTokenLimitKey(tierName string) string {
	return tierName + "-tokens"
}

func managedRequestLimitKey(tierName string) string {
	return tierName + "-requests"
}

func dashboardManagedLabels() map[string]string {
	return map[string]string{
		"opendatahub.io/dashboard": "true",
	}
}

// tierPredicateWhen returns the same auth/path predicate the dashboard has always used for tier rows.
// Must be []interface{} (not []map[string]interface{}) for unstructured.SetNested* deep-copy.
func tierPredicateWhen(tierName string) []interface{} {
	return []interface{}{
		map[string]interface{}{
			"predicate": "auth.identity.tier == \"" + tierName + "\" && !request.path.endsWith(\"/v1/models\")",
		},
	}
}

func tierCountersWhen() []interface{} {
	return []interface{}{
		map[string]interface{}{
			"expression": "auth.identity.userid",
		},
	}
}

// buildManagedTokenLimitEntry builds one spec.limits entry for token limits for a single tier.
func buildManagedTokenLimitEntry(tierName, gatewayName string, rateLimits []models.RateLimit) map[string]interface{} {
	return map[string]interface{}{
		"rates":    convertRateLimitToKubernetesFormat(rateLimits),
		"when":     tierPredicateWhen(tierName),
		"counters": tierCountersWhen(),
	}
}

// buildManagedRequestLimitEntry builds one spec.limits entry for request limits for a single tier.
func buildManagedRequestLimitEntry(tierName, gatewayName string, rateLimits []models.RateLimit) map[string]interface{} {
	return map[string]interface{}{
		"rates":    convertRateLimitToKubernetesFormat(rateLimits),
		"when":     tierPredicateWhen(tierName),
		"counters": tierCountersWhen(),
	}
}

// cloneLimitsShallowTopLevel copies the top-level spec.limits map so we can add/remove keys without
// mutating the object returned from the API server cache.
func cloneLimitsShallowTopLevel(src map[string]interface{}) map[string]interface{} {
	if len(src) == 0 {
		return map[string]interface{}{}
	}
	out := make(map[string]interface{}, len(src))
	for k, v := range src {
		out[k] = v
	}
	return out
}

// mergeManagedTokenKeysOnly updates only "<tier>-tokens" keys on the TokenRateLimitPolicy limits map.
// Request keys must never be written onto a TRLP; that is a separate CR (RateLimitPolicy).
func mergeManagedTokenKeysOnly(
	existingLimits map[string]interface{},
	tierNames []string,
	limitsByTier map[string]models.TierLimits,
	gatewayName string,
) map[string]interface{} {
	merged := cloneLimitsShallowTopLevel(existingLimits)
	for _, tierName := range tierNames {
		lim := limitsByTier[tierName]
		key := managedTokenLimitKey(tierName)
		if len(lim.TokensPerUnit) > 0 {
			merged[key] = buildManagedTokenLimitEntry(tierName, gatewayName, lim.TokensPerUnit)
		} else {
			delete(merged, key)
		}
	}
	return merged
}

// mergeManagedRequestKeysOnly updates only "<tier>-requests" keys on the RateLimitPolicy limits map.
func mergeManagedRequestKeysOnly(
	existingLimits map[string]interface{},
	tierNames []string,
	limitsByTier map[string]models.TierLimits,
	gatewayName string,
) map[string]interface{} {
	merged := cloneLimitsShallowTopLevel(existingLimits)
	for _, tierName := range tierNames {
		lim := limitsByTier[tierName]
		key := managedRequestLimitKey(tierName)
		if len(lim.RequestsPerUnit) > 0 {
			merged[key] = buildManagedRequestLimitEntry(tierName, gatewayName, lim.RequestsPerUnit)
		} else {
			delete(merged, key)
		}
	}
	return merged
}

// getPolicyByName loads one namespaced dynamic object; returns (nil, nil) if NotFound.
func (t *TiersRepository) getPolicyByName(ctx context.Context, gvr schema.GroupVersionResource, name string) (*unstructured.Unstructured, error) {
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}
	kube := client.GetDynamicClient()
	obj, err := kube.Resource(gvr).Namespace(t.gatewayNamespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	return obj, nil
}

// extractLimitsMap returns spec.limits as a map, or empty map if missing/malformed.
func extractLimitsMap(policy *unstructured.Unstructured) map[string]interface{} {
	if policy == nil {
		return map[string]interface{}{}
	}
	limits, found, err := unstructured.NestedMap(policy.Object, "spec", "limits")
	if err != nil || !found || limits == nil {
		return map[string]interface{}{}
	}
	return limits
}

// buildLimitsByTierForSync builds per-tier TierLimits used for the next combined policy write.
// Step 1: load the current combined TRLP/RLP (if any).
// Step 2: for each tier in parsedTiers, if tier name matches dirtyTierName use dirtyLimits from the API request;
// otherwise copy limits from the combined policies (with legacy per-tier GET fallback when combined is missing a key).
func (t *TiersRepository) buildLimitsByTierForSync(
	ctx context.Context,
	parsedTiers []tierConfigMapData,
	dirtyTierName string,
	dirtyLimits models.TierLimits,
) (map[string]models.TierLimits, error) {
	combinedToken, err := t.getPolicyByName(ctx, constants.TokenPolicyGvr, t.combinedTokenPolicyName)
	if err != nil {
		return nil, err
	}
	combinedRate, err := t.getPolicyByName(ctx, constants.RatePolicyGvr, t.combinedRatePolicyName)
	if err != nil {
		return nil, err
	}

	out := make(map[string]models.TierLimits, len(parsedTiers))
	kube, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}
	dyn := kube.GetDynamicClient()

	for _, row := range parsedTiers {
		name := row.Name
		if name == dirtyTierName {
			out[name] = dirtyLimits
			continue
		}

		tok, tokErr := convertPolicyToRateLimits(combinedToken, managedTokenLimitKey(name))
		if tokErr != nil {
			return nil, tokErr
		}
		req, reqErr := convertPolicyToRateLimits(combinedRate, managedRequestLimitKey(name))
		if reqErr != nil {
			return nil, reqErr
		}

		// Legacy fallback: old clusters had one TokenRateLimitPolicy / RateLimitPolicy per tier.
		if len(tok) == 0 {
			legacyTokObj, legacyErr := dyn.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Get(ctx, legacyPerTierTokenPolicyName(name), metav1.GetOptions{})
			if legacyErr == nil && legacyTokObj != nil {
				tok, tokErr = convertPolicyToRateLimits(legacyTokObj, managedTokenLimitKey(name))
				if tokErr != nil {
					return nil, tokErr
				}
			} else if legacyErr != nil && !k8sErrors.IsNotFound(legacyErr) {
				return nil, legacyErr
			}
		}
		if len(req) == 0 {
			legacyRateObj, legacyErr := dyn.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Get(ctx, legacyPerTierRatePolicyName(name), metav1.GetOptions{})
			if legacyErr == nil && legacyRateObj != nil {
				req, reqErr = convertPolicyToRateLimits(legacyRateObj, managedRequestLimitKey(name))
				if reqErr != nil {
					return nil, reqErr
				}
			} else if legacyErr != nil && !k8sErrors.IsNotFound(legacyErr) {
				return nil, legacyErr
			}
		}

		out[name] = models.TierLimits{
			TokensPerUnit:   tok,
			RequestsPerUnit: req,
		}
	}

	return out, nil
}

// syncCombinedPolicies writes the two combined policies from limitsByTier for every tier name in tierNames.
// Step 1: GET each combined policy (if exists) to recover spec.limits for merge.
// Step 2: merge token keys and request keys into their respective CRs (never cross-contaminate).
// Step 3: Create or Update; on Update we merge into existing spec so unknown Kuadrant fields are preserved.
// tiersRemoved lists tier names just deleted from the ConfigMap so we strip their managed limit keys
// from the combined policies (mergeManaged* only touches tiers still present in parsedTiers).
func (t *TiersRepository) syncCombinedPolicies(ctx context.Context, parsedTiers []tierConfigMapData, limitsByTier map[string]models.TierLimits, tiersRemoved []string) error {
	tierNames := make([]string, 0, len(parsedTiers))
	for _, row := range parsedTiers {
		tierNames = append(tierNames, row.Name)
	}

	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}
	dyn := client.GetDynamicClient()

	existingToken, err := t.getPolicyByName(ctx, constants.TokenPolicyGvr, t.combinedTokenPolicyName)
	if err != nil {
		return err
	}
	existingRate, err := t.getPolicyByName(ctx, constants.RatePolicyGvr, t.combinedRatePolicyName)
	if err != nil {
		return err
	}

	tokenLimitsMap := mergeManagedTokenKeysOnly(
		extractLimitsMap(existingToken),
		tierNames,
		limitsByTier,
		t.gatewayName,
	)
	rateLimitsMap := mergeManagedRequestKeysOnly(
		extractLimitsMap(existingRate),
		tierNames,
		limitsByTier,
		t.gatewayName,
	)

	// Tiers removed from the ConfigMap are no longer in tierNames — merge would not delete their keys, so strip explicitly.
	for _, gone := range tiersRemoved {
		delete(tokenLimitsMap, managedTokenLimitKey(gone))
		delete(rateLimitsMap, managedRequestLimitKey(gone))
	}

	if err := t.upsertCombinedTokenPolicy(ctx, dyn, existingToken, tokenLimitsMap); err != nil {
		return fmt.Errorf("TokenRateLimitPolicy %s/%s: %w", t.gatewayNamespace, t.combinedTokenPolicyName, err)
	}
	if err := t.upsertCombinedRatePolicy(ctx, dyn, existingRate, rateLimitsMap); err != nil {
		return fmt.Errorf("RateLimitPolicy %s/%s: %w", t.gatewayNamespace, t.combinedRatePolicyName, err)
	}

	// After a successful combined write, remove legacy per-tier objects so Kuadrant stops seeing conflicts.
	// Include tiersRemoved so we delete tier-<gone>-* legacy CRs for the tier just deleted from the ConfigMap.
	legacyCleanupNames := append(slices.Clone(tierNames), tiersRemoved...)
	if err := t.deleteLegacyPerTierPoliciesForTiers(ctx, legacyCleanupNames); err != nil {
		if t.logger != nil {
			t.logger.Warn("legacy per-tier policy cleanup failed (combined policies are still correct)", "error", err)
		}
	}

	return nil
}

// syncCombinedPoliciesFromDirtyTier builds limits from cluster + one dirty tier row, then writes combined policies.
func (t *TiersRepository) syncCombinedPoliciesFromDirtyTier(
	ctx context.Context,
	parsedTiers []tierConfigMapData,
	dirtyTierName string,
	dirtyLimits models.TierLimits,
	tiersRemoved []string,
) error {
	limitsByTier, err := t.buildLimitsByTierForSync(ctx, parsedTiers, dirtyTierName, dirtyLimits)
	if err != nil {
		return err
	}
	return t.syncCombinedPolicies(ctx, parsedTiers, limitsByTier, tiersRemoved)
}

func (t *TiersRepository) upsertCombinedTokenPolicy(ctx context.Context, dyn dynamic.Interface, existing *unstructured.Unstructured, limits map[string]interface{}) error {
	if existing == nil {
		// Unstructured.Object must be non-nil before SetNestedMap; a zero Unstructured has Object == nil and would panic.
		obj := &unstructured.Unstructured{Object: map[string]interface{}{}}
		obj.SetAPIVersion("kuadrant.io/v1alpha1")
		obj.SetKind("TokenRateLimitPolicy")
		obj.SetName(t.combinedTokenPolicyName)
		obj.SetNamespace(t.gatewayNamespace)
		obj.SetLabels(dashboardManagedLabels())
		spec := combinedTokenPolicySpec(t.gatewayName, limits)
		if err := unstructured.SetNestedMap(obj.Object, spec, "spec"); err != nil {
			return err
		}
		_, err := dyn.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Create(ctx, obj, metav1.CreateOptions{})
		return err
	}

	// Preserve any Kuadrant-only spec keys we do not know about: merge into existing spec map, then set limits + targetRef.
	if err := mergeGatewayPolicySpec(existing, t.gatewayName, limits); err != nil {
		return err
	}
	_, err := dyn.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Update(ctx, existing, metav1.UpdateOptions{})
	return err
}

func (t *TiersRepository) upsertCombinedRatePolicy(ctx context.Context, dyn dynamic.Interface, existing *unstructured.Unstructured, limits map[string]interface{}) error {
	if existing == nil {
		obj := &unstructured.Unstructured{Object: map[string]interface{}{}}
		obj.SetAPIVersion("kuadrant.io/v1")
		obj.SetKind("RateLimitPolicy")
		obj.SetName(t.combinedRatePolicyName)
		obj.SetNamespace(t.gatewayNamespace)
		obj.SetLabels(dashboardManagedLabels())
		spec := combinedRatePolicySpec(t.gatewayName, limits)
		if err := unstructured.SetNestedMap(obj.Object, spec, "spec"); err != nil {
			return err
		}
		_, err := dyn.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Create(ctx, obj, metav1.CreateOptions{})
		return err
	}
	if err := mergeGatewayPolicySpec(existing, t.gatewayName, limits); err != nil {
		return err
	}
	_, err := dyn.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Update(ctx, existing, metav1.UpdateOptions{})
	return err
}

// mergeGatewayPolicySpec writes limits + targetRef onto unstructured.Object["spec"],
// keeping any other sibling keys already present under spec.
//
// Important: Kuadrant TokenRateLimitPolicy and RateLimitPolicy CRDs do NOT allow spec.strategy
// alongside top-level spec.limits (strategy exists only under spec.defaults / spec.overrides).
// A root-level strategy causes strict CRD validation to reject Create/Update — seen as HTTP 500
// from the BFF while the ConfigMap write had already succeeded.
func mergeGatewayPolicySpec(existing *unstructured.Unstructured, gatewayName string, limits map[string]interface{}) error {
	if existing.Object == nil {
		existing.Object = map[string]interface{}{}
	}
	spec, found, err := unstructured.NestedMap(existing.Object, "spec")
	if err != nil {
		return err
	}
	if !found || spec == nil {
		spec = map[string]interface{}{}
	}
	spec["limits"] = limits
	spec["targetRef"] = map[string]interface{}{
		"group": "gateway.networking.k8s.io",
		"kind":  "Gateway",
		"name":  gatewayName,
	}
	delete(spec, "strategy")
	return unstructured.SetNestedMap(existing.Object, spec, "spec")
}

func combinedTokenPolicySpec(gatewayName string, limits map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"targetRef": map[string]interface{}{
			"group": "gateway.networking.k8s.io",
			"kind":  "Gateway",
			"name":  gatewayName,
		},
		"limits": limits,
	}
}

func combinedRatePolicySpec(gatewayName string, limits map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"targetRef": map[string]interface{}{
			"group": "gateway.networking.k8s.io",
			"kind":  "Gateway",
			"name":  gatewayName,
		},
		"limits": limits,
	}
}

func (t *TiersRepository) deleteLegacyPerTierPoliciesForTiers(ctx context.Context, tierNames []string) error {
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}
	dyn := client.GetDynamicClient()
	var errs []error
	for _, tierName := range tierNames {
		tokenName := legacyPerTierTokenPolicyName(tierName)
		rateName := legacyPerTierRatePolicyName(tierName)
		if err := dyn.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Delete(ctx, tokenName, metav1.DeleteOptions{}); err != nil && !k8sErrors.IsNotFound(err) {
			errs = append(errs, err)
		}
		if err := dyn.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Delete(ctx, rateName, metav1.DeleteOptions{}); err != nil && !k8sErrors.IsNotFound(err) {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// deleteLegacyPoliciesForSingleTier removes old per-tier policy names for one tier (used after DeleteTier).
func (t *TiersRepository) deleteLegacyPoliciesForSingleTier(ctx context.Context, tierName string) error {
	return t.deleteLegacyPerTierPoliciesForTiers(ctx, []string{tierName})
}
