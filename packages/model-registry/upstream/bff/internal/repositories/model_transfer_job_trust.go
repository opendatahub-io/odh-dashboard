package repositories

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"os"
	"strings"

	helper "github.com/kubeflow/hub/ui/bff/internal/helpers"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	asyncUploadTrustedCAVolumeName          = "trusted-ca-bundle"
	asyncUploadTrustedCAConfigMapName       = "odh-trusted-ca-bundle"
	asyncUploadTrustedCAConfigMapNamePrefix = "trusted-ca-bundle-"
	asyncUploadTrustedCAMountPath           = "/etc/pki/tls/custom"
	asyncUploadTrustedCAFileName            = "ca-bundle.crt"
	asyncUploadTrustedCAFilePath            = asyncUploadTrustedCAMountPath + "/" + asyncUploadTrustedCAFileName

	asyncUploadDestinationTrustedCAVolumeName = "destination-trusted-ca"
	asyncUploadDestinationCAConfigMapPrefix   = "destination-trusted-ca-"
	asyncUploadDestinationCAFileName          = "ca.crt"
	asyncUploadDestinationCAMountBasePath     = "/etc/containers/certs.d"

	asyncUploadRegistrySecureAnnot      = "modelregistry.kubeflow.org/registry-secure"
	asyncUploadTrustedCAConfigAnnot     = "modelregistry.kubeflow.org/trusted-ca-configmap"
	asyncUploadTrustedCAPathAnnot       = "modelregistry.kubeflow.org/trusted-ca-path"
	asyncUploadDestinationCAConfigAnnot = "modelregistry.kubeflow.org/destination-trusted-ca-configmap"
	asyncUploadDestinationCAPathAnnot   = "modelregistry.kubeflow.org/destination-trusted-ca-path"
)

const (
	asyncUploadOpenShiftServiceCAConfigMap    = "openshift-service-ca.crt"
	asyncUploadOpenShiftServiceCAConfigMapKey = "service-ca.crt"
	asyncUploadOpenShiftImageRegistryService  = "image-registry.openshift-image-registry.svc"
)

type asyncUploadResolvedTrust struct {
	modelRegistryCAMount       *asyncUploadResolvedCAMount
	destinationRegistryCAMount []asyncUploadResolvedCAMount
	managedConfigMaps          []string
}

type asyncUploadResolvedCAMount struct {
	configMapName       string
	volumeName          string
	mountPath           string
	fileName            string
	annotationConfigKey string
	annotationPathKey   string
	envVarName          string
}

func (m asyncUploadResolvedCAMount) filePath() string {
	return m.mountPath + "/" + m.fileName
}

func resolveAsyncUploadTrust(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	jobID string,
	isFederatedMode bool,
	modelRegistryAddress string,
	destinationRegistry string,
	bundlePaths []string,
) (asyncUploadResolvedTrust, error) {
	trust := asyncUploadResolvedTrust{}

	_, registrySecure := parseRegistryServerAddress(modelRegistryAddress)
	if registrySecure {
		modelRegistryTrust, managedConfigMaps, err := resolveAsyncUploadModelRegistryTrust(
			ctx,
			client,
			namespace,
			jobID,
			isFederatedMode,
			bundlePaths,
		)
		if err != nil {
			return trust, err
		}
		trust.modelRegistryCAMount = modelRegistryTrust
		trust.managedConfigMaps = append(trust.managedConfigMaps, managedConfigMaps...)
	}

	destinationTrusts, managedConfigMaps, err := resolveAsyncUploadDestinationRegistryTrust(
		ctx,
		client,
		namespace,
		jobID,
		destinationRegistry,
	)
	if err != nil {
		return trust, err
	}
	trust.destinationRegistryCAMount = append(trust.destinationRegistryCAMount, destinationTrusts...)
	trust.managedConfigMaps = append(trust.managedConfigMaps, managedConfigMaps...)

	return trust, nil
}

func resolveAsyncUploadModelRegistryTrust(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	jobID string,
	isFederatedMode bool,
	bundlePaths []string,
) (*asyncUploadResolvedCAMount, []string, error) {
	mount := &asyncUploadResolvedCAMount{
		configMapName:       asyncUploadTrustedCAConfigMapName,
		volumeName:          asyncUploadTrustedCAVolumeName,
		mountPath:           asyncUploadTrustedCAMountPath,
		fileName:            asyncUploadTrustedCAFileName,
		annotationConfigKey: asyncUploadTrustedCAConfigAnnot,
		annotationPathKey:   asyncUploadTrustedCAPathAnnot,
		envVarName:          "MODEL_SYNC_REGISTRY_CUSTOM_CA",
	}
	if !isFederatedMode {
		return mount, nil, nil
	}

	logger := helper.GetContextLogger(ctx)
	// Federated mode: reuse the same CA material the BFF already trusts for outbound TLS
	// (BUNDLE_PATHS / --bundle-paths). This avoids cross-namespace Secret reads that
	// regular users cannot perform.
	trustedCA := readLocalBundlePathsPEM(bundlePaths)
	if trustedCA == "" {
		logger.Warn(
			"no readable bundle-paths CA for federated registry, falling back to namespace CA bundle",
			"fallbackConfigMap", asyncUploadTrustedCAConfigMapName,
		)
		return mount, nil, nil
	}

	configMap, err := buildAsyncUploadGeneratedCAConfigMap(
		asyncUploadTrustedCAConfigMapNamePrefix,
		namespace,
		jobID,
		asyncUploadTrustedCAFileName,
		trustedCA,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to build model registry trusted CA configmap: %w", err)
	}

	configMapCreated, err := client.CreateConfigMap(ctx, namespace, configMap)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create model registry trusted CA configmap: %w", err)
	}
	if configMapCreated == nil || configMapCreated.Name == "" {
		return nil, nil, fmt.Errorf("unexpected Kubernetes API behavior: model registry trusted CA configmap was nil or unnamed")
	}

	logger.Info(
		"created model registry trusted CA configmap for async upload job from bundle-paths",
		"namespace", namespace,
		"name", configMapCreated.Name,
	)
	mount.configMapName = configMapCreated.Name
	return mount, []string{configMapCreated.Name}, nil
}

