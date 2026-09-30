package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

const unknownOperatorChannel = "Unknown"

const (
	selfManagedRHOAIReleaseName = "OpenShift AI Self-Managed"
	managedRHOAIReleaseName     = "OpenShift AI Cloud Service"
)

type operatorSubscription struct {
	name      string
	namespace string
}

var operatorSubscriptions = []operatorSubscription{
	{name: "rhods-operator", namespace: "redhat-ods-operator"},
	{name: "opendatahub-operator", namespace: "opendatahub-operator"},
}

// OperatorSubscriptionStatusRepository reads the installed data science operator subscription.
type OperatorSubscriptionStatusRepository struct {
	saDynClient       dynamic.Interface
	operatorNamespace string
}

func NewOperatorSubscriptionStatusRepository(saDynClient dynamic.Interface, operatorNamespace string) *OperatorSubscriptionStatusRepository {
	return &OperatorSubscriptionStatusRepository{saDynClient: saDynClient, operatorNamespace: operatorNamespace}
}

// GetOperatorSubscriptionStatus returns the operator channel selected by the DSC release.
func (r *OperatorSubscriptionStatusRepository) GetOperatorSubscriptionStatus(ctx context.Context) (*models.OperatorSubscriptionStatus, error) {
	if r.saDynClient == nil {
		return &models.OperatorSubscriptionStatus{Channel: unknownOperatorChannel}, nil
	}

	subscription, err := r.selectedOperatorSubscription(ctx)
	if err != nil {
		return nil, err
	}

	resource, err := r.findSubscription(ctx, subscription)
	if err != nil {
		return nil, err
	}

	if channel := subscriptionChannel(resource); channel != "" {
		return &models.OperatorSubscriptionStatus{
			Channel:     channel,
			LastUpdated: subscriptionLastUpdated(resource),
		}, nil
	}
	return &models.OperatorSubscriptionStatus{Channel: unknownOperatorChannel}, nil
}

// Probe only known namespaces using named GETs; the portal needs no cluster-wide
// subscription list permission. An absent namespace may return Forbidden when
// no RoleBinding could be installed there, so try the remaining candidates.
func (r *OperatorSubscriptionStatusRepository) findSubscription(ctx context.Context, subscription operatorSubscription) (*unstructured.Unstructured, error) {
	namespaces := []string{r.operatorNamespace, subscription.namespace}
	if subscription.name == "opendatahub-operator" {
		namespaces = append(namespaces, "openshift-operators")
	}
	seen := make(map[string]bool)
	var accessErrors []error
	for _, namespace := range namespaces {
		if namespace == "" || seen[namespace] {
			continue
		}
		seen[namespace] = true
		resource, err := r.saDynClient.Resource(models.SubscriptionGVR).Namespace(namespace).Get(ctx, subscription.name, metav1.GetOptions{})
		if apierrors.IsNotFound(err) {
			continue
		}
		if apierrors.IsForbidden(err) {
			accessErrors = append(accessErrors, err)
			continue
		}
		if err != nil {
			return nil, fmt.Errorf("getting subscription %s/%s: %w", namespace, subscription.name, err)
		}
		if strings.Contains(subscriptionInstalledCSV(resource), subscription.name) {
			return resource, nil
		}
	}
	if len(accessErrors) > 0 {
		return nil, fmt.Errorf("getting operator subscription: %w", errors.Join(accessErrors...))
	}
	return nil, apierrors.NewNotFound(models.SubscriptionGVR.GroupResource(), subscription.name)
}

func (r *OperatorSubscriptionStatusRepository) selectedOperatorSubscription(ctx context.Context) (operatorSubscription, error) {
	dscs, err := r.saDynClient.Resource(models.DataScienceClusterGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		return operatorSubscription{}, fmt.Errorf("listing DataScienceClusters: %w", err)
	}

	releaseName := ""
	if len(dscs.Items) > 0 {
		releaseName, _, err = unstructured.NestedString(dscs.Items[0].Object, "status", "release", "name")
		if err != nil {
			return operatorSubscription{}, fmt.Errorf("reading DataScienceCluster release name: %w", err)
		}
	}

	if isRHOAIRelease(releaseName) {
		return operatorSubscriptions[0], nil
	}
	return operatorSubscriptions[1], nil
}

func isRHOAIRelease(releaseName string) bool {
	return releaseName == selfManagedRHOAIReleaseName || releaseName == managedRHOAIReleaseName
}

func subscriptionChannel(subscription *unstructured.Unstructured) string {
	channel, _, _ := unstructured.NestedString(subscription.Object, "spec", "channel")
	return channel
}

func subscriptionInstalledCSV(subscription *unstructured.Unstructured) string {
	installedCSV, _, _ := unstructured.NestedString(subscription.Object, "status", "installedCSV")
	return installedCSV
}

func subscriptionLastUpdated(subscription *unstructured.Unstructured) string {
	lastUpdated, _, _ := unstructured.NestedString(subscription.Object, "status", "lastUpdated")
	return lastUpdated
}
