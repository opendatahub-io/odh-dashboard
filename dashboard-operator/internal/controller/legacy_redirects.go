package controller

import (
	"bytes"
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"path/filepath"
	"strings"
	"text/template"

	routev1 "github.com/openshift/api/route/v1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/yaml"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const (
	dashboardRedirectName          = "dashboard-redirect"
	dashboardRedirectConfigMapName = "dashboard-redirect-config"
	legacyGatewayRouteName         = "data-science-gateway"
	dashboardRouteNameODH          = "odh-dashboard"
	dashboardRouteNameRHOAI        = "rhods-dashboard"
	defaultDashboardRedirectImage  = "registry.access.redhat.com/ubi9/nginx-126@sha256:f0a79ccf21b8780a7534d78ee0e49d1852654f5f0f52e17ebdbe185a71d93253"
)

var gatewayConfigGVK = schema.GroupVersionKind{
	Group: "services.platform.opendatahub.io", Version: "v1alpha1", Kind: "GatewayConfig",
}

//go:embed resources/dashboard-redirect-*.tmpl.yaml
var dashboardRedirectTemplates embed.FS

type dashboardRedirectTemplateData struct {
	Name                string
	ConfigMapName       string
	Namespace           string
	GatewayHostname     string
	GatewayHostnameHTML string
	LegacyRouteName     string
	LegacyHostname      string
	DashboardRouteName  string
	ProductName         string
	Image               string
	ConfigHash          string
}

// directReaderClient keeps writes on the manager client while bypassing its
// label-scoped cache for reads. Pre-handoff resources still carry the Gateway
// controller's part-of label, so they are intentionally absent from the
// Dashboard cache until this reconciliation adopts and relabels them.
type directReaderClient struct {
	client.Client
	reader client.Reader
}

func (c directReaderClient) Get(
	ctx context.Context,
	key client.ObjectKey,
	object client.Object,
	options ...client.GetOption,
) error {
	return c.reader.Get(ctx, key, object, options...)
}

func (c directReaderClient) List(
	ctx context.Context,
	list client.ObjectList,
	options ...client.ListOption,
) error {
	return c.reader.List(ctx, list, options...)
}

func (r *DashboardReconciler) legacyRedirectClient() client.Client {
	return directReaderClient{Client: r.Client, reader: r.apiReader()}
}

func (r *DashboardReconciler) reconcileLegacyRedirects(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	redirects := dashboard.Spec.LegacyRedirects
	if redirects == nil {
		// An absent field is the pre-handoff compatibility state. The platform
		// Gateway controller may still own and reconcile these resources.
		return nil
	}

	if dashboard.Spec.ManagementState == common.Removed ||
		redirects.ManagementState == common.Removed ||
		!r.RouteAPIAvailable {
		return r.cleanupLegacyRedirects(ctx)
	}

	if dashboard.Spec.Gateway == nil || strings.TrimSpace(dashboard.Spec.Gateway.Domain) == "" {
		return errors.New("spec.gateway.domain is required when legacy redirects are Managed")
	}

	legacyHostname, err := r.resolveLegacyGatewayHostname(ctx, dashboard.Spec.Gateway.Domain, redirects.LegacyHostname)
	if err != nil {
		return err
	}
	data, err := r.dashboardRedirectData(dashboard.Spec.Gateway.Domain, legacyHostname)
	if err != nil {
		return err
	}

	resources, err := renderDashboardRedirectResources(data)
	if err != nil {
		return err
	}

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner("dashboard-operator-redirects"),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
		deploy.WithApplyOrder(),
		deploy.WithMergeStrategy(deploymentGVK, deploy.MergeDeployments),
		deploy.WithLegacyOwners(gatewayConfigGVK),
	)
	if err := deployer.Deploy(ctx, deploy.DeployInput{
		Client:    r.legacyRedirectClient(),
		Owner:     dashboard,
		Release:   deploy.ReleaseInfo{Type: string(r.Platform)},
		Resources: resources,
	}); err != nil {
		return fmt.Errorf("deploying legacy dashboard redirects: %w", err)
	}

	// When the current gateway already uses the legacy hostname, the second
	// Route is unnecessary. Explicit deletion handles transitions from a custom
	// gateway hostname to the legacy hostname.
	if data.LegacyHostname == "" {
		route := &routev1.Route{}
		route.Name = legacyGatewayRouteName
		route.Namespace = r.ApplicationsNamespace
		if err := r.deleteOwnedLegacyRedirect(ctx, route); err != nil {
			return fmt.Errorf("deleting redundant legacy gateway Route: %w", err)
		}
	}

	return nil
}

