package controller

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"os"
	"path/filepath"
	"strings"

	routev1 "github.com/openshift/api/route/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

var ErrDashboardRouteNotReady = errors.New("dashboard route not yet ready")

func manifestSets(basePath string, platform cluster.Platform) []render.ManifestInfo {
	return []render.ManifestInfo{
		defaultManifestInfo(basePath, platform),
	}
}

func applyKustomizeParams(dashboard *v1alpha1.Dashboard, manifests []render.ManifestInfo, platform cluster.Platform) error {
	computed := computeKustomizeVariables(dashboard, platform)
	maps.Copy(computed, resolveImageParams())

	for _, m := range manifests {
		manifestPath := m.String()
		params := readExistingParams(manifestPath + "/params.env")
		maps.Copy(params, computed)
		if err := writeParamsEnv(manifestPath, params); err != nil {
			return fmt.Errorf("failed to write params.env to %s: %w", manifestPath, err)
		}
	}

	if len(manifests) > 0 {
		modArchPath := filepath.Join(manifests[0].Path, "modular-architecture")
		if _, err := os.Stat(modArchPath); os.IsNotExist(err) {
			return fmt.Errorf("modular-architecture directory not found at %s", modArchPath)
		}
		params := readExistingParams(modArchPath + "/params.env")
		maps.Copy(params, computed)
		if err := writeParamsEnv(modArchPath, params); err != nil {
			return fmt.Errorf("failed to write params.env to %s: %w", modArchPath, err)
		}
	}

	return nil
}

func extractDashboardURL(ctx context.Context, cli client.Client, dashboard *v1alpha1.Dashboard, namespace string, platform cluster.Platform) (string, error) {
	if platform == cluster.XKS {
		return "", nil
	}

	if dashboard.Spec.Gateway != nil && dashboard.Spec.Gateway.Domain != "" {
		return "https://" + dashboard.Spec.Gateway.Domain + "/", nil
	}

	rl := &routev1.RouteList{}
	if err := cli.List(ctx, rl,
		client.InNamespace(namespace),
		client.MatchingLabels{labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind)},
	); err != nil {
		return "", fmt.Errorf("failed to list routes: %w", err)
	}

	if len(rl.Items) == 1 && len(rl.Items[0].Status.Ingress) > 0 {
		ingress := rl.Items[0].Status.Ingress[0]

		admitted := false
		for _, cond := range ingress.Conditions {
			if cond.Type == routev1.RouteAdmitted && cond.Status == "True" {
				admitted = true

				break
			}
		}

		if admitted {
			if host := ingress.Host; host != "" {
				return "https://" + host, nil
			}
		}
	}

	return "", ErrDashboardRouteNotReady
}
