package repositories

import (
	"context"
	"errors"
	"log/slog"
	"slices"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
	v1 "k8s.io/api/core/v1"
	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// Borrowed from https://github.com/opendatahub-io/models-as-a-service/blob/main/maas-api/internal/tier/types.go
type tierConfigMapData struct {
	Name        string   `yaml:"name"`                  // Tier name - stable identifier (e.g., "free", "premium", "enterprise")
	DisplayName string   `yaml:"displayName,omitempty"` // Human-friendly label (optional, falls back to Name)
	Description string   `yaml:"description,omitempty"` // Human-readable description
	Groups      []string `yaml:"groups"`                // List of groups that belong to this tier
	Level       int      `yaml:"level"`                 // Level for importance (higher wins)
}

type TiersRepository struct {
	logger                  *slog.Logger
	k8sFactory              kubernetes.KubernetesClientFactory
	tiersConfigMapNamespace string
	tiersConfigMapName      string
	gatewayNamespace        string
	gatewayName             string
}

// tierPolicyReference is a helper type that represents a policy resource that contains tier-specific limits
type tierPolicyReference struct {
	resource  *unstructured.Unstructured
	gvr       schema.GroupVersionResource
	limitKeys []string // Keys of limits that match our tier
}

var (
	ErrTierExists     = errors.New("tier exists")
	ErrTierNotFound   = errors.New("tier not found")
	ErrUpdateConflict = errors.New("another user has updated tier data at the same time")
)

// TODO: In general, there is no protection around edits from multiple users

func NewTiersRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory, configMapNamespace, configMapName, gatewayNamespace, gatewayName string) *TiersRepository {
	return &TiersRepository{
		logger:                  logger,
		k8sFactory:              k8sFactory,
		tiersConfigMapNamespace: configMapNamespace,
		tiersConfigMapName:      configMapName,
		gatewayNamespace:        gatewayNamespace,
		gatewayName:             gatewayName,
	}
}

