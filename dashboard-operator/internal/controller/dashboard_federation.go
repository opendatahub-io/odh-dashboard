package controller

import (
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

type proxyRoute struct {
	Path        string
	PathRewrite string
}

var dashboardFederationSyntheticNames = []string{"coreBff", "perses", "mlflowEmbedded"}

// reservedDashboardFederationNames returns all names owned by Dashboard,
// including entries that are not emitted in the current reconciliation.
func reservedDashboardFederationNames() map[string]struct{} {
	reservedNames := make(map[string]struct{}, len(moduleRegistry)+len(dashboardFederationSyntheticNames))
	for name := range moduleRegistry {
		reservedNames[name] = struct{}{}
	}
	for _, name := range dashboardFederationSyntheticNames {
		reservedNames[name] = struct{}{}
	}
	return reservedNames
}

// proxyPathsFor returns the proxy routes for a module. If the module has
// explicit ProxyPaths set, those are returned. Otherwise the standard
// convention /<slug>/api → /api is used.
func proxyPathsFor(mod ModuleDefinition) []proxyRoute {
	if mod.ProxyPaths != nil {
		return mod.ProxyPaths
	}
	return []proxyRoute{{
		Path:        "/" + mod.ManifestSlug + "/api",
		PathRewrite: "/api",
	}}
}

// moduleFederationEntry converts a Dashboard-managed module into the runtime
// federation format. Its remote frontend and API proxies intentionally share
// the module service and connection policy.
func (r *DashboardReconciler) moduleFederationEntry(name string, mod ModuleDefinition) federationEntry {
	service := serviceRef{
		Name:      standaloneServiceName(r.Platform, mod.ManifestSlug),
		Namespace: r.ApplicationsNamespace,
		Port:      mod.Port,
	}
	target := explicitFederationTarget(true, mod.TLS, service)
	entry := federationEntry{
		Name: name,
		Backend: &federationBackend{
			RemoteEntry:      "/remoteEntry.js",
			federationTarget: target,
		},
	}
	for _, route := range proxyPathsFor(mod) {
		entry.ProxyService = append(entry.ProxyService, proxyServiceEntry{
			Path:             route.Path,
			PathRewrite:      route.PathRewrite,
			federationTarget: target,
		})
	}
	return entry
}

// dashboardFederationEntries builds all Dashboard-owned federation policy.
// Community entries are assembled independently from their installer-owned
// source ConfigMap.
func (r *DashboardReconciler) dashboardFederationEntries(
	statuses map[string]v1alpha1.ModuleStatus,
	dashboard *v1alpha1.Dashboard,
) []federationEntry {
	entries := make([]federationEntry, 0, len(moduleRegistry)+3)
	for name, mod := range moduleRegistry {
		if !modulePresent(statuses[name].Phase) {
			continue
		}
		entries = append(entries, r.moduleFederationEntry(name, mod))
	}

	entries = append(entries, r.coreBffFederationEntry())
	if entry, ok := r.persesFederationEntry(dashboard.Spec.Observability); ok {
		entries = append(entries, entry)
	}
	if entry, ok := r.mlflowEmbeddedFederationEntry(statuses); ok {
		entries = append(entries, entry)
	}
	return entries
}

// coreBffPort is the port core-bff listens on within the main dashboard pod/service.
const coreBffPort = 8943

func (r *DashboardReconciler) coreBffFederationEntry() federationEntry {
	return federationEntry{
		Name: "coreBff",
		ProxyService: []proxyServiceEntry{{
			Path:        "/core-bff/api",
			PathRewrite: "/api",
			federationTarget: explicitFederationTarget(true, true, serviceRef{
				Name:      mainDashboardServiceName(r.Platform),
				Namespace: r.ApplicationsNamespace,
				Port:      coreBffPort,
			}),
		}},
	}
}

func (r *DashboardReconciler) persesFederationEntry(observability *v1alpha1.ObservabilitySpec) (federationEntry, bool) {
	if observability == nil || !observability.Enabled || observability.PersesService == nil {
		return federationEntry{}, false
	}
	service := observability.PersesService
	return federationEntry{
		Name: "perses",
		ProxyService: []proxyServiceEntry{{
			Path:        "/perses/api",
			PathRewrite: "",
			federationTarget: explicitFederationTarget(true, false, serviceRef{
				Name:      service.Name,
				Namespace: service.Namespace,
				Port:      service.Port,
			}),
		}},
	}, true
}

func (r *DashboardReconciler) mlflowEmbeddedFederationEntry(statuses map[string]v1alpha1.ModuleStatus) (federationEntry, bool) {
	if !modulePresent(statuses["mlflow"].Phase) {
		return federationEntry{}, false
	}
	return federationEntry{
		Name: "mlflowEmbedded",
		Backend: &federationBackend{
			RemoteEntry: "/mlflow/static-files/federated/remoteEntry.js",
			federationTarget: explicitFederationTarget(true, true, serviceRef{
				Name:      "mlflow",
				Namespace: r.ApplicationsNamespace,
				Port:      8443,
			}),
		},
	}, true
}

// mainDashboardServiceName returns the platform-specific name of the main
// dashboard Service that exposes the core-bff port.
func mainDashboardServiceName(platform cluster.Platform) string {
	if platform == cluster.SelfManagedRhoai || platform == cluster.ManagedRhoai {
		return "rhods-dashboard"
	}
	return "odh-dashboard"
}
