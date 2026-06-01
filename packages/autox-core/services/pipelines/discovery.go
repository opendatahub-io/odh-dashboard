package pipelines

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// DiscoverReadyDSPA discovers a ready DSPipelineApplication in the namespace and returns
// the full discovered DSPA info: API server URL and object storage configuration.
// Results are cached per namespace with the standard cache TTL.
//
// Object storage extraction handles two cases:
//   - External storage: spec.objectStorage.externalStorage with S3-compatible credentials
//   - Managed MinIO: spec.objectStorage.minio.deploy=true with conventional naming
func (s *Service) DiscoverReadyDSPA(ctx context.Context, namespace string) (*DiscoveredDSPA, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Debug("discovering ready DSPA", "namespace", namespace)

	if cached, ok := s.dspaCache.get(namespace); ok {
		logger.Debug("using cached DSPA", "namespace", namespace, "url", cached.APIServerURL)
		return cached, nil
	}

	// DSPA CRD has multiple API versions across ODH/RHOAI releases; try newest first.
	dspaGVR, err := s.K8sService.DiscoverResourceGVR(
		ctx,
		"datasciencepipelinesapplications.opendatahub.io",
		"datasciencepipelinesapplications",
		namespace,
		[]string{"v1", "v1beta1", "v1alpha1"},
	)
	if err != nil {
		s.Logger.Error("failed to discover DSPA GVR", "namespace", namespace, "error", err)
		return nil, fmt.Errorf("failed to discover DSPA GVR in namespace %s: %w", namespace, err)
	}

	dspas, err := s.K8sService.ListResources(ctx, dspaGVR, namespace)
	if err != nil {
		s.Logger.Error("failed to list DSPAs", "namespace", namespace, "error", err)
		return nil, fmt.Errorf("failed to list DSPAs in namespace %s: %w", namespace, err)
	}

	for _, dspa := range dspas.Items {
		conditions, found, err := unstructured.NestedSlice(dspa.Object, "status", "conditions")
		if err != nil || !found {
			continue
		}

		isReady := false
		for _, cond := range conditions {
			condMap, ok := cond.(map[string]any)
			if !ok {
				continue
			}
			if condMap["type"] == "Ready" && condMap["status"] == "True" {
				isReady = true
				break
			}
		}

		if !isReady {
			continue
		}

		components, found, err := unstructured.NestedMap(dspa.Object, "status", "components")
		if err != nil || !found {
			continue
		}

		apiServer, found, err := unstructured.NestedMap(components, "apiServer")
		if err != nil || !found {
			continue
		}

		baseURL, found, err := unstructured.NestedString(apiServer, "url")
		if err != nil || !found || baseURL == "" {
			continue
		}

		if err := validateDSPAURL(baseURL); err != nil {
			logger.Warn("skipping DSPA with invalid URL", "name", dspa.GetName(), "url", baseURL, "error", err)
			continue
		}

		dspaName := dspa.GetName()
		logger.Info("found ready DSPA", "name", dspaName, "namespace", namespace)

		result := &DiscoveredDSPA{
			Name:          dspaName,
			Namespace:     namespace,
			APIServerURL:  baseURL,
			ObjectStorage: extractObjectStorageSpec(dspa.Object, dspaName, namespace),
		}

		s.dspaCache.set(namespace, result)
		return result, nil
	}

	return nil, fmt.Errorf("no ready DSPA found in namespace %s", namespace)
}

// extractObjectStorageSpec extracts the S3-compatible object storage configuration
// from a DSPA custom resource's spec. Returns nil if no storage is configured.
//
// Priority: external storage takes precedence over managed MinIO when both are present.
func extractObjectStorageSpec(obj map[string]any, dspaName, namespace string) *DSPAObjectStorageSpec {
	// Check external storage first (takes precedence over managed MinIO).
	extStorage, found, _ := unstructured.NestedMap(obj, "spec", "objectStorage", "externalStorage")
	if found && len(extStorage) > 0 {
		if spec := extractExternalStorageSpec(extStorage); spec != nil {
			return spec
		}
	}

	// Fall back to managed MinIO. The DSPA operator only writes a minio section when
	// MinIO is managed — presence of the section is sufficient. We only skip if deploy
	// is explicitly false, since the field may be absent when defaulting to true.
	minioMap, found, _ := unstructured.NestedMap(obj, "spec", "objectStorage", "minio")
	if found && len(minioMap) > 0 {
		deploy, deployFound, _ := unstructured.NestedBool(minioMap, "deploy")
		if !deployFound || deploy {
			return buildManagedMinIOSpec(dspaName, namespace, minioMap)
		}
	}

	return nil
}