func (t *TiersRepository) fetchTiersConfigMap(ctx context.Context) (*v1.ConfigMap, error) {
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetKubeClient()
	tiersConfigMap, err := kubeClient.CoreV1().ConfigMaps(t.tiersConfigMapNamespace).Get(ctx, t.tiersConfigMapName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	return tiersConfigMap, nil
}

func (t *TiersRepository) parseTiersConfigMap(cm *v1.ConfigMap) ([]tierConfigMapData, error) {
	tierRawData, tiersDataPresent := cm.Data["tiers"]
	if !tiersDataPresent {
		return []tierConfigMapData{}, nil
	}

	var tierData []tierConfigMapData
	err := yaml.Unmarshal([]byte(tierRawData), &tierData)
	if err != nil {
		return nil, err
	}

	return tierData, nil
}

func (t *TiersRepository) fetchParsedTiersConfigMap(ctx context.Context) (*v1.ConfigMap, []tierConfigMapData, error) {
	tiersConfigMap, err := t.fetchTiersConfigMap(ctx)
	if err != nil {
		return nil, nil, err
	}

	tierData, err := t.parseTiersConfigMap(tiersConfigMap)
	if err != nil {
		return tiersConfigMap, nil, err
	}

	return tiersConfigMap, tierData, nil
}

func (t *TiersRepository) updateTiersConfigMap(ctx context.Context, tiersConfigMap *v1.ConfigMap, tiersData []tierConfigMapData) error {
	yamlData, err := yaml.Marshal(tiersData)
	if err != nil {
		return err
	}
	if tiersConfigMap.Data == nil {
		tiersConfigMap.Data = make(map[string]string)
	}
	tiersConfigMap.Data["tiers"] = string(yamlData)

	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	kubeClient := client.GetKubeClient()
	_, err = kubeClient.CoreV1().ConfigMaps(t.tiersConfigMapNamespace).Update(ctx, tiersConfigMap, metav1.UpdateOptions{})
	if err != nil {
		if k8sErrors.IsConflict(err) {
			return ErrUpdateConflict
		}
		return err
	}

	return nil
}

func (t *TiersRepository) fetchTierLimits(ctx context.Context, tiers models.TiersList) error {
	tokenPolicies, ratePolicies, err := t.fetchPolicyResources(ctx)
	if err != nil {
		return err
	}

	for idx := range tiers {
		tierName := tiers[idx].Name
		tokenLimitsRefs := t.findTierLimitsInPolicies(tierName, tokenPolicies, constants.TokenPolicyGvr)
		rateLimitsRefs := t.findTierLimitsInPolicies(tierName, ratePolicies, constants.RatePolicyGvr)

		tiers[idx].Limits.TokensPerUnit, err = convertTierPolicyReferencesToFrontEndFormat(tokenLimitsRefs)
		if err != nil {
			return err
		}

		tiers[idx].Limits.RequestsPerUnit, err = convertTierPolicyReferencesToFrontEndFormat(rateLimitsRefs)
		if err != nil {
			return err
		}
	}

	return nil
}

func (t *TiersRepository) GetTiersList(ctx context.Context) (models.TiersList, error) {
	_, tierData, err := t.fetchParsedTiersConfigMap(ctx)
	if err != nil {
		return nil, err
	}

	tiersList := make(models.TiersList, len(tierData))
	for idx, tier := range tierData {
		tiersList[idx].Name = tier.Name
		tiersList[idx].DisplayName = tier.DisplayName
		tiersList[idx].Description = tier.Description
		tiersList[idx].Groups = tier.Groups
		tiersList[idx].Level = tier.Level
		if err = t.fetchTierLimits(ctx, tiersList); err != nil {
			return nil, err
		}

		// TODO: Remove fake data
		tiersList[idx].Models = []string{"ns1-llama", "n2-granite"}
	}

	return tiersList, nil
}

func (t *TiersRepository) GetTierByName(ctx context.Context, name string) (*models.Tier, error) {
	tiers, err := t.GetTiersList(ctx)
	if err != nil {
		return nil, err
	}

	for _, tier := range tiers {
		if tier.Name == name {
			return &tier, nil
		}
	}

	return nil, nil
}

func (t *TiersRepository) CreateTier(ctx context.Context, tier models.Tier) (*models.Tier, error) {
	// TODO: Validate tier name is compliant with Kubernetes names.

	tierConfigMap, parsedTiers, err := t.fetchParsedTiersConfigMap(ctx)
	if err != nil {
		return nil, err
	}

	for _, existingTier := range parsedTiers {
		if existingTier.Name == tier.Name {
			return nil, ErrTierExists
		}
	}

	newTier := tierConfigMapData{
		Name:        tier.Name,
		DisplayName: tier.DisplayName,
		Description: tier.Description,
		Level:       tier.Level,
		Groups:      tier.Groups,
	}
	parsedTiers = append(parsedTiers, newTier)

	if err = t.updateTiersConfigMap(ctx, tierConfigMap, parsedTiers); err != nil {
		return nil, err
	}

	if !t.isEmptyLimits(tier.Limits) {
		err = t.createOrUpdateRateLimitPolicies(ctx, tier.Name, tier.Limits)
	}

	if err != nil {
		return nil, err
	}

	return &tier, nil
}

func (t *TiersRepository) UpdateTier(ctx context.Context, tier models.Tier) (*models.Tier, error) {
	tierConfigMap, parsedTiers, err := t.fetchParsedTiersConfigMap(ctx)
	if err != nil {
		return nil, err
	}

	tierIdx := -1
	for idx, existingTier := range parsedTiers {
		if existingTier.Name == tier.Name {
			tierIdx = idx
		}
	}

	if tierIdx == -1 {
		return nil, ErrTierNotFound
	}

	parsedTiers[tierIdx] = tierConfigMapData{
		Name:        parsedTiers[tierIdx].Name,
		DisplayName: tier.DisplayName,
		Description: tier.Description,
		Level:       tier.Level,
		Groups:      tier.Groups,
	}

	if err = t.updateTiersConfigMap(ctx, tierConfigMap, parsedTiers); err != nil {
		return nil, err
	}

	if !t.isEmptyLimits(tier.Limits) {
		err = t.createOrUpdateRateLimitPolicies(ctx, tier.Name, tier.Limits)
		if err != nil {
			return nil, err
		}
	}

	return &tier, nil
}

func (t *TiersRepository) DeleteTierByName(ctx context.Context, name string) error {
	tierConfigMap, parsedTiers, err := t.fetchParsedTiersConfigMap(ctx)
	if err != nil {
		return err
	}

	tierIdx := -1
	for idx, existingTier := range parsedTiers {
		if existingTier.Name == name {
			tierIdx = idx
			break
		}
	}

	if tierIdx == -1 {
		return ErrTierNotFound
	}

	// TODO: Delete side effects? (e.g. models belonging to the tier)
	// TODO: Remove tier limits (possibly, odh-model-controller task?)

	return t.updateTiersConfigMap(ctx, tierConfigMap, slices.Delete(parsedTiers, tierIdx, tierIdx+1))
}

// isEmptyLimits checks if the provided TierLimits structure contains any rate limits
func (t *TiersRepository) isEmptyLimits(limits models.TierLimits) bool {
	return len(limits.TokensPerUnit) == 0 && len(limits.RequestsPerUnit) == 0
}

func convertTierPolicyReferencesToFrontEndFormat(policyReferences []tierPolicyReference) ([]models.RateLimit, error) {
	var rateLimits []models.RateLimit

	for _, tierPolicy := range policyReferences {
		policyContent := tierPolicy.resource.UnstructuredContent()

		for _, matchingKey := range tierPolicy.limitKeys {
			rates, ratesOk, ratesErr := unstructured.NestedSlice(policyContent, "spec", "limits", matchingKey, "rates")

			if ratesErr != nil {
				return nil, ratesErr
			}
			if !ratesOk {
				continue
			}

			for _, rate := range rates {
				rateMap := rate.(map[string]interface{})
				count := rateMap["limit"].(int64)
				window := rateMap["window"].(string)
				parsedWindow, parseWindowErr := time.ParseDuration(window)
				if parseWindowErr != nil {
					return nil, parseWindowErr
				}

				windowDuration := int64(parsedWindow.Hours())
				windowUnit := models.GEP_2257_HOUR

				if windowDuration <= 0 {
					windowDuration = int64(parsedWindow.Minutes())
					windowUnit = models.GEP_2257_MINUTE
				}

				if windowDuration <= 0 {
					windowDuration = int64(parsedWindow.Seconds())
					windowUnit = models.GEP_2257_SECOND
				}

				if windowDuration <= 0 {
					windowDuration = parsedWindow.Milliseconds()
					windowUnit = models.GEP_2257_MILLISECOND
				}

				rateLimits = append(rateLimits, models.RateLimit{
					Count: count,
					Time:  windowDuration,
					Unit:  windowUnit,
				})
			}
		}
	}

	return rateLimits, nil
}

// convertRateLimitToKubernetesFormat converts models.RateLimit slice to Kubernetes policy rates format
func convertRateLimitToKubernetesFormat(rateLimits []models.RateLimit) []map[string]interface{} {
	var rates []map[string]interface{}

	for _, rateLimit := range rateLimits {
		var duration time.Duration
		switch rateLimit.Unit {
		case models.GEP_2257_HOUR:
			duration = time.Duration(rateLimit.Time) * time.Hour
		case models.GEP_2257_MINUTE:
			duration = time.Duration(rateLimit.Time) * time.Minute
		case models.GEP_2257_SECOND:
			duration = time.Duration(rateLimit.Time) * time.Second
		case models.GEP_2257_MILLISECOND:
			duration = time.Duration(rateLimit.Time) * time.Millisecond
		default:
			// Default to seconds if unit is unknown
			duration = time.Duration(rateLimit.Time) * time.Second
		}

		rate := map[string]interface{}{
			"limit":  rateLimit.Count,
			"window": duration.String(),
		}
		rates = append(rates, rate)
	}

	return rates
}

// buildRateLimitPolicy creates a Kubernetes RateLimitPolicy resource for request-based rate limiting
func buildRateLimitPolicy(tierName, gatewayNamespace, gatewayName string, rateLimits []models.RateLimit) *unstructured.Unstructured {
	policyName := "tier-" + tierName + "-rate-limits"
	limitKey := tierName + "-requests"

	policy := &unstructured.Unstructured{}
	policy.SetAPIVersion("kuadrant.io/v1")
	policy.SetKind("RateLimitPolicy")
	policy.SetName(policyName)
	policy.SetNamespace(gatewayNamespace)

	// Build the policy specification
	spec := map[string]interface{}{
		"targetRef": map[string]interface{}{
			"group": "gateway.networking.k8s.io",
			"kind":  "Gateway",
			"name":  gatewayName,
		},
		"limits": map[string]interface{}{
			limitKey: map[string]interface{}{
				"rates": convertRateLimitToKubernetesFormat(rateLimits),
				"when": []map[string]interface{}{
					{
						"predicate": "auth.identity.tier == \"" + tierName + "\"",
					},
				},
				"counters": []map[string]interface{}{
					{
						"expression": "auth.identity.userid",
					},
				},
			},
		},
	}

	policy.Object["spec"] = spec
	return policy
}

// buildTokenRateLimitPolicy creates a Kubernetes TokenRateLimitPolicy resource for token-based rate limiting
func buildTokenRateLimitPolicy(tierName, gatewayNamespace, gatewayName string, rateLimits []models.RateLimit) *unstructured.Unstructured {
	policyName := "tier-" + tierName + "-token-rate-limits"
	limitKey := tierName + "-tokens"

	policy := &unstructured.Unstructured{}
	policy.SetAPIVersion("kuadrant.io/v1alpha1")
	policy.SetKind("TokenRateLimitPolicy")
	policy.SetName(policyName)
	policy.SetNamespace(gatewayNamespace)

	// Build the policy specification
	spec := map[string]interface{}{
		"targetRef": map[string]interface{}{
			"group": "gateway.networking.k8s.io",
			"kind":  "Gateway",
			"name":  gatewayName,
		},
		"limits": map[string]interface{}{
			limitKey: map[string]interface{}{
				"rates": convertRateLimitToKubernetesFormat(rateLimits),
				"when": []map[string]interface{}{
					{
						"predicate": "auth.identity.tier == \"" + tierName + "\"",
					},
				},
				"counters": []map[string]interface{}{
					{
						"expression": "auth.identity.userid",
					},
				},
			},
		},
	}

	policy.Object["spec"] = spec
	return policy
}

// createOrUpdateRateLimitPolicies creates or updates Kubernetes rate limit policy resources for a tier
// This function handles consolidation by scanning existing policies, cleaning up tier-specific entries,
// and creating/updating our managed resources with the new configuration
func (t *TiersRepository) createOrUpdateRateLimitPolicies(ctx context.Context, tierName string, limits models.TierLimits) error {
	var errs []error

	// Phase 1: Scan for existing tier-specific policies across all resources
	tierPolicyRefs, scanErr := t.scanExistingTierPolicies(ctx, tierName)
	if scanErr != nil {
		t.logger.Warn("Failed to scan existing tier policies", "tier", tierName, "error", scanErr)
		errs = append(errs, scanErr)
		// Continue with creation even if scanning fails
	} else {
		t.logger.Info("Found existing tier policies", "tier", tierName, "count", len(tierPolicyRefs))
	}

	// Phase 2: Create/update our managed resources with the new configuration
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		errs = append(errs, err)
		return errors.Join(errs...)
	}

	kubeClient := client.GetDynamicClient()

	// Create/update RateLimitPolicy for RequestsPerUnit if present
	if len(limits.RequestsPerUnit) > 0 {
		rateLimitPolicy := buildRateLimitPolicy(tierName, t.gatewayNamespace, t.gatewayName, limits.RequestsPerUnit)

		_, createErr := kubeClient.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Create(ctx, rateLimitPolicy, metav1.CreateOptions{})
		if createErr != nil {
			if k8sErrors.IsAlreadyExists(createErr) {
				existingPolicy, getErr := kubeClient.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Get(ctx, rateLimitPolicy.GetName(), metav1.GetOptions{})
				if getErr != nil {
					t.logger.Warn("Failed to update consolidated RateLimitPolicy", "tier", tierName, "error", getErr)
					errs = append(errs, getErr)
				} else {
					existingPolicy.Object["spec"] = rateLimitPolicy.Object["spec"]
					_, updateErr := kubeClient.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Update(ctx, existingPolicy, metav1.UpdateOptions{})
					if updateErr != nil {
						t.logger.Warn("Failed to update consolidated RateLimitPolicy", "tier", tierName, "error", updateErr)
						errs = append(errs, updateErr)
					} else {
						t.logger.Debug("Updated consolidated RateLimitPolicy", "tier", tierName, "policy", rateLimitPolicy.GetName())
					}
				}
			} else {
				t.logger.Warn("Failed to create consolidated RateLimitPolicy", "tier", tierName, "error", createErr)
				errs = append(errs, createErr)
			}
		} else {
			t.logger.Debug("Created consolidated RateLimitPolicy", "tier", tierName, "policy", rateLimitPolicy.GetName())
		}
	}

	// Create/update TokenRateLimitPolicy for TokensPerUnit if present
	if len(limits.TokensPerUnit) > 0 {
		tokenRateLimitPolicy := buildTokenRateLimitPolicy(tierName, t.gatewayNamespace, t.gatewayName, limits.TokensPerUnit)

		_, createErr := kubeClient.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Create(ctx, tokenRateLimitPolicy, metav1.CreateOptions{})
		if createErr != nil {
			if k8sErrors.IsAlreadyExists(createErr) {
				existingPolicy, getErr := kubeClient.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Get(ctx, tokenRateLimitPolicy.GetName(), metav1.GetOptions{})
				if getErr != nil {
					t.logger.Warn("Failed to update consolidated TokenRateLimitPolicy", "tier", tierName, "error", getErr)
					errs = append(errs, createErr)
				} else {
					existingPolicy.Object["spec"] = tokenRateLimitPolicy.Object["spec"]
					_, updateErr := kubeClient.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Update(ctx, existingPolicy, metav1.UpdateOptions{})
					if updateErr != nil {
						t.logger.Warn("Failed to update consolidated TokenRateLimitPolicy", "tier", tierName, "error", updateErr)
						errs = append(errs, updateErr)
					} else {
						t.logger.Debug("Updated consolidated TokenRateLimitPolicy", "tier", tierName, "policy", tokenRateLimitPolicy.GetName())
					}
				}
			} else {
				t.logger.Warn("Failed to create consolidated TokenRateLimitPolicy", "tier", tierName, "error", createErr)
				errs = append(errs, createErr)
			}
		} else {
			t.logger.Debug("Created consolidated TokenRateLimitPolicy", "tier", tierName, "policy", tokenRateLimitPolicy.GetName())
		}
	}

	// Phase 3: Clean up tier entries from existing policies (consolidation)
	if len(tierPolicyRefs) > 0 {
		cleanupErrors := t.cleanupTierFromPolicies(ctx, tierName, tierPolicyRefs)
		if len(cleanupErrors) > 0 {
			t.logger.Warn("Some cleanup operations failed", "tier", tierName, "errorCount", len(cleanupErrors))
			errs = append(errs, cleanupErrors...)
		}
	}

	// Log consolidation summary
	if len(tierPolicyRefs) > 0 {
		t.logger.Debug("Tier policy consolidation completed",
			"tier", tierName,
			"originalPolicies", len(tierPolicyRefs),
			"errs", len(errs))
	}

	return errors.Join(errs...)
}

