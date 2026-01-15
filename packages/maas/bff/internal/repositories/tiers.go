package repositories

import (
	"context"
	"errors"
	"log/slog"
	"slices"
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
	Level       int      `yaml:"level,omitempty"`       // Level for importance (higher wins)
}

type TiersRepository struct {
	logger                  *slog.Logger
	k8sFactory              kubernetes.KubernetesClientFactory
	tiersConfigMapNamespace string
	tiersConfigMapName      string
	gatewayNamespace        string
	gatewayName             string
}

var (
	ErrTierExists        = errors.New("tier exists")
	ErrTierLevelConflict = errors.New("another tier with same level exists")
	ErrTierNotFound      = errors.New("tier not found")
	ErrUpdateConflict    = errors.New("another user has updated tier data at the same time")
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

		// Token rate limits
		tokenPolicyName := "tier-" + tierName + "-token-rate-limits"
		tokenLimitKey := tierName + "-tokens"
		tokenPolicy := t.findPolicyByName(tokenPolicyName, tokenPolicies)
		tiers[idx].Limits.TokensPerUnit, err = convertPolicyToRateLimits(tokenPolicy, tokenLimitKey)
		if err != nil {
			return err
		}

		// Request rate limits
		ratePolicyName := "tier-" + tierName + "-rate-limits"
		rateLimitKey := tierName + "-requests"
		ratePolicy := t.findPolicyByName(ratePolicyName, ratePolicies)
		tiers[idx].Limits.RequestsPerUnit, err = convertPolicyToRateLimits(ratePolicy, rateLimitKey)
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
		if existingTier.Level == tier.Level {
			return nil, ErrTierLevelConflict
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
	levelConflict := false
	for idx, existingTier := range parsedTiers {
		if existingTier.Name == tier.Name {
			tierIdx = idx
		} else if existingTier.Level == tier.Level {
			levelConflict = true
		}
	}

	if tierIdx == -1 {
		return nil, ErrTierNotFound
	}

	if levelConflict {
		return nil, ErrTierLevelConflict
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

	// Clean up rate limit policy resources associated with this tier
	if err := t.deleteTierRateLimitPolicies(ctx, name); err != nil {
		t.logger.Warn("Failed to cleanup tier rate limit policies", "tier", name, "error", err)
		return err
	}

	return t.updateTiersConfigMap(ctx, tierConfigMap, slices.Delete(parsedTiers, tierIdx, tierIdx+1))
}

// deleteTierRateLimitPolicies removes all rate limit policy resources associated with a tier
func (t *TiersRepository) deleteTierRateLimitPolicies(ctx context.Context, tierName string) error {
	var errs []error

	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	kubeClient := client.GetDynamicClient()

	// Delete RateLimitPolicy if it exists
	ratePolicyName := "tier-" + tierName + "-rate-limits"
	err = kubeClient.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Delete(ctx, ratePolicyName, metav1.DeleteOptions{})
	if err != nil {
		if !k8sErrors.IsNotFound(err) {
			t.logger.Warn("Failed to delete RateLimitPolicy", "tier", tierName, "policy", ratePolicyName, "error", err)
			errs = append(errs, err)
		}
	} else {
		t.logger.Info("Deleted RateLimitPolicy", "tier", tierName, "policy", ratePolicyName)
	}

	// Delete TokenRateLimitPolicy if it exists
	tokenPolicyName := "tier-" + tierName + "-token-rate-limits"
	err = kubeClient.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Delete(ctx, tokenPolicyName, metav1.DeleteOptions{})
	if err != nil {
		if !k8sErrors.IsNotFound(err) {
			t.logger.Warn("Failed to delete TokenRateLimitPolicy", "tier", tierName, "policy", tokenPolicyName, "error", err)
			errs = append(errs, err)
		}
	} else {
		t.logger.Info("Deleted TokenRateLimitPolicy", "tier", tierName, "policy", tokenPolicyName)
	}

	if len(errs) > 0 {
		return errors.Join(errs...)
	}

	return nil
}

// isEmptyLimits checks if the provided TierLimits structure contains any rate limits
func (t *TiersRepository) isEmptyLimits(limits models.TierLimits) bool {
	return len(limits.TokensPerUnit) == 0 && len(limits.RequestsPerUnit) == 0
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
	policy.SetLabels(map[string]string{
		"opendatahub.io/dashboard": "true",
	})

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
	policy.SetLabels(map[string]string{
		"opendatahub.io/dashboard": "true",
	})

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
func (t *TiersRepository) createOrUpdateRateLimitPolicies(ctx context.Context, tierName string, limits models.TierLimits) error {
	var errs []error

	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
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
					t.logger.Warn("Failed to get RateLimitPolicy for update", "tier", tierName, "error", getErr)
					errs = append(errs, getErr)
				} else {
					existingPolicy.Object["spec"] = rateLimitPolicy.Object["spec"]
					_, updateErr := kubeClient.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).Update(ctx, existingPolicy, metav1.UpdateOptions{})
					if updateErr != nil {
						t.logger.Warn("Failed to update RateLimitPolicy", "tier", tierName, "error", updateErr)
						errs = append(errs, updateErr)
					} else {
						t.logger.Debug("Updated RateLimitPolicy", "tier", tierName, "policy", rateLimitPolicy.GetName())
					}
				}
			} else {
				t.logger.Warn("Failed to create RateLimitPolicy", "tier", tierName, "error", createErr)
				errs = append(errs, createErr)
			}
		} else {
			t.logger.Debug("Created RateLimitPolicy", "tier", tierName, "policy", rateLimitPolicy.GetName())
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
					t.logger.Warn("Failed to get TokenRateLimitPolicy for update", "tier", tierName, "error", getErr)
					errs = append(errs, getErr)
				} else {
					existingPolicy.Object["spec"] = tokenRateLimitPolicy.Object["spec"]
					_, updateErr := kubeClient.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).Update(ctx, existingPolicy, metav1.UpdateOptions{})
					if updateErr != nil {
						t.logger.Warn("Failed to update TokenRateLimitPolicy", "tier", tierName, "error", updateErr)
						errs = append(errs, updateErr)
					} else {
						t.logger.Debug("Updated TokenRateLimitPolicy", "tier", tierName, "policy", tokenRateLimitPolicy.GetName())
					}
				}
			} else {
				t.logger.Warn("Failed to create TokenRateLimitPolicy", "tier", tierName, "error", createErr)
				errs = append(errs, createErr)
			}
		} else {
			t.logger.Debug("Created TokenRateLimitPolicy", "tier", tierName, "policy", tokenRateLimitPolicy.GetName())
		}
	}

	return errors.Join(errs...)
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
