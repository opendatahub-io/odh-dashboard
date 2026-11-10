package repositories

import (
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// ConvertSubscriptionListItemsToSubscriptions maps the maas-api /v1/subscriptions
// passthrough payload (as returned by APIKeysRepository.ListSubscriptionsForApiKeys)
// onto the MaaSSubscription shape returned by GET /api/v1/all-subscriptions, so both
// endpoints stay response-compatible.
//
// The maas-api payload is sanitised and does not carry the full subscription record:
//   - owner.groups is copied from the upstream owner, preserving full group names.
//     Missing groups are normalized to an empty list;
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

// ownerGroupsFromListItem copies upstream owner.groups, normalizing absent groups to [].
func ownerGroupsFromListItem(item models.SubscriptionListItem) []models.GroupReference {
	groups := []models.GroupReference{}
	if item.Owner == nil {
		return groups
	}
	groups = append(groups, item.Owner.Groups...)
	return groups
}