// scanExistingTierPolicies scans all rate limit policy resources to find ones containing tier-specific entries
func (t *TiersRepository) scanExistingTierPolicies(ctx context.Context, tierName string) ([]tierPolicyReference, error) {
	var tierPolicies []tierPolicyReference

	tokenPolicies, ratePolicies, err := t.fetchPolicyResources(ctx)
	if err != nil {
		return nil, err
	}

	tierPolicies = append(tierPolicies, t.findTierLimitsInPolicies(tierName, ratePolicies, constants.RatePolicyGvr)...)
	tierPolicies = append(tierPolicies, t.findTierLimitsInPolicies(tierName, tokenPolicies, constants.TokenPolicyGvr)...)

	return tierPolicies, nil
}

// findTierLimitsInPolicies examines policy resources to find tier-specific limit entries
func (t *TiersRepository) findTierLimitsInPolicies(tierName string, policies []unstructured.Unstructured, gvr schema.GroupVersionResource) []tierPolicyReference {
	var tierPolicyRefs []tierPolicyReference

	for _, policy := range policies {
		var matchingLimitKeys []string

		if !isGatewayTargetedPolicy(policy, t.gatewayName) {
			continue
		}

		policyContent := policy.UnstructuredContent()
		policyLimits, policyLimitsOk, _ := unstructured.NestedMap(policyContent, "spec", "limits")
		if !policyLimitsOk {
			continue
		}

		for limitKey := range policyLimits {
			if matchesTierPredicate(policyLimits, limitKey, tierName) {
				matchingLimitKeys = append(matchingLimitKeys, limitKey)
			}
		}

		// If we found tier-specific limits in this policy, add it to our list
		if len(matchingLimitKeys) > 0 {
			policyCopy := policy.DeepCopy()
			tierPolicyRefs = append(tierPolicyRefs, tierPolicyReference{
				resource:  policyCopy,
				gvr:       gvr,
				limitKeys: matchingLimitKeys,
			})
		}
	}

	return tierPolicyRefs
}