func readLocalBundlePathsPEM(bundlePaths []string) string {
	var parts []string
	for _, p := range bundlePaths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		pemBytes, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		trimmed := strings.TrimSpace(string(pemBytes))
		if trimmed == "" {
			continue
		}
		parts = append(parts, trimmed)
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, "\n")
}

func resolveAsyncUploadDestinationRegistryTrust(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	jobID string,
	destinationRegistry string,
) ([]asyncUploadResolvedCAMount, []string, error) {
	registryHost := normalizeRegistryHost(destinationRegistry)
	if registryHost == "" || !isKnownClusterServiceRegistry(registryHost) {
		return nil, nil, nil
	}

	logger := helper.GetContextLogger(ctx)
	serviceCAConfigMap, err := client.GetConfigMap(ctx, namespace, asyncUploadOpenShiftServiceCAConfigMap)
	if err != nil {
		logger.Warn(
			"failed to read platform service CA configmap, skipping destination registry trusted CA",
			"namespace", namespace,
			"configmap", asyncUploadOpenShiftServiceCAConfigMap,
			"error", err,
		)
		return nil, nil, nil
	}
	if serviceCAConfigMap == nil {
		return nil, nil, nil
	}

	serviceCA, found := serviceCAConfigMap.Data[asyncUploadOpenShiftServiceCAConfigMapKey]
	if !found || strings.TrimSpace(serviceCA) == "" {
		logger.Warn(
			"platform service CA configmap missing expected certificate data, skipping destination registry trusted CA",
			"namespace", namespace,
			"configmap", asyncUploadOpenShiftServiceCAConfigMap,
			"key", asyncUploadOpenShiftServiceCAConfigMapKey,
		)
		return nil, nil, nil
	}

	configMap, err := buildAsyncUploadGeneratedCAConfigMap(
		asyncUploadDestinationCAConfigMapPrefix,
		namespace,
		jobID,
		asyncUploadDestinationCAFileName,
		serviceCA,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to build destination registry trusted CA configmap: %w", err)
	}

	configMapCreated, err := client.CreateConfigMap(ctx, namespace, configMap)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create destination registry trusted CA configmap: %w", err)
	}
	if configMapCreated == nil || configMapCreated.Name == "" {
		return nil, nil, fmt.Errorf("unexpected Kubernetes API behavior: destination registry trusted CA configmap was nil or unnamed")
	}

	logger.Info(
		"created destination registry trusted CA configmap for async upload job",
		"namespace", namespace,
		"name", configMapCreated.Name,
		"registry", registryHost,
	)
	return []asyncUploadResolvedCAMount{{
		configMapName:       configMapCreated.Name,
		volumeName:          asyncUploadDestinationTrustedCAVolumeName,
		mountPath:           asyncUploadDestinationCAPath(registryHost),
		fileName:            asyncUploadDestinationCAFileName,
		annotationConfigKey: asyncUploadDestinationCAConfigAnnot,
		annotationPathKey:   asyncUploadDestinationCAPathAnnot,
	}}, []string{configMapCreated.Name}, nil
}

func buildAsyncUploadGeneratedCAConfigMap(generateNamePrefix, namespace, jobID, dataKey, trustedCA string) (*corev1.ConfigMap, error) {
	if strings.TrimSpace(trustedCA) == "" {
		return nil, fmt.Errorf("trusted CA content is empty")
	}

	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			GenerateName: generateNamePrefix,
			Namespace:    namespace,
			Labels: map[string]string{
				"modelregistry.kubeflow.org/job-type": "async-upload",
				"modelregistry.kubeflow.org/job-id":   jobID,
			},
		},
		Data: map[string]string{
			dataKey: trustedCA,
		},
	}, nil
}

func normalizeRegistryHost(registry string) string {
	registry = strings.TrimSpace(registry)
	if registry == "" {
		return ""
	}
	if strings.Contains(registry, "://") {
		u, err := url.Parse(registry)
		if err == nil && u.Host != "" {
			return u.Host
		}
	}
	parts := strings.Split(registry, "/")
	return parts[0]
}

func asyncUploadDestinationCAPath(registryHost string) string {
	return asyncUploadDestinationCAMountBasePath + "/" + registryHost
}

func isKnownClusterServiceRegistry(registryHost string) bool {
	registryHost = normalizeRegistryHost(registryHost)
	if registryHost == "" {
		return false
	}
	hostOnly := registryHost
	if host, _, err := net.SplitHostPort(registryHost); err == nil {
		hostOnly = host
	}
	return hostOnly == asyncUploadOpenShiftImageRegistryService ||
		hostOnly == asyncUploadOpenShiftImageRegistryService+".cluster.local"
}
