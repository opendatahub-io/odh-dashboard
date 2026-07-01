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
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

var (
	ErrDashboardRouteNotReady = errors.New("dashboard route not yet ready")
	ErrPersesCRDNotFound      = errors.New("PersesDashboard CRD not installed")
)

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

func deployObservabilityManifests(
	ctx context.Context,
	cli client.Client,
	dashboard *v1alpha1.Dashboard,
	basePath string,
	platform cluster.Platform,
) error {
	logger := log.FromContext(ctx)

	if dashboard.Spec.Observability == nil || !dashboard.Spec.Observability.Enabled {
		return nil
	}

	if dashboard.Spec.Observability.PersesService == nil {
		return nil
	}

	crd := &apiextensionsv1.CustomResourceDefinition{}
	if err := cli.Get(ctx, types.NamespacedName{Name: "persesdashboards.perses.dev"}, crd); err != nil {
		if k8serrors.IsNotFound(err) {
			return ErrPersesCRDNotFound
		}

		return fmt.Errorf("failed to check PersesDashboard CRD: %w", err)
	}

	obsNamespace := dashboard.Spec.Observability.PersesService.Namespace

	m := observabilityManifestInfo(basePath, platform)
	engine := kustomize.NewEngine()

	rendered, err := engine.Render(m.String(), kustomize.WithNamespace(obsNamespace))
	if err != nil {
		return fmt.Errorf("failed to render observability manifests from %s: %w", m, err)
	}

	logger.Info("Deploying observability manifests", "namespace", obsNamespace, "resources", len(rendered))

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner("dashboard-operator"),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
		deploy.WithApplyOrder(),
	)

	if err := deployer.Deploy(ctx, deploy.DeployInput{
		Client:    cli,
		Owner:     dashboard,
		Release:   deploy.ReleaseInfo{Type: string(platform)},
		Resources: rendered,
	}); err != nil {
		return fmt.Errorf("failed to deploy observability resources to %s: %w", obsNamespace, err)
	}

	return nil
}