// cleanupTierFromPolicies removes tier-specific entries from existing policies and returns policies that became empty
func (t *TiersRepository) cleanupTierFromPolicies(ctx context.Context, tierName string, tierPolicyRefs []tierPolicyReference) []error {
	var errors []error

	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return []error{err}
	}

	kubeClient := client.GetDynamicClient()

	for _, policyRef := range tierPolicyRefs {
		// Skip our own managed resources (we'll recreate them)
		ourRatePolicyName := "tier-" + tierName + "-rate-limits"
		ourTokenPolicyName := "tier-" + tierName + "-token-rate-limits"

		if policyRef.resource.GetName() == ourRatePolicyName || policyRef.resource.GetName() == ourTokenPolicyName {
			continue
		}

		// Remove tier-specific limit keys from the policy
		policyContent := policyRef.resource.UnstructuredContent()
		policyLimits, policyLimitsOk, _ := unstructured.NestedMap(policyContent, "spec", "limits")
		if !policyLimitsOk {
			continue
		}

		for _, limitKey := range policyRef.limitKeys {
			delete(policyLimits, limitKey)
			t.logger.Info("Removed tier limit from policy",
				"policy", policyRef.resource.GetName(),
				"limitKey", limitKey)
		}

		// Check if policy became empty after removing tier limits
		if len(policyLimits) == 0 {
			// Delete the entire policy resource
			err := kubeClient.Resource(policyRef.gvr).Namespace(t.gatewayNamespace).Delete(ctx, policyRef.resource.GetName(), metav1.DeleteOptions{})
			if err != nil {
				t.logger.Warn("Failed to delete empty policy",
					"policy", policyRef.resource.GetName(),
					"error", err)
				errors = append(errors, err)
			} else {
				t.logger.Info("Deleted empty policy after tier cleanup",
					"policy", policyRef.resource.GetName())
			}
		} else {
			// Update the policy with tier limits removed
			errSetLimits := unstructured.SetNestedMap(policyRef.resource.Object, policyLimits, "spec", "limits")
			if errSetLimits != nil {
				t.logger.Warn("Failed to assign policy limits",
					"policy", policyRef.resource.GetName(),
					"error", errSetLimits)
				errors = append(errors, errSetLimits)
			} else {
				_, updateErr := kubeClient.Resource(policyRef.gvr).Namespace(t.gatewayNamespace).Update(ctx, policyRef.resource, metav1.UpdateOptions{})
				if updateErr != nil {
					t.logger.Warn("Failed to update policy after tier cleanup",
						"policy", policyRef.resource.GetName(),
						"error", updateErr)
					errors = append(errors, updateErr)
				} else {
					t.logger.Info("Updated policy after removing tier limits",
						"policy", policyRef.resource.GetName())
				}
			}
		}
	}

	return errors
}