// extractExternalStorageSpec builds DSPAObjectStorageSpec from the externalStorage map.
// Tries multiple field name variants for the credential secret to handle different DSPA versions.
func extractExternalStorageSpec(ext map[string]any) *DSPAObjectStorageSpec {
	// The credential secret field is "s3CredentialSecret" in the CRD YAML but some
	// versions or tools may use "s3CredentialsSecret" (with trailing 's'). Try both.
	var cred map[string]any
	for _, credField := range []string{"s3CredentialSecret", "s3CredentialsSecret"} {
		if c, found, _ := unstructured.NestedMap(ext, credField); found {
			cred = c
			break
		}
	}

	// The secret name field is "secretName" in the CRD but may be "name" in older versions.
	var secretName string
	for _, nameField := range []string{"secretName", "name"} {
		if v, _, _ := unstructured.NestedString(cred, nameField); v != "" {
			secretName = v
			break
		}
	}
	if secretName == "" {
		return nil
	}

	accessKeyField, _, _ := unstructured.NestedString(cred, "accessKey")
	if accessKeyField == "" {
		accessKeyField = "AWS_ACCESS_KEY_ID"
	}
	secretKeyField, _, _ := unstructured.NestedString(cred, "secretKey")
	if secretKeyField == "" {
		secretKeyField = "AWS_SECRET_ACCESS_KEY"
	}

	// Construct endpoint URL from scheme + host + optional port.
	scheme, _, _ := unstructured.NestedString(ext, "scheme")
	host, _, _ := unstructured.NestedString(ext, "host")
	port, _, _ := unstructured.NestedString(ext, "port")

	var endpointURL string
	if host != "" {
		if scheme == "" {
			scheme = "https"
		}
		if port != "" && port != "443" && port != "80" {
			endpointURL = fmt.Sprintf("%s://%s:%s", scheme, host, port)
		} else {
			endpointURL = fmt.Sprintf("%s://%s", scheme, host)
		}
	}

	bucket, _, _ := unstructured.NestedString(ext, "bucket")
	region, _, _ := unstructured.NestedString(ext, "region")
	if region == "" {
		region = "us-east-1"
	}

	return &DSPAObjectStorageSpec{
		SecretName:     secretName,
		AccessKeyField: accessKeyField,
		SecretKeyField: secretKeyField,
		EndpointURL:    endpointURL,
		Bucket:         bucket,
		Region:         region,
	}
}

// buildManagedMinIOSpec constructs DSPAObjectStorageSpec for a managed MinIO deployment.
// The DSPA operator creates credentials in a conventionally-named secret and exposes
// MinIO at a conventionally-named in-cluster endpoint.
func buildManagedMinIOSpec(dspaName, namespace string, minioMap map[string]any) *DSPAObjectStorageSpec {
	bucket, _, _ := unstructured.NestedString(minioMap, "bucket")
	if bucket == "" {
		bucket = "mlpipeline"
	}

	secretName := fmt.Sprintf("ds-pipeline-s3-%s", dspaName)
	endpointURL := fmt.Sprintf("http://minio-%s.%s.svc.cluster.local:9000", dspaName, namespace)

	return &DSPAObjectStorageSpec{
		SecretName:     secretName,
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    endpointURL,
		Bucket:         bucket,
		Region:         "us-east-1",
	}
}

// validateDSPAURL ensures the base URL is safe to use as a pipeline server endpoint.
func validateDSPAURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("malformed URL: %w", err)
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("unsupported scheme %q: must be http or https", parsed.Scheme)
	}

	if parsed.User != nil {
		return fmt.Errorf("URL must not contain credentials")
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		return fmt.Errorf("URL must contain a hostname")
	}

	ip := net.ParseIP(hostname)
	if ip != nil {
		if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
			return fmt.Errorf("URL must not point to loopback or link-local address")
		}
		if strings.HasPrefix(hostname, "169.254.") {
			return fmt.Errorf("URL must not point to cloud metadata endpoint")
		}
	}

	return nil
}
