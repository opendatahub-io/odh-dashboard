package controller

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"

	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

var (
	ErrMaasConsumerPortalDisabled       = errors.New("maas consumer portal is not enabled")
	ErrMaasConsumerPortalDomainRequired = errors.New("maas consumer portal is enabled but gateway domain is not set")
)

// maasConsumerPortalConsoleLinkName is the fixed name of the MaaS Consumer Portal
// ConsoleLink CR managed by the operator.
const maasConsumerPortalConsoleLinkName = "maas-consumer-portal-link"

// maasConsumerPortalPartOf is the platform.opendatahub.io/part-of label value
// applied to maas consumer portal resources. It is deliberately distinct from the
// core dashboard's value so the portal is an independent operand: the core
// dashboard teardown (which selects part-of=dashboard) never matches portal
// resources, and the portal is reconciled and removed solely by
// reconcileMaasConsumerPortalConsoleLink — independent of the core dashboard's
// managementState.
const maasConsumerPortalPartOf = "maas-consumer-portal"

// maasConsumerPortalHostPrefix is prepended to Gateway.Domain to derive the
// MaaS Consumer Portal host (e.g. maas-consumer-portal.<domain>).
const maasConsumerPortalHostPrefix = "maas-consumer-portal"

// maasConsumerPortalConsoleLinkManifestInfo points at the portal ConsoleLink
// bundle. It always uses the /rhoai source: the portal is an RHOAI feature
// and deploys on both self-managed and managed RHOAI when enabled, so it is
// intentionally not gated by the platformPaths /not-supported overlay.
func maasConsumerPortalConsoleLinkManifestInfo(basePath string) render.ManifestInfo {
	return render.ManifestInfo{
		Path:       basePath,
		ContextDir: "maas-consumer-portal-consolelink",
		SourcePath: "/rhoai",
	}
}

// maasConsumerPortalURL derives the portal URL from the gateway domain. The
// second return value is false when the domain is empty, meaning the URL
// cannot be derived and the ConsoleLink must not be deployed.
func maasConsumerPortalURL(domain string) (string, bool) {
	if domain == "" {
		return "", false
	}

	return fmt.Sprintf("https://%s.%s/", maasConsumerPortalHostPrefix, domain), true
}

