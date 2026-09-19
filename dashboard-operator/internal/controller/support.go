package controller

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

var sectionTitle = map[cluster.Platform]string{
	cluster.SelfManagedRhoai: "OpenShift Self Managed Services",
	cluster.ManagedRhoai:     "OpenShift Managed Services",
	cluster.OpenDataHub:      "OpenShift Open Data Hub",
}

var platformPaths = map[cluster.Platform]string{
	cluster.SelfManagedRhoai: "/rhoai",
	cluster.ManagedRhoai:     "/not-supported",
	cluster.OpenDataHub:      "/odh",
}

var imagesMap = map[string]string{
	"odh-dashboard-image":            "RELATED_IMAGE_ODH_DASHBOARD_IMAGE",
	"kube-rbac-proxy":                "RELATED_IMAGE_ODH_KUBE_RBAC_PROXY_IMAGE",
	"images-jobs-async-upload":       "RELATED_IMAGE_ODH_MODEL_REGISTRY_JOB_ASYNC_UPLOAD_IMAGE",
	"automl-pipeline-runtime-image":  "RELATED_IMAGE_ODH_AUTOML_IMAGE",
	"autorag-pipeline-runtime-image": "RELATED_IMAGE_ODH_AUTORAG_IMAGE",
	"core-bff-image":                 "RELATED_IMAGE_ODH_CORE_BFF_IMAGE",
}

func init() {
	for _, mod := range moduleRegistry {
		paramKey := mod.ManifestSlug + "-ui-image"
		imagesMap[paramKey] = mod.ImageEnvVar
	}
}

func defaultManifestInfo(basePath string, platform cluster.Platform) render.ManifestInfo {
	sourcePath, ok := platformPaths[platform]
	if !ok {
		sourcePath = platformPaths[cluster.OpenDataHub]
	}

	return render.ManifestInfo{
		Path:       basePath,
		ContextDir: "",
		SourcePath: sourcePath,
	}
}

func observabilityManifestInfo(basePath string, platform cluster.Platform) render.ManifestInfo {
	sourcePath, ok := platformPaths[platform]
	if !ok {
		sourcePath = platformPaths[cluster.OpenDataHub]
	}

	return render.ManifestInfo{
		Path:       basePath,
		ContextDir: "observability",
		SourcePath: sourcePath,
	}
}

func computeKustomizeVariables(dashboard *v1alpha1.Dashboard, platform cluster.Platform) map[string]string {
	params := map[string]string{}

	title, ok := sectionTitle[platform]
	if ok {
		params["section-title"] = title
	}

	if dashboard.Spec.Gateway != nil && dashboard.Spec.Gateway.Domain != "" {
		params["gateway-domain"] = dashboard.Spec.Gateway.Domain
		params["dashboard-url"] = fmt.Sprintf("https://%s/", dashboard.Spec.Gateway.Domain)
	}

	return params
}

func readExistingParams(path string) map[string]string {
	params := map[string]string{}
	data, err := os.ReadFile(path)
	if err != nil {
		return params
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if k, v, ok := strings.Cut(line, "="); ok {
			params[k] = v
		}
	}
	return params
}

func resolveImageParams() map[string]string {
	params := map[string]string{}
	for paramKey, envVar := range imagesMap {
		if value := os.Getenv(envVar); value != "" {
			params[paramKey] = value
		}
	}
	return params
}

func writeParamsEnv(manifestPath string, params map[string]string) error {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var sb strings.Builder
	for _, k := range keys {
		sb.WriteString(k)
		sb.WriteString("=")
		sb.WriteString(params[k])
		sb.WriteString("\n")
	}
	return os.WriteFile(filepath.Join(manifestPath, "params.env"), []byte(sb.String()), 0600)
}
