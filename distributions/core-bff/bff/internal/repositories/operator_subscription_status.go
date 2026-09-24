package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

const unknownOperatorChannel = "Unknown"

var operatorSubscriptions = []struct {
	name      string
	namespace string
}{
	{name: "rhods-operator", namespace: "redhat-ods-operator"},
	{name: "opendatahub-operator", namespace: "opendatahub-operator"},
}

// OperatorSubscriptionStatusRepository reads the installed data science operator subscription.
type OperatorSubscriptionStatusRepository struct {
	saDynClient dynamic.Interface
}

func NewOperatorSubscriptionStatusRepository(saDynClient dynamic.Interface) *OperatorSubscriptionStatusRepository {
	return &OperatorSubscriptionStatusRepository{saDynClient: saDynClient}
}

// GetOperatorSubscriptionStatus returns the first installed supported operator channel.
// A missing subscription is expected on clusters where a different distribution is installed.
func (r *OperatorSubscriptionStatusRepository) GetOperatorSubscriptionStatus(ctx context.Context) (*models.OperatorSubscriptionStatus, error) {
	if r.saDynClient == nil {
		return &models.OperatorSubscriptionStatus{Channel: unknownOperatorChannel}, nil
	}

	for _, subscription := range operatorSubscriptions {
		resource, err := r.saDynClient.Resource(models.SubscriptionGVR).Namespace(subscription.namespace).Get(ctx, subscription.name, metav1.GetOptions{})
		if apierrors.IsNotFound(err) {
			continue
		}
		if err != nil {
			return nil, fmt.Errorf("getting subscription %s/%s: %w", subscription.namespace, subscription.name, err)
		}
		if channel := subscriptionChannel(resource); channel != "" {
			return &models.OperatorSubscriptionStatus{Channel: channel}, nil
		}
	}

	return &models.OperatorSubscriptionStatus{Channel: unknownOperatorChannel}, nil
}

func subscriptionChannel(subscription *unstructured.Unstructured) string {
	channel, _, _ := unstructured.NestedString(subscription.Object, "spec", "channel")
	return channel
}
