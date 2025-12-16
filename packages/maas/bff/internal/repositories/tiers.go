package repositories

import (
	"context"
	"errors"
	"slices"

	"gopkg.in/yaml.v3"
	v1 "k8s.io/api/core/v1"
	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

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
	k8sFactory              kubernetes.KubernetesClientFactory
	tiersConfigMapNamespace string
	tiersConfigMapName      string
}

var (
	ErrTierExists        = errors.New("tier exists")
	ErrTierLevelConflict = errors.New("another tier with same level exists")
	ErrTierNotFound      = errors.New("tier not found")
	ErrUpdateConflict    = errors.New("another user has updated tier data at the same time")
)

func NewTiersRepository(k8sFactory kubernetes.KubernetesClientFactory, configMapNamespace, configMapName string) *TiersRepository {
	return &TiersRepository{
		k8sFactory:              k8sFactory,
		tiersConfigMapNamespace: configMapNamespace,
		tiersConfigMapName:      configMapName,
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
		tiersList[idx].Limits = models.TierLimits{
			TokensPerHour:     100,
			RequestsPerMinute: 10,
		}
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
		return ErrTierExists
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
