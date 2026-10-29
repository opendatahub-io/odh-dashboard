package repositories

import (
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// FilterSubscriptionsForMyView keeps subscriptions that do not contain backend
// owner metadata. Owner-bearing entries represent subscriptions owned by another
// user and must not appear in My subscriptions for either admins or non-admins.
func FilterSubscriptionsForMyView(items []models.SubscriptionListItem) []models.SubscriptionListItem {
	filtered := make([]models.SubscriptionListItem, 0, len(items))
	for _, item := range items {
		if item.Owner == nil {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

// ConvertSubscriptionListItemsToMySubscriptions removes backend authorization
// metadata before subscriptions are returned to the MaaS portal.
func ConvertSubscriptionListItemsToMySubscriptions(
	items []models.SubscriptionListItem,
) []models.MySubscriptionListItem {
	result := make([]models.MySubscriptionListItem, 0, len(items))
	for _, item := range items {
		modelRefs := make([]models.MyModelRefInfo, 0, len(item.ModelRefs))
		for _, ref := range item.ModelRefs {
			modelRefs = append(modelRefs, models.MyModelRefInfo{
				Name:            ref.Name,
				ModelName:       ref.ModelName,
				DisplayName:     ref.DisplayName,
				Source:          ref.Source,
				Description:     ref.Description,
				Namespace:       ref.Namespace,
				TokenRateLimits: ref.TokenRateLimits,
				BillingRate:     ref.BillingRate,
			})
		}

		priority := item.Priority
		if priority == nil {
			priority = item.InferencePriority
		}

		result = append(result, models.MySubscriptionListItem{
			SubscriptionIDHeader:    item.SubscriptionIDHeader,
			SubscriptionDescription: item.SubscriptionDescription,
			DisplayName:             item.DisplayName,
			Priority:                priority,
			KeyCount:                item.KeyCount,
			ModelRefs:               modelRefs,
			OrganizationID:          item.OrganizationID,
			CostCenter:              item.CostCenter,
			Labels:                  item.Labels,
		})
	}
	return result
}