func (r *DashboardReconciler) dashboardRedirectData(gatewayHostname, legacyHostname string) (dashboardRedirectTemplateData, error) {
	gatewayHostname = strings.TrimSpace(gatewayHostname)
	legacyHostname = strings.TrimSpace(legacyHostname)

	productName := "Open Data Hub"
	dashboardRouteName := dashboardRouteNameODH
	if r.Platform == cluster.SelfManagedRhoai || r.Platform == cluster.ManagedRhoai {
		productName = "OpenShift AI"
		dashboardRouteName = dashboardRouteNameRHOAI
	}

	data := dashboardRedirectTemplateData{
		Name:                dashboardRedirectName,
		ConfigMapName:       dashboardRedirectConfigMapName,
		Namespace:           r.ApplicationsNamespace,
		GatewayHostname:     gatewayHostname,
		GatewayHostnameHTML: html.EscapeString(gatewayHostname),
		LegacyRouteName:     legacyGatewayRouteName,
		LegacyHostname:      legacyHostname,
		DashboardRouteName:  dashboardRouteName,
		ProductName:         productName,
		Image:               r.dashboardRedirectImage(),
	}

	config, err := renderDashboardRedirectTemplate("resources/dashboard-redirect-configmap.tmpl.yaml", data)
	if err != nil {
		return dashboardRedirectTemplateData{}, fmt.Errorf("rendering redirect ConfigMap for hash: %w", err)
	}
	configMap := &corev1.ConfigMap{}
	if err := yaml.Unmarshal(config, configMap); err != nil {
		return dashboardRedirectTemplateData{}, fmt.Errorf("decoding redirect ConfigMap for hash: %w", err)
	}
	data.ConfigHash = dashboardRedirectConfigHash(configMap.Data)

	return data, nil
}

func (r *DashboardReconciler) dashboardRedirectImage() string {
	if image := strings.TrimSpace(resolveImageParams()["nginx-126-image"]); image != "" {
		return image
	}

	manifest := openShiftManifestInfo(r.ManifestsBasePath, r.Platform)
	if image := strings.TrimSpace(readExistingParams(filepath.Join(manifest.String(), "params.env"))["nginx-126-image"]); image != "" {
		return image
	}

	return defaultDashboardRedirectImage
}

func dashboardRedirectConfigHash(data map[string]string) string {
	hash := sha256.New()
	for _, key := range []string{"nginx.conf", "redirect.conf", "deprecation.html"} {
		_, _ = hash.Write([]byte(key))
		_, _ = hash.Write([]byte{0})
		_, _ = hash.Write([]byte(data[key]))
		_, _ = hash.Write([]byte{0})
	}
	return hex.EncodeToString(hash.Sum(nil))
}

func (r *DashboardReconciler) resolveLegacyGatewayHostname(
	ctx context.Context,
	gatewayHostname string,
	configuredHostname string,
) (string, error) {
	subdomain, suffix, ok := strings.Cut(strings.TrimSpace(gatewayHostname), ".")
	if !ok || subdomain == "" || suffix == "" {
		return "", fmt.Errorf("gateway hostname %q must contain a subdomain", gatewayHostname)
	}
	if subdomain == legacyGatewayRouteName {
		return "", nil
	}

	route := &routev1.Route{}
	key := client.ObjectKey{Name: legacyGatewayRouteName, Namespace: r.ApplicationsNamespace}
	if err := r.apiReader().Get(ctx, key, route); err != nil {
		if !apierrors.IsNotFound(err) {
			return "", fmt.Errorf("reading legacy gateway Route hostname: %w", err)
		}
	} else {
		if !isOwnedLegacyRedirect(route) {
			return "", fmt.Errorf("legacy gateway Route %s/%s has unrecognized ownership", route.Namespace, route.Name)
		}
		// Preserve the actual pre-handoff endpoint during adoption. It can have a
		// different DNS suffix from both the current gateway and the projected
		// fallback value.
		if hostname := strings.TrimSpace(route.Spec.Host); hostname != "" {
			return hostname, nil
		}
	}

	if configuredHostname = strings.TrimSpace(configuredHostname); configuredHostname == "" {
		return "", errors.New("spec.legacyRedirects.legacyHostname is required when legacy redirects are Managed and the gateway does not use the legacy hostname")
	}
	return configuredHostname, nil
}