// reconcileMaasConsumerPortalConsoleLink deploys or removes the MaaS Consumer
// Portal ConsoleLink based on spec.maasConsumerPortal, and reports the outcome via
// the MaasConsumerPortalAvailable condition. All False states use Info severity so the
// portal never affects the Ready rollup.
func (r *DashboardReconciler) reconcileMaasConsumerPortalConsoleLink(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
) {
	logger := log.FromContext(ctx)

	switch maasConsumerPortalErr := deployMaasConsumerPortalConsoleLink(ctx, r.Client, dashboard, r.ManifestsBasePath, r.Platform); {
	case maasConsumerPortalErr == nil:
		cm.MarkTrue(conditionMaasConsumerPortalAvailable,
			conditions.WithReason("Deployed"),
			conditions.WithMessage("MaaS Consumer Portal ConsoleLink applied successfully"))
	case errors.Is(maasConsumerPortalErr, ErrMaasConsumerPortalDisabled):
		// Explicitly remove the ConsoleLink when the portal is disabled — the
		// SSA deployer is additive and does not prune. Benign cases (absent
		// object, ConsoleLink CRD not installed) are already treated as success
		// inside deleteMaasConsumerPortalConsoleLink, so a non-nil error here is a
		// genuine failure: surface it on the condition (Info severity, like the
		// deploy-failed branch) rather than falsely reporting a clean Disabled
		// state while a stale ConsoleLink lingers.
		if delErr := deleteMaasConsumerPortalConsoleLink(ctx, r.Client); delErr != nil {
			logger.Error(delErr, "Failed to delete maas consumer portal ConsoleLink")
			cm.MarkFalse(conditionMaasConsumerPortalAvailable,
				conditions.WithReason("MaasConsumerPortalDeleteFailed"),
				conditions.WithMessage("failed to delete maas consumer portal ConsoleLink: %s", delErr.Error()),
				conditions.WithSeverity(common.ConditionSeverityInfo))
		} else {
			cm.MarkFalse(conditionMaasConsumerPortalAvailable,
				conditions.WithReason("Disabled"),
				conditions.WithMessage("MaaS Consumer Portal is not enabled"),
				conditions.WithSeverity(common.ConditionSeverityInfo))
		}
	case errors.Is(maasConsumerPortalErr, ErrMaasConsumerPortalDomainRequired):
		cm.MarkFalse(conditionMaasConsumerPortalAvailable,
			conditions.WithReason("MaasConsumerPortalDomainRequired"),
			conditions.WithMessage("MaaS Consumer Portal is enabled but gateway domain is not set"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		logger.Info("MaaS Consumer Portal enabled but gateway domain not set, skipping ConsoleLink")
	default:
		cm.MarkFalse(conditionMaasConsumerPortalAvailable,
			conditions.WithReason("MaasConsumerPortalDeployFailed"),
			conditions.WithMessage("MaaS Consumer Portal ConsoleLink reconciliation failed: %s", maasConsumerPortalErr),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		logger.Error(maasConsumerPortalErr, "Failed to deploy maas consumer portal ConsoleLink")
	}
}

// deployMaasConsumerPortalConsoleLink renders and applies the MaaS Consumer Portal
// ConsoleLink. It returns ErrMaasConsumerPortalDisabled when the portal is not
// enabled and ErrMaasConsumerPortalDomainRequired when the gateway domain (from
// which the portal host is derived) is not set. The cluster-scoped ConsoleLink
// is owned by the Dashboard CR so it is garbage-collected on CR deletion.
func deployMaasConsumerPortalConsoleLink(
	ctx context.Context,
	cli client.Client,
	dashboard *v1alpha1.Dashboard,
	basePath string,
	platform cluster.Platform,
) error {
	logger := log.FromContext(ctx)

	if dashboard.Spec.MaasConsumerPortal == nil || dashboard.Spec.MaasConsumerPortal.ManagementState != "Managed" {
		return ErrMaasConsumerPortalDisabled
	}

	domain := ""
	if dashboard.Spec.Gateway != nil {
		domain = dashboard.Spec.Gateway.Domain
	}

	maasConsumerPortalURLValue, ok := maasConsumerPortalURL(domain)
	if !ok {
		return ErrMaasConsumerPortalDomainRequired
	}

	// RHOAI-only feature; warn if enabled on ODH so the misconfig is visible.
	if platform == cluster.OpenDataHub {
		logger.Info("MaaS Consumer Portal ConsoleLink is an RHOAI-only feature; deploying it on Open Data Hub will use RHOAI branding")
	}

	m := maasConsumerPortalConsoleLinkManifestInfo(basePath)

	// Inject the derived portal URL and the platform's section title into the
	// portal manifest's own params.env before rendering.
	manifestPath := m.String()
	params := readExistingParams(filepath.Join(manifestPath, "params.env"))
	params["maas-consumer-portal-url"] = maasConsumerPortalURLValue
	if title, titleOK := sectionTitle[platform]; titleOK {
		params["section-title"] = title
	}
	if err := writeParamsEnv(manifestPath, params); err != nil {
		return fmt.Errorf("failed to write maas consumer portal params.env to %s: %w", manifestPath, err)
	}

	engine := kustomize.NewEngine()

	rendered, err := engine.Render(m.String(), kustomize.WithNamespace(dashboard.Namespace))
	if err != nil {
		return fmt.Errorf("failed to render maas consumer portal manifests from %s: %w", m, err)
	}

	// Deploy only the ConsoleLink. The kustomize configMapGenerator produces a
	// params ConfigMap used purely for replacements; deploying it would leave an
	// orphan when the portal is disabled, so it is filtered out here to keep
	// deploy/delete symmetric.
	resources := make([]unstructured.Unstructured, 0, len(rendered))
	for i := range rendered {
		if rendered[i].GetKind() == "ConsoleLink" {
			resources = append(resources, rendered[i])
		}
	}

	logger.Info("Deploying maas consumer portal ConsoleLink", "url", maasConsumerPortalURLValue, "resources", len(resources))

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner("dashboard-operator"),
		deploy.WithLabel(labels.PlatformPartOf, maasConsumerPortalPartOf),
		deploy.WithApplyOrder(),
	)

	if err := deployer.Deploy(ctx, deploy.DeployInput{
		Client:    cli,
		Owner:     dashboard,
		Release:   deploy.ReleaseInfo{Type: string(platform)},
		Resources: resources,
	}); err != nil {
		return fmt.Errorf("failed to deploy maas consumer portal ConsoleLink: %w", err)
	}

	return nil
}

// deleteMaasConsumerPortalConsoleLink removes the portal ConsoleLink by name. It is
// a no-op when the ConsoleLink CRD is not installed or the object is absent.
func deleteMaasConsumerPortalConsoleLink(ctx context.Context, cli client.Client) error {
	logger := log.FromContext(ctx)

	cl := &unstructured.Unstructured{}
	cl.SetGroupVersionKind(consoleLinkGVK)
	cl.SetName(maasConsumerPortalConsoleLinkName)

	logger.Info("Deleting maas consumer portal ConsoleLink", "name", maasConsumerPortalConsoleLinkName)
	if err := cli.Delete(ctx, cl); client.IgnoreNotFound(err) != nil {
		if meta.IsNoMatchError(err) {
			return nil
		}

		return fmt.Errorf("deleting ConsoleLink %s: %w", maasConsumerPortalConsoleLinkName, err)
	}

	return nil
}
