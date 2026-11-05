package controller

import (
	"context"
	"fmt"
	"strings"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const (
	modelRegistryConfigMapName        = "model-registry-ui-config"
	ociBaseImageParam                 = "images-oci-base-image"
	conditionModelRegistryConfigValid = "ModelRegistryConfigValid"
)

// reconcileModelRegistryUploadConfig keeps the upload ConfigMap in the core
// operand's lifecycle while isolating its validation from other resources.
// The rendered ConfigMap retains its other data, labels, and deployment metadata.
// Invalid OCI input preserves only the live OCI value, allowing other data to update.
// Validation is informational; only failures to reconcile the ConfigMap are returned.
func (r *DashboardReconciler) reconcileModelRegistryUploadConfig(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	resources []unstructured.Unstructured,
	cm *conditions.Manager,
) error {
	cm.ClearCondition(conditionModelRegistryConfigValid)
	if len(resources) == 0 {
		return nil
	}
	image := dashboard.Spec.ModelRegistryOCIBaseImage
	validationErr := validateOCIBaseImage(image)
	if validationErr != nil {
		cm.MarkFalse(conditionModelRegistryConfigValid,
			conditions.WithError(validationErr),
			conditions.WithReason("InvalidOCIBaseImage"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		image = ""
		live := &corev1.ConfigMap{}
		key := client.ObjectKey{Name: modelRegistryConfigMapName, Namespace: resources[0].GetNamespace()}
		if err := r.apiReader().Get(ctx, key, live); err == nil {
			image = live.Data[ociBaseImageParam]
		} else if !apierrors.IsNotFound(err) {
			return fmt.Errorf("reading Model Registry upload ConfigMap: %w", err)
		}
	}
	for i := range resources {
		if err := unstructured.SetNestedField(resources[i].Object, image, "data", ociBaseImageParam); err != nil {
			return fmt.Errorf("setting Model Registry OCI base image: %w", err)
		}
	}
	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner("dashboard-operator"),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
	)
	if err := deployer.Deploy(ctx, deploy.DeployInput{
		Client:    r.Client,
		Owner:     dashboard,
		Release:   deploy.ReleaseInfo{Type: string(r.Platform)},
		Resources: resources,
	}); err != nil {
		return fmt.Errorf("updating Model Registry upload ConfigMap: %w", err)
	}
	return nil
}
