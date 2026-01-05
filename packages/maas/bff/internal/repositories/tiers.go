package repositories

import (
	"context"
	"errors"
	"log/slog"
	"regexp"
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

func parseTierLimits(policies *unstructured.UnstructuredList, gatewayName string) (map[string][]models.RateLimit, error) {
	tiersLimits := make(map[string][]models.RateLimit)
	for _, policy := range policies.Items {
		policyContent := policy.UnstructuredContent()
		targetRef, targetRefOk, policyErr := unstructured.NestedMap(policyContent, "spec", "targetRef")
		if policyErr != nil {
			return nil, policyErr
		}
		if !targetRefOk {
			continue
		}

		targetRefGroup, targetRefGroupOk := targetRef["group"].(string)
		targetRefKind, targetRefKindOk := targetRef["kind"].(string)
		targetRefName, targetRefNameOk := targetRef["name"].(string)

		if !targetRefGroupOk || !targetRefKindOk || !targetRefNameOk {
			continue
		}
		if targetRefGroup != "gateway.networking.k8s.io" || targetRefKind != "Gateway" || targetRefName != gatewayName {
			continue
		}

		policyLimits, policyLimitsOk, policyErr := unstructured.NestedMap(policyContent, "spec", "limits")
		if policyErr != nil {
			return nil, policyErr
		}
		if !policyLimitsOk {
			continue
		}

		for limitKey, _ := range policyLimits {
			predicateList, predicateListOk, predicateListErr := unstructured.NestedSlice(policyLimits, limitKey, "when")
			if predicateListErr != nil {
				return nil, predicateListErr
			}
			if !predicateListOk {
				continue
			}
			if len(predicateList) != 1 {
				continue
			}
			predicate := predicateList[0].(map[string]interface{})["predicate"].(string)

			predicate = strings.TrimSpace(predicate)
			r, regexErr := regexp.Compile("^auth.identity.tier == \"(.*)\"$")
			if regexErr != nil {
				return nil, regexErr
			}

			matches := r.FindStringSubmatch(predicate)
			if len(matches) != 2 {
				continue
			}
			tierName := matches[1]

			rates, ratesOk, ratesErr := unstructured.NestedSlice(policyLimits, limitKey, "rates")
			if ratesErr != nil {
				return nil, ratesErr
			}
			if !ratesOk {
				continue
			}

			var rateLimits []models.RateLimit
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

			tiersLimits[tierName] = append(tiersLimits[tierName], rateLimits...)
		}
	}

	return tiersLimits, nil
}

func (t *TiersRepository) fetchTierLimits(ctx context.Context, tiers models.TiersList) error {
	client, err := t.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	kubeClient := client.GetDynamicClient()

	// TokenRateLimitPolicy
	tokenPoliciesList, err := kubeClient.Resource(constants.TokenPolicyGvr).Namespace(t.gatewayNamespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return err
	}

	tokenLimits, err := parseTierLimits(tokenPoliciesList, t.gatewayName)
	if err != nil {
		return err
	}

	// RateLimitPolicy
	ratePoliciesList, err := kubeClient.Resource(constants.RatePolicyGvr).Namespace(t.gatewayNamespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return err
	}

	rateLimits, err := parseTierLimits(ratePoliciesList, t.gatewayName)
	if err != nil {
		return err
	}

	for idx := range tiers {
		tierName := tiers[idx].Name
		if limits, ok := tokenLimits[tierName]; ok {
			tiers[idx].Limits.TokensPerUnit = limits
		}
		if limits, ok := rateLimits[tierName]; ok {
			tiers[idx].Limits.RequestsPerUnit = limits
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

func (t *TiersRepository) CreateTier(ctx context.Context, tier models.Tier) error {
	// TODO: Validate tier name is compliant with Kubernetes names.

	tierConfigMap, parsedTiers, err := t.fetchParsedTiersConfigMap(ctx)
	if err != nil {
		return err
	}

	for _, existingTier := range parsedTiers {
		if existingTier.Name == tier.Name {
			return ErrTierExists
		}
		if existingTier.Level == tier.Level {
			return ErrTierLevelConflict
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

	// TODO: Record tier limits

	return t.updateTiersConfigMap(ctx, tierConfigMap, parsedTiers)
}

func (t *TiersRepository) UpdateTier(ctx context.Context, tier models.Tier) error {
	tierConfigMap, parsedTiers, err := t.fetchParsedTiersConfigMap(ctx)
	if err != nil {
		return err
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
		return ErrTierNotFound
	}

	if levelConflict {
		return ErrTierLevelConflict
	}

	parsedTiers[tierIdx] = tierConfigMapData{
		Name:        parsedTiers[tierIdx].Name,
		DisplayName: tier.DisplayName,
		Description: tier.Description,
		Level:       tier.Level,
		Groups:      tier.Groups,
	}

	// TODO: Record tier limits

	return t.updateTiersConfigMap(ctx, tierConfigMap, parsedTiers)
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
