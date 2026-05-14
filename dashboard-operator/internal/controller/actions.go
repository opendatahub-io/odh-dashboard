package controller

import (
	"context"
	"fmt"
	"strings"
	"time"

	routev1 "github.com/openshift/api/route/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const conditionTypeReady = "Ready"

func manifestSets(basePath string, platform cluster.Platform) []render.ManifestInfo {
	return []render.ManifestInfo{
		defaultManifestInfo(basePath, platform),
	}
}

func applyKustomizeParams(dashboard *v1alpha1.Dashboard, manifests []render.ManifestInfo, platform cluster.Platform) error {
	params := computeKustomizeVariables(dashboard, platform)
	for k, v := range resolveImageParams() {
		params[k] = v
	}

	for _, m := range manifests {
		if err := writeParamsEnv(m.String(), params); err != nil {
			return fmt.Errorf("failed to write params.env to %s: %w", m.String(), err)
		}
	}

	return nil
}

func extractDashboardURL(ctx context.Context, cli client.Client, namespace string) (string, error) {
	rl := &routev1.RouteList{}
	if err := cli.List(ctx, rl,
		client.InNamespace(namespace),
		client.MatchingLabels{labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind)},
	); err != nil {
		return "", fmt.Errorf("failed to list routes: %w", err)
	}

	if len(rl.Items) == 1 && len(rl.Items[0].Status.Ingress) > 0 {
		if host := rl.Items[0].Status.Ingress[0].Host; host != "" {
			return "https://" + host, nil
		}
	}

	return "", nil
}

func setReadyCondition(dashboard *v1alpha1.Dashboard, status metav1.ConditionStatus, reason, message string) {
	now := metav1.NewTime(time.Now())
	conditions := dashboard.GetConditions()

	for i := range conditions {
		if conditions[i].Type == conditionTypeReady {
			if conditions[i].Status != status {
				conditions[i].LastTransitionTime = now
			}
			conditions[i].Status = status
			conditions[i].Reason = reason
			conditions[i].Message = message
			dashboard.SetConditions(conditions)

			return
		}
	}

	dashboard.SetConditions(append(conditions, common.Condition{
		Type:               conditionTypeReady,
		Status:             status,
		LastTransitionTime: now,
		Reason:             reason,
		Message:            message,
	}))
}