func renderDashboardRedirectResources(data dashboardRedirectTemplateData) ([]unstructured.Unstructured, error) {
	paths := []string{
		"resources/dashboard-redirect-configmap.tmpl.yaml",
		"resources/dashboard-redirect-service.tmpl.yaml",
		"resources/dashboard-redirect-deployment.tmpl.yaml",
		"resources/dashboard-redirect-dashboard-route.tmpl.yaml",
	}
	if data.LegacyHostname != "" {
		paths = append(paths, "resources/dashboard-redirect-legacy-gateway-route.tmpl.yaml")
	}

	resources := make([]unstructured.Unstructured, 0, len(paths))
	for _, path := range paths {
		rendered, err := renderDashboardRedirectTemplate(path, data)
		if err != nil {
			return nil, fmt.Errorf("rendering %s: %w", path, err)
		}
		jsonData, err := yaml.YAMLToJSON(rendered)
		if err != nil {
			return nil, fmt.Errorf("converting %s to JSON: %w", path, err)
		}
		var object map[string]any
		if err := json.Unmarshal(jsonData, &object); err != nil {
			return nil, fmt.Errorf("decoding %s: %w", path, err)
		}
		resources = append(resources, unstructured.Unstructured{Object: object})
	}

	return resources, nil
}

func renderDashboardRedirectTemplate(path string, data dashboardRedirectTemplateData) ([]byte, error) {
	tmpl, err := template.ParseFS(dashboardRedirectTemplates, path)
	if err != nil {
		return nil, err
	}
	var rendered bytes.Buffer
	if err := tmpl.Execute(&rendered, data); err != nil {
		return nil, err
	}
	return rendered.Bytes(), nil
}

func (r *DashboardReconciler) cleanupLegacyRedirects(ctx context.Context) error {
	namespaced := []client.Object{
		&appsv1.Deployment{},
		&corev1.Service{},
		&corev1.ConfigMap{},
	}
	names := []string{dashboardRedirectName, dashboardRedirectName, dashboardRedirectConfigMapName}
	var errs []error
	for i, object := range namespaced {
		object.SetName(names[i])
		object.SetNamespace(r.ApplicationsNamespace)
		if err := r.deleteOwnedLegacyRedirect(ctx, object); err != nil {
			errs = append(errs, fmt.Errorf("deleting %T %s: %w", object, names[i], err))
		}
	}

	if r.RouteAPIAvailable {
		for _, name := range []string{dashboardRouteNameODH, dashboardRouteNameRHOAI, legacyGatewayRouteName} {
			route := &routev1.Route{}
			route.Name = name
			route.Namespace = r.ApplicationsNamespace
			if err := r.deleteOwnedLegacyRedirect(ctx, route); err != nil {
				errs = append(errs, fmt.Errorf("deleting Route %s: %w", name, err))
			}
		}
	}

	if len(errs) == 0 {
		log.FromContext(ctx).Info("Reconciled legacy dashboard redirect cleanup")
	}
	return errors.Join(errs...)
}

func (r *DashboardReconciler) deleteOwnedLegacyRedirect(ctx context.Context, object client.Object) error {
	if err := r.apiReader().Get(ctx, client.ObjectKeyFromObject(object), object); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		return err
	}

	if !isOwnedLegacyRedirect(object) {
		log.FromContext(ctx).Info("Preserving legacy dashboard redirect without recognized ownership",
			"kind", object.GetObjectKind().GroupVersionKind().Kind,
			"namespace", object.GetNamespace(),
			"name", object.GetName())
		return nil
	}

	uid := object.GetUID()
	return client.IgnoreNotFound(r.Delete(ctx, object, client.Preconditions{UID: &uid}))
}

func isOwnedLegacyRedirect(object client.Object) bool {
	if owner := metav1.GetControllerOf(object); owner != nil &&
		(owner.Kind == v1alpha1.DashboardKind || owner.Kind == gatewayConfigGVK.Kind) {
		return true
	}

	return object.GetLabels()[labels.PlatformPartOf] == strings.ToLower(v1alpha1.DashboardKind)
}