// fetchPolicyResources consolidates the pattern of fetching both TokenRateLimitPolicy and RateLimitPolicy resources
func (t *TiersRepository) fetchPolicyResources(ctx context.Context) (tokenPolicies, ratePolicies []unstructured.Unstructured, err error) {
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, nil, err
	}

	kubeClient := client.GetDynamicClient()

	tokenPoliciesList, err := kubeClient.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, nil, err
	}

	ratePoliciesList, err := kubeClient.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, nil, err
	}

	return tokenPoliciesList.Items, ratePoliciesList.Items, nil
}

// isGatewayTargetedPolicy checks if a policy targets a specific gateway by name
func isGatewayTargetedPolicy(policy unstructured.Unstructured, gatewayName string) bool {
	policyContent := policy.UnstructuredContent()

	targetRef, targetRefOk, _ := unstructured.NestedMap(policyContent, "spec", "targetRef")
	if !targetRefOk {
		return false
	}

	targetRefGroup, _ := targetRef["group"].(string)
	targetRefKind, _ := targetRef["kind"].(string)
	targetRefName, _ := targetRef["name"].(string)

	return targetRefGroup == "gateway.networking.k8s.io" &&
		targetRefKind == "Gateway" &&
		targetRefName == gatewayName
}

// matchesTierPredicate checks if the predicate of a policy matches a specific tier
func matchesTierPredicate(policyLimits map[string]interface{}, limitKey, targetTierName string) bool {
	predicateList, predicateListOk, _ := unstructured.NestedSlice(policyLimits, limitKey, "when")
	if !predicateListOk || len(predicateList) != 1 {
		return false
	}

	predicateValue, predicateOk := predicateList[0].(map[string]interface{})["predicate"].(string)
	if !predicateOk {
		return false
	}

	expectedPredicate := "auth.identity.tier == \"" + targetTierName + "\""
	return strings.TrimSpace(predicateValue) == expectedPredicate
}
