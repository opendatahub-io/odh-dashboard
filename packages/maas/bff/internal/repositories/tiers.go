package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
	v1 "k8s.io/api/core/v1"
	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

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
	// combinedTokenPolicyName / combinedRatePolicyName are the single CR names holding all tier limits (Kuadrant enforces one per kind per Gateway).
	combinedTokenPolicyName string
	combinedRatePolicyName  string
}

var (
	ErrTierExists     = errors.New("tier exists")
	ErrTierNotFound   = errors.New("tier not found")
	ErrUpdateConflict = errors.New("another user has updated tier data at the same time")
)

// TODO: In general, there is no protection around edits from multiple users

func NewTiersRepository(
	logger *slog.Logger,
	k8sFactory kubernetes.KubernetesClientFactory,
	configMapNamespace, configMapName, gatewayNamespace, gatewayName string,
	combinedTokenPolicyName, combinedRatePolicyName string,
) *TiersRepository {
	// Tests may pass empty policy names; default from gateway so Get/List behaviour stays deterministic.
	if combinedTokenPolicyName == "" {
		combinedTokenPolicyName = gatewayName + "-token-rate-limits"
	}
	if combinedRatePolicyName == "" {
		combinedRatePolicyName = gatewayName + "-request-rate-limits"
	}
	return &TiersRepository{
		logger:                  logger,
		k8sFactory:              k8sFactory,
		tiersConfigMapNamespace: configMapNamespace,
		tiersConfigMapName:      configMapName,
		gatewayNamespace:        gatewayNamespace,
		gatewayName:             gatewayName,
		combinedTokenPolicyName: combinedTokenPolicyName,
		combinedRatePolicyName:  combinedRatePolicyName,
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

// attachTierRateLimits fills each tier's Limits from TokenRateLimitPolicy / RateLimitPolicy objects that target
// this repository's Gateway. Discovery order: canonical combined names first, then other gateway-scoped policies
// (CLI layout: arbitrary limit keys with tier predicates), then legacy per-tier CRs that may not targetRef the Gateway.
func (t *TiersRepository) attachTierRateLimits(ctx context.Context, tiers models.TiersList) error {
	allTRLP, err := t.listPoliciesForGateway(ctx, constants.TokenPolicyGvr)
	if err != nil {
		return err
	}
	allRLP, err := t.listPoliciesForGateway(ctx, constants.RatePolicyGvr)
	if err != nil {
		return err
	}
	sortedTR := sortPoliciesCanonicalFirst(allTRLP, t.combinedTokenPolicyName)
	sortedRL := sortPoliciesCanonicalFirst(allRLP, t.combinedRatePolicyName)

	legacyTokenPolicies, legacyRatePolicies, err := t.fetchPolicyResources(ctx)
	if err != nil {
		return err
	}

	for idx := range tiers {
		tierName := tiers[idx].Name
		tokenLimitKey := managedTokenLimitKey(tierName)
		rateLimitKey := managedRequestLimitKey(tierName)

		tiers[idx].Limits.TokensPerUnit, err = discoverTokenRateLimitsForTier(tierName, sortedTR)
		if err != nil {
			return err
		}
		if len(tiers[idx].Limits.TokensPerUnit) == 0 {
			legacy := t.findPolicyByName(legacyPerTierTokenPolicyName(tierName), legacyTokenPolicies)
			tiers[idx].Limits.TokensPerUnit, err = convertPolicyToRateLimits(legacy, tokenLimitKey)
			if err != nil {
				return err
			}
		}

		tiers[idx].Limits.RequestsPerUnit, err = discoverRequestRateLimitsForTier(tierName, sortedRL)
		if err != nil {
			return err
		}
		if len(tiers[idx].Limits.RequestsPerUnit) == 0 {
			legacy := t.findPolicyByName(legacyPerTierRatePolicyName(tierName), legacyRatePolicies)
			tiers[idx].Limits.RequestsPerUnit, err = convertPolicyToRateLimits(legacy, rateLimitKey)
			if err != nil {
				return err
			}
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

		// TODO: Remove fake data
		tiersList[idx].Models = []string{"ns1-llama", "n2-granite"}
	}

	// One cluster round-trip for all tiers (previously this ran inside the loop and re-fetched every iteration).
	if err = t.attachTierRateLimits(ctx, tiersList); err != nil {
		return nil, err
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

	// Reconcile the two combined Kuadrant policies: merge this tier's limits with every other tier's limits from the live CRs.
	if err := t.syncCombinedPoliciesFromDirtyTier(ctx, parsedTiers, tier.Name, tier.Limits, nil); err != nil {
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

	// Always sync: clearing limits must delete managed keys; non-empty limits must upsert without wiping other tiers.
	if err := t.syncCombinedPoliciesFromDirtyTier(ctx, parsedTiers, tier.Name, tier.Limits, nil); err != nil {
		return nil, err
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

	remainingTiers := slices.Delete(slices.Clone(parsedTiers), tierIdx, tierIdx+1)
	if err := t.updateTiersConfigMap(ctx, tierConfigMap, remainingTiers); err != nil {
		return err
	}

	// Strip removed tier's managed keys from the combined policies and delete legacy per-tier CRs for all affected names.
	if err := t.syncCombinedPoliciesFromDirtyTier(ctx, remainingTiers, "", models.TierLimits{}, []string{name}); err != nil {
		return err
	}

	return nil
}

// convertPolicyToRateLimits extracts rate limits from a policy resource
func convertPolicyToRateLimits(policy *unstructured.Unstructured, limitKey string) ([]models.RateLimit, error) {
	if policy == nil {
		return []models.RateLimit{}, nil
	}

	var rateLimits []models.RateLimit
	policyContent := policy.UnstructuredContent()

	rates, ratesOk, ratesErr := unstructured.NestedSlice(policyContent, "spec", "limits", limitKey, "rates")
	if ratesErr != nil {
		return nil, ratesErr
	}
	if !ratesOk {
		return []models.RateLimit{}, nil
	}

	for _, rate := range rates {
		rateMap, ok := rate.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("rates entry: expected map[string]interface{}, got %T", rate)
		}
		count, err := kubernetesNumericToInt64(rateMap["limit"])
		if err != nil {
			return nil, fmt.Errorf("rates entry limit: %w", err)
		}
		windowVal, hasWindow := rateMap["window"]
		if !hasWindow {
			return nil, fmt.Errorf("rates entry: missing window")
		}
		window, ok := windowVal.(string)
		if !ok {
			return nil, fmt.Errorf("rates window: expected string, got %T", windowVal)
		}
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

	return rateLimits, nil
}

// convertRateLimitToKubernetesFormat converts models.RateLimit slice to the JSON shape Kubernetes
// expects inside unstructured objects. Slices must be []interface{}, not []map[string]interface{} —
// otherwise unstructured.SetNestedMap panics with "cannot deep copy []map[string]interface {}".
func convertRateLimitToKubernetesFormat(rateLimits []models.RateLimit) []interface{} {
	rates := make([]interface{}, 0, len(rateLimits))

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

		rates = append(rates, map[string]interface{}{
			"limit":  rateLimit.Count,
			"window": formatKuadrantDurationWindow(duration),
		})
	}

	return rates
}

// formatKuadrantDurationWindow formats a duration for Kuadrant's window field
// (pattern ^([0-9]{1,5}(h|m|s|ms)){1,4}$ in the bundled CRD). Go's duration.String()
// can emit values like "1h0m0s" or sub-nanosecond forms that fail validation.
func formatKuadrantDurationWindow(d time.Duration) string {
	if d <= 0 {
		return "1s"
	}
	h := int(d / time.Hour)
	d %= time.Hour
	m := int(d / time.Minute)
	d %= time.Minute
	s := int(d / time.Second)
	d %= time.Second
	ms := int(d / time.Millisecond)

	var parts []string
	if h > 0 {
		parts = append(parts, fmt.Sprintf("%dh", min(h, 99999)))
	}
	if m > 0 {
		parts = append(parts, fmt.Sprintf("%dm", min(m, 99999)))
	}
	if s > 0 {
		parts = append(parts, fmt.Sprintf("%ds", min(s, 99999)))
	}
	if ms > 0 {
		parts = append(parts, fmt.Sprintf("%dms", min(ms, 99999)))
	}
	if len(parts) == 0 {
		return "1s"
	}
	if len(parts) > 4 {
		parts = parts[:4]
	}
	return strings.Join(parts, "")
}

// kubernetesNumericToInt64 normalizes JSON / unstructured numeric shapes (int64 vs float64) from the API server.
func kubernetesNumericToInt64(v interface{}) (int64, error) {
	switch x := v.(type) {
	case int64:
		return x, nil
	case int32:
		return int64(x), nil
	case int:
		return int64(x), nil
	case float64:
		return int64(x), nil
	case float32:
		return int64(x), nil
	default:
		return 0, fmt.Errorf("unsupported numeric type %T", v)
	}
}

// findPolicyByName finds a policy resource by its name
func (t *TiersRepository) findPolicyByName(policyName string, policies []unstructured.Unstructured) *unstructured.Unstructured {
	for _, policy := range policies {
		if policy.GetName() == policyName {
			return policy.DeepCopy()
		}
	}
	return nil
}

// fetchPolicyResources consolidates the pattern of fetching both TokenRateLimitPolicy and RateLimitPolicy resources
// Only fetches managed resources (those with opendatahub.io/dashboard=true label)
func (t *TiersRepository) fetchPolicyResources(ctx context.Context) (tokenPolicies, ratePolicies []unstructured.Unstructured, err error) {
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, nil, err
	}

	kubeClient := client.GetDynamicClient()

	listOptions := metav1.ListOptions{
		LabelSelector: "opendatahub.io/dashboard=true",
	}

	tokenPoliciesList, err := kubeClient.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).List(ctx, listOptions)
	if err != nil {
		return nil, nil, err
	}

	ratePoliciesList, err := kubeClient.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).List(ctx, listOptions)
	if err != nil {
		return nil, nil, err
	}

	return tokenPoliciesList.Items, ratePoliciesList.Items, nil
}
