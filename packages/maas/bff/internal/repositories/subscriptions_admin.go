package repositories

import (
	"sort"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// ConvertSubscriptionListItemsToSubscriptions maps the maas-api /v1/subscriptions
// passthrough payload (as returned by APIKeysRepository.ListSubscriptionsForApiKeys)
// onto the MaaSSubscription shape returned by GET /api/v1/all-subscriptions, so both
// endpoints stay response-compatible.
//
// The maas-api payload is sanitised and does not carry the full subscription record:
//   - owner.groups is mapped from the upstream `owner_groups` field (group names). maas-api
//     does not expose it yet, so it is empty unless that field is present, in which case it
//     is converted to group references, skipping empty names. An explicit empty list means the
//     subscription really has no groups. Never read group membership from elsewhere here;
//   - phase/status/conditions and resourceVersion are not exposed, so they are left
//     empty. Consumers of this endpoint must not rely on them.
//
// Everything else (name, display name, description, model refs with rate limits,
// inference priority and token metadata) is carried over.
func ConvertSubscriptionListItemsToSubscriptions(
	items []models.SubscriptionListItem,
	namespace string,
) []models.MaaSSubscription {
	subscriptions := make([]models.MaaSSubscription, 0, len(items))
	for _, item := range items {
		subscriptions = append(subscriptions, convertSubscriptionListItemToSubscription(item, namespace))
	}
	sort.SliceStable(subscriptions, func(i, j int) bool {
		return subscriptions[i].Name < subscriptions[j].Name
	})
	return subscriptions
}

func convertSubscriptionListItemToSubscription(
	item models.SubscriptionListItem,
	namespace string,
) models.MaaSSubscription {
	modelRefs := make([]models.ModelSubscriptionRef, 0, len(item.ModelRefs))
	for _, ref := range item.ModelRefs {
		refNamespace := ref.Namespace
		if refNamespace == "" {
			refNamespace = namespace
		}
		tokenRateLimits := make([]models.TokenRateLimit, 0, len(ref.TokenRateLimits))
		for _, limit := range ref.TokenRateLimits {
			tokenRateLimits = append(tokenRateLimits, models.TokenRateLimit(limit))
		}
		var billingRate *models.BillingRate
		if ref.BillingRate != nil {
			converted := models.BillingRate(*ref.BillingRate)
			billingRate = &converted
		}
		modelRefs = append(modelRefs, models.ModelSubscriptionRef{
			Name:            ref.Name,
			Namespace:       refNamespace,
			DisplayName:     ref.DisplayName,
			Description:     ref.Description,
			TokenRateLimits: tokenRateLimits,
			BillingRate:     billingRate,
		})
	}

	subscription := models.MaaSSubscription{
		Name:              item.SubscriptionIDHeader,
		DisplayName:       item.DisplayName,
		Description:       item.SubscriptionDescription,
		Namespace:         namespace,
		InferencePriority: item.InferencePriority,
		Owner:             models.OwnerSpec{Groups: ownerGroupsFromListItem(item)},
		ModelRefs:         modelRefs,
	}

	if item.OrganizationID != "" || item.CostCenter != "" || len(item.Labels) > 0 {
		subscription.TokenMetadata = &models.TokenMetadata{
			OrganizationID: item.OrganizationID,
			CostCenter:     item.CostCenter,
			Labels:         item.Labels,
		}
	}

	return subscription
}

// ownerGroupsFromListItem converts the optional upstream `owner_groups` names into the
// owner.groups shape used by all-subscriptions. It always returns a non-nil slice so the JSON
// payload stays `[]` rather than `null` when the upstream field is absent.
func ownerGroupsFromListItem(item models.SubscriptionListItem) []models.GroupReference {
	groups := []models.GroupReference{}
	if item.OwnerGroups == nil {
		return groups
	}
	for _, name := range *item.OwnerGroups {
		if name == "" {
			continue
		}
		groups = append(groups, models.GroupReference{Name: name})
	}
	return groups
}
