package repositories

import (
	"context"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/externalmodels"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

type ExternalModelsRepository struct{}

func NewExternalModelsRepository() *ExternalModelsRepository {
	return &ExternalModelsRepository{}
}

// CreateExternalModel creates an external model by creating/updating the ConfigMap and Secret
func (r *ExternalModelsRepository) CreateExternalModel(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	req models.ExternalModelRequest,
) (*models.AAModel, error) {
	// Generate provider ID (simple incremental ID based on existing providers)
	providerID, err := client.GenerateProviderID(ctx, identity, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to generate provider ID: %w", err)
	}

	// Create Secret for API key only when a token was provided
	var secretName string
	if req.SecretValue != "" {
		secretName = fmt.Sprintf("endpoint-api-key-%s", providerID)
		if err := client.CreateExternalModelSecret(ctx, identity, namespace, secretName, req.SecretValue); err != nil {
			return nil, fmt.Errorf("failed to create secret: %w", err)
		}
	}

	// Create or update ConfigMap with the new provider and model
	if err := client.CreateOrUpdateExternalModelConfigMap(ctx, identity, namespace, providerID, secretName, req); err != nil {
		// Clean up secret if ConfigMap creation fails (only if one was created)
		if secretName != "" {
			if cleanupErr := client.DeleteSecret(ctx, identity, namespace, secretName); cleanupErr != nil {
				// Return both the original error and the cleanup error to surface leaked
				// state. The original error is deliberately formatted with %v rather than
				// %w: a failed cleanup means server-side state was leaked, which must
				// surface as a 500 — not be matched by errors.As in
				// CreateExternalModelHandler as a DuplicateModelError (409).
				return nil, fmt.Errorf("failed to create/update ConfigMap: %v; cleanup failed deleting secret %s: %v", err, secretName, cleanupErr)
			}
		}
		return nil, fmt.Errorf("failed to create/update ConfigMap: %w", err)
	}

	// Return AAModel structure for consistent API response
	caps := constants.BuildCapabilities(req.Capabilities)
	if caps == nil {
		caps = constants.DefaultCapabilities()
	}
	return &models.AAModel{
		ModelName:       req.ModelID,
		ModelID:         req.ModelID,
		ServingRuntime:  string(models.ProviderTypeOpenAI),
		APIProtocol:     "REST",
		Version:         "",
		Usecase:         req.UseCases,
		Description:     "",
		Endpoints:       []string{req.BaseURL},
		Status:          models.ModelStatusUnknown,
		DisplayName:     req.ModelDisplayName,
		ModelSourceType: models.ModelSourceTypeCustomEndpoint,
		ModelType:       req.ModelType,
		Capabilities:    caps,
	}, nil
}

// PassthroughEmbeddingInfo holds the provider URL and API key for a remote::passthrough
// embedding model backing a vector store.
type PassthroughEmbeddingInfo struct {
	BaseURL string
	APIKey  string
}

// GetPassthroughEmbeddingProviderInfo finds the first vector store in vectorStoreIDs that uses
// a custom-endpoint (remote::passthrough) embedding model and returns its URL and API key.
// Returns (nil, nil) if Vector Stores or External Models config not found, or when none of
// the stores use a passthrough embedding model — not an error.
// Returns a non-nil error when ConfigMap or Secret reads fail so callers can fail closed.
func (r *ExternalModelsRepository) GetPassthroughEmbeddingProviderInfo(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	vectorStoreIDs []string,
) (*PassthroughEmbeddingInfo, error) {
	vsDoc, err := client.GetVectorStoresConfig(ctx, namespace)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get vector stores config: %w", err)
	}

	vsMap := make(map[string]models.RegisteredVectorStore, len(vsDoc.RegisteredResources.VectorStores))
	for _, vs := range vsDoc.RegisteredResources.VectorStores {
		vsMap[vs.VectorStoreID] = vs
	}

	externalModelsConfig, err := client.GetExternalModelsConfig(ctx, namespace)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get external models config: %w", err)
	}

	for _, vsID := range vectorStoreIDs {
		registeredVS, found := vsMap[vsID]
		if !found || registeredVS.EmbeddingModel == "" {
			continue
		}

		embeddingModelID := registeredVS.EmbeddingModel

		var foundModel *models.RegisteredModel
		for i := range externalModelsConfig.RegisteredResources.Models {
			m := &externalModelsConfig.RegisteredResources.Models[i]
			if m.ModelID == embeddingModelID && m.ModelType == models.ModelTypeEmbedding {
				foundModel = m
				break
			}
		}
		if foundModel == nil {
			continue // not a custom endpoint embedding model
		}

		var foundProvider *models.InferenceProvider
		for i := range externalModelsConfig.Providers.Inference {
			if externalModelsConfig.Providers.Inference[i].ProviderID == foundModel.ProviderID {
				foundProvider = &externalModelsConfig.Providers.Inference[i]
				break
			}
		}
		if foundProvider == nil || foundProvider.ProviderType != models.ProviderTypePassThrough {
			continue
		}

		secretName := foundProvider.Config.CustomGenAI.APIKey.SecretRef.Name
		secretKey := foundProvider.Config.CustomGenAI.APIKey.SecretRef.Key
		apiKey := "fake" // default when no secret is configured
		if secretName != "" && secretKey != "" {
			apiKey, err = client.GetSecretValue(ctx, identity, namespace, secretName, secretKey)
			if err != nil {
				return nil, fmt.Errorf("failed to get secret for passthrough embedding model %q: %w", embeddingModelID, err)
			}
			if apiKey == "" {
				apiKey = "fake"
			}
		}

		return &PassthroughEmbeddingInfo{
			BaseURL: foundProvider.Config.BaseURL,
			APIKey:  apiKey,
		}, nil
	}

	return nil, nil // no passthrough embedding model found
}

// DeleteExternalModel deletes an external model by removing its entry from the ConfigMap and deleting its Secret
func (r *ExternalModelsRepository) DeleteExternalModel(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	modelID string,
) error {
	return client.DeleteExternalModel(ctx, identity, namespace, modelID)
}

// canonicalClusterDNSName lowercases a hostname and removes a terminal DNS
// root dot, so DNS-equivalent spellings (case variation, trailing dot)
// classify identically for namespace checks and Kubernetes API lookups.
func canonicalClusterDNSName(hostname string) string {
	return strings.ToLower(strings.TrimSuffix(hostname, "."))
}

// clusterServiceSuffixesFn returns the cluster's service DNS suffixes (e.g.
// "svc.cluster.local"), derived from the pod's resolv.conf search list so
// clusters with a custom cluster domain are covered rather than assuming
// cluster.local; a variable so tests can inject deterministic suffixes.
var clusterServiceSuffixesFn = defaultClusterServiceSuffixes

var (
	clusterServiceSuffixesOnce sync.Once
	clusterServiceSuffixesList []string
	discoveredSuffixesList     []string
)

func defaultClusterServiceSuffixes() []string {
	clusterServiceSuffixesOnce.Do(func() {
		discoveredSuffixesList = parseResolvConfServiceSuffixes("/etc/resolv.conf")
		clusterServiceSuffixesList = discoveredSuffixesList
		// Always keep the Kubernetes default alongside discovered suffixes:
		// environments without discoverable service search entries (local
		// development, CI containers) still classify standard cluster.local
		// names.
		for _, suffix := range clusterServiceSuffixesList {
			if suffix == "svc.cluster.local" {
				return
			}
		}
		clusterServiceSuffixesList = append(clusterServiceSuffixesList, "svc.cluster.local")
	})
	return clusterServiceSuffixesList
}

// probeableServiceSuffixesFn returns only the service suffixes the resolver's
// search list actually contains. Unlike clusterServiceSuffixesFn (which always
// includes the Kubernetes default so fully-qualified Service names are
// recognized everywhere), these are the only suffixes the local resolver would
// complete partial names with, so they are the only ones the classification
// probes with DNS lookups: probing with a suffix the resolver does not search
// (e.g. the synthetic default on a CI runner or developer machine) can surface
// resolver errors the real resolution path would never produce.
var probeableServiceSuffixesFn = defaultProbeableServiceSuffixes

func defaultProbeableServiceSuffixes() []string {
	clusterServiceSuffixesOnce.Do(func() {
		defaultClusterServiceSuffixes()
	})
	return discoveredSuffixesList
}

// parseResolvConfServiceSuffixes extracts the "svc.<domain>" suffixes from a
// resolv.conf search list. A pod's search entries are
// "<ns>.svc.<domain> svc.<domain> <domain>", so entries carrying an "svc"
// segment yield the suffix from "svc." onward.
func parseResolvConfServiceSuffixes(path string) []string {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var suffixes []string
	seen := map[string]bool{}
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 || fields[0] != "search" {
			continue
		}
		for _, entry := range fields[1:] {
			entry = strings.TrimSuffix(entry, ".")
			var suffix string
			if strings.HasPrefix(entry, "svc.") {
				suffix = entry
			} else if i := strings.Index(entry, ".svc."); i >= 0 {
				suffix = entry[i+1:]
			} else {
				continue
			}
			if !seen[suffix] {
				seen[suffix] = true
				suffixes = append(suffixes, suffix)
			}
		}
	}
	return suffixes
}

// resolverNdotsFn returns the resolver's ndots threshold from the pod's
// resolv.conf ("options ndots:N"); a variable so tests can inject
// deterministic values.
var resolverNdotsFn = defaultResolverNdots

var (
	resolverNdotsOnce  sync.Once
	resolverNdotsValue int
)

func defaultResolverNdots() int {
	resolverNdotsOnce.Do(func() {
		resolverNdotsValue = parseResolvConfNdots("/etc/resolv.conf")
	})
	return resolverNdotsValue
}

// parseResolvConfNdots reads the ndots threshold: a name with at least that
// many dots is tried as the absolute name before any search-path expansion
// (Go's net package and glibc both apply this order). An absent or invalid
// option falls back to the shared default of 1.
func parseResolvConfNdots(path string) int {
	data, err := os.ReadFile(path)
	if err != nil {
		return 1
	}
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 || fields[0] != "options" {
			continue
		}
		for _, opt := range fields[1:] {
			if !strings.HasPrefix(opt, "ndots:") {
				continue
			}
			if n, err := strconv.Atoi(strings.TrimPrefix(opt, "ndots:")); err == nil && n >= 0 {
				return n
			}
		}
	}
	return 1
}

// lookupAbsHostFn reports whether a hostname resolves as an absolute DNS
// name; a variable so tests can inject deterministic results. It honors the
// passed context and bounds the lookup so a slow resolver cannot stall the
// request. Only a definitive negative answer (name not found) counts as
// "does not resolve absolutely": cancellation, timeouts, and transient
// resolver failures return an error so the caller treats the classification
// as unknown instead of misclassifying an external hostname as a Service
// name.
var lookupAbsHostFn = func(ctx context.Context, host string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	addrs, err := net.DefaultResolver.LookupHost(ctx, host+".")
	if err == nil {
		return len(addrs) > 0, nil
	}
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) && dnsErr.IsNotFound {
		return false, nil
	}
	return false, err
}

// bffPodNamespaceFn returns the namespace of the pod the BFF runs in, read
// from the service-account namespace file kubelet mounts into every pod; a
// variable so tests can inject deterministically. The second return is false
// when the file is absent (e.g. local development outside a cluster).
var bffPodNamespaceFn = defaultBffPodNamespace

var (
	bffPodNamespaceOnce sync.Once
	bffPodNamespace     string
	bffPodNamespaceOK   bool
)

func defaultBffPodNamespace() (string, bool) {
	bffPodNamespaceOnce.Do(func() {
		data, err := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/namespace")
		if err != nil {
			return
		}
		if ns := strings.TrimSpace(string(data)); ns != "" {
			bffPodNamespace, bffPodNamespaceOK = ns, true
		}
	})
	return bffPodNamespace, bffPodNamespaceOK
}

// hostClassification is the single parse of a request's base URL host that
// every trust decision for that request shares: parsing (and its optional
// DNS lookups for short names) happens once, so the internal,
// cross-namespace, and cluster-service classifiers can never disagree from
// reparsing or repeated lookups.
type hostClassification struct {
	// host is the canonical hostname (lowercased, trailing root dot removed).
	host string
	// loopback reports a localhost/loopback target.
	loopback bool
	// service, namespace, and podLabel identify the in-cluster Service a
	// Kubernetes Service DNS name targets; isServiceName reports whether the
	// host is such a name in any namespace.
	service       string
	namespace     string
	podLabel      string
	isServiceName bool
	// mustDeny marks a host whose Service interpretation cannot be
	// established (a single-label name without a discoverable BFF pod
	// namespace); it must be denied outright rather than fall back to
	// external handling.
	mustDeny bool
}

// classifyHost parses baseURL's host and classifies it once. It returns an
// error only when the classification could not be completed (e.g. a
// transient DNS failure while distinguishing a short Service name from an
// external hostname); a host that is definitively not a Service name
// classifies as unclassified without error. On error the returned
// classification carries at least the parsed host, for logging.
func classifyHost(ctx context.Context, baseURL string) (hostClassification, error) {
	var c hostClassification
	u, err := url.Parse(baseURL)
	if err != nil {
		return c, nil
	}
	rawHost := u.Hostname()
	// A terminal root dot makes the name absolute: the resolver never applies
	// the search path to it, so search-completion classification must not
	// either (an absolute short name that does not resolve is simply
	// unresolvable, not a Service).
	absolute := strings.HasSuffix(rawHost, ".")
	c.host = canonicalClusterDNSName(rawHost)
	if ip := net.ParseIP(c.host); ip != nil {
		c.loopback = ip.IsLoopback()
		return c, nil
	}
	if c.host == "localhost" {
		c.loopback = true
		return c, nil
	}
	if classifyErr := c.classifyServiceName(ctx, absolute); classifyErr != nil {
		return c, classifyErr
	}
	return c, nil
}

// classifyServiceName identifies the in-cluster Service the classified host
// names, mirroring how the pod's resolver actually resolves it:
//
//   - a fully-qualified <service>.<namespace>.svc.<domain> name (with an
//     optional pod-specific label, and any cluster domain discovered from the
//     search list rather than only cluster.local), valid with or without a
//     terminal root dot;
//   - a bare <service>.<namespace>.svc name completed by the domain search
//     entry;
//   - a partial name (fewer dots than ndots) whose search-path expansion
//     resolves: the resolver tries each search entry before the absolute
//     name, so a name that also resolves absolutely still connects to its
//     Service interpretation and must be classified as one. A name with at
//     least ndots dots is instead tried as the absolute name first, so when
//     that lookup succeeds the name stays external no matter what its search
//     expansion would resolve to. One-label names
//     complete only within the BFF pod's own namespace; two- and three-label
//     names complete to Service or pod-specific names in the namespace their
//     labels imply (or the BFF pod's namespace, for the pod-namespace search
//     entry).
//
// Partial names whose search expansions name no Service (four or more labels,
// or expansions that do not resolve) fall back to their absolute
// interpretation, so ordinary external hostnames keep their normal external
// handling.
func (c *hostClassification) classifyServiceName(ctx context.Context, absolute bool) error {
	h := c.host
	labels := strings.Split(h, ".")
	suffixes := clusterServiceSuffixesFn()
	for _, suffix := range suffixes {
		if !strings.HasSuffix(h, "."+suffix) {
			continue
		}
		suffixLabels := strings.Count(suffix, ".") + 1
		// Exactly two labels before the suffix form a Service name
		// (<service>.<namespace>), three a pod-specific name (the extra label
		// is the pod hostname). Any other count does not form a Kubernetes
		// DNS name the cluster would resolve.
		switch len(labels) - suffixLabels {
		case 2:
			c.service, c.namespace, c.podLabel, c.isServiceName = labels[0], labels[1], "", true
			return nil
		case 3:
			c.service, c.namespace, c.podLabel, c.isServiceName = labels[1], labels[2], labels[0], true
			return nil
		}
	}
	if absolute {
		// Absolute short names get no search-path completion.
		return nil
	}
	// A name with at least ndots dots is tried as the absolute name before any
	// search-path expansion; when that absolute lookup succeeds, the resolver
	// never reaches the search path, so the connection goes to the public DNS
	// record and the name must not be classified as a Service (classifying it
	// anyway would 403 other-namespace callers or pin same-namespace callers
	// to the internal Pod for a URL whose traffic actually goes to the public
	// endpoint).
	if strings.Count(h, ".") >= resolverNdotsFn() {
		resolvesAbsolutely, err := lookupAbsHostFn(ctx, h)
		if err != nil {
			return err
		}
		if resolvesAbsolutely {
			return nil
		}
	}
	// A bare name ending in .svc is completed by the domain search entry to
	// the same Service its fully-qualified form names, so it must be
	// classified (and namespace-checked) too; leaving it unclassified would
	// let a cross-namespace Service reach the DNS-based SSRF filter, which a
	// non-RFC1918 Service CIDR passes.
	if strings.HasSuffix(h, ".svc") {
		switch len(labels) {
		case 3:
			c.service, c.namespace, c.podLabel, c.isServiceName = labels[0], labels[1], "", true
			return nil
		case 4:
			c.service, c.namespace, c.podLabel, c.isServiceName = labels[1], labels[2], labels[0], true
			return nil
		}
	}
	podNS, podNSKnown := bffPodNamespaceFn()
	if !podNSKnown && len(labels) == 1 {
		// A one-label name can only complete to a Service in the BFF pod's
		// own namespace; when that namespace cannot be established, deny
		// outright rather than guess.
		c.mustDeny = true
		return nil
	}
	// Only suffixes the resolver's search list actually contains can complete
	// a partial name, so only those are probed (see probeableServiceSuffixesFn).
	for _, suffix := range probeableServiceSuffixesFn() {
		// The pod-namespace search entry (<podNS>.svc.<domain>) completes
		// one-label names to a Service in the BFF pod's namespace and
		// two-label names to a pod-specific name there.
		if podNSKnown && (len(labels) == 1 || len(labels) == 2) {
			resolved, err := lookupAbsHostFn(ctx, h+"."+podNS+"."+suffix)
			if err != nil {
				return err
			}
			if resolved {
				if len(labels) == 1 {
					c.service, c.namespace, c.podLabel, c.isServiceName = labels[0], podNS, "", true
				} else {
					c.service, c.namespace, c.podLabel, c.isServiceName = labels[1], podNS, labels[0], true
				}
				return nil
			}
		}
		// The service-zone search entry (svc.<domain>) completes two-label
		// names to a Service in the namespace the second label names and
		// three-label names to a pod-specific name in the namespace the
		// third label names.
		if len(labels) == 2 || len(labels) == 3 {
			resolved, err := lookupAbsHostFn(ctx, h+"."+suffix)
			if err != nil {
				return err
			}
			if resolved {
				if len(labels) == 2 {
					c.service, c.namespace, c.podLabel, c.isServiceName = labels[0], labels[1], "", true
				} else {
					c.service, c.namespace, c.podLabel, c.isServiceName = labels[1], labels[2], labels[0], true
				}
				return nil
			}
		}
	}
	// No search-path Service interpretation resolves. A two-label name that
	// does not resolve absolutely either is still treated as its
	// <service>.<namespace> short form: the search path is the only thing
	// that could resolve it, and failing toward Service classification sends
	// it to namespace checking and caller-scoped verification rather than
	// the DNS-based SSRF filter.
	if len(labels) == 2 {
		resolvesAbsolutely, err := lookupAbsHostFn(ctx, h)
		if err != nil {
			return err
		}
		if !resolvesAbsolutely {
			c.service, c.namespace, c.podLabel, c.isServiceName = labels[0], labels[1], "", true
		}
	}
	return nil
}

// internalTo reports whether the classified host is trusted for the caller's
// namespace: loopback (only in local development) or a same-namespace
// in-cluster Service DNS name. These legitimately resolve to private IPs, so
// SSRF validation is skipped for them; everything else is untrusted.
// Recognized cross-namespace and unverifiable Service names are denied with
// 403 by VerifyExternalModel before any client is constructed, since the
// caller is only authorized for their own namespace; remaining external
// hosts are subject to SSRF checks.
func (c hostClassification) internalTo(allowedNamespace string, allowLoopback bool) bool {
	if c.loopback {
		// Loopback endpoints are only exempt from SSRF validation in local
		// development; in a deployed BFF they would target BFF-local services.
		return allowLoopback
	}
	// TODO: respect OdhDashboardConfig feature flags when available to be fetched from the BFF
	// Only trust services whose namespace segment matches the caller's authorized namespace.
	return c.isServiceName && allowedNamespace != "" && c.namespace == allowedNamespace
}

// crossNamespace reports whether the classified host targets a Kubernetes
// Service DNS name whose namespace differs from the caller's authorized
// namespace. Such hosts must be denied outright rather than left to the SSRF
// private-IP filter: clusters can configure a non-RFC1918 Service CIDR (e.g.
// 100.96.0.0/16), in which case a cross-namespace Service VIP is not a
// private IP by that filter and the request would pass SSRF validation.
func (c hostClassification) crossNamespace(allowedNamespace string) bool {
	return c.isServiceName && allowedNamespace != "" && c.namespace != allowedNamespace
}

// resolveTrustedHost decides whether a base URL in the caller's own namespace may
// skip SSRF validation, and returns the validated dial targets (address:backendPort)
// to pin the connection to (see ClientOptions.PinnedDialAddresses), so a caller who
// mutates the Service or its EndpointSlices after the lookup cannot redirect the
// request — the pinned dial bypasses DNS and the Service VIP entirely.
//
// A namespace user can point an in-namespace Service DNS name at an arbitrary
// target, so trust is only granted after verification through the Kubernetes API:
// ExternalName and selectorless Services are rejected, and for selector-backed
// Services (headless or not) every endpoint must reference a
// non-host-network Pod in the caller's namespace whose PodIPs contain the
// endpoint's addresses — which is all the EndpointSlice controller itself ever
// produces. Lookups fail closed; a Forbidden lookup returns an error so the caller
// learns the missing permission instead of a misleading connectivity failure. The
// backend port is the EndpointSlice's published port for the selected Service port
// for ClusterIP Services (direct dialing bypasses the VIP's port translation, and
// the slice's port is what actually routes) and the URL's port for headless Services
// and pod-specific DNS names, whose DNS already points at endpoint addresses. Dial
// candidates prefer ready endpoints and, for ClusterIP Service names only, fall back
// to serving (terminating) endpoints when no
// ready endpoint exists — the VIP keeps routing to them while headless DNS does not
// publish them; non-running Pods are excluded from dial candidates rather than
// rejecting the whole Service, and pod-specific DNS names restrict candidates to
// the endpoint whose hostname matches the pod label or whose CoreDNS default
// dashed-IP endpoint name (used when the EndpointSlice sets no hostname) does.
func resolveTrustedHost(
	ctx context.Context,
	client kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	baseURL string,
	classif hostClassification,
	namespace string,
	allowLoopback bool,
	logger *slog.Logger,
) (bool, []string, error) {
	if !classif.internalTo(namespace, allowLoopback) {
		return false, nil, nil
	}
	// localhost/loopback for local development; internalTo already gated this
	// on the local-development setting.
	if classif.loopback {
		return true, nil, nil
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		return false, nil, nil
	}
	svcName, svcNamespace, podLabel := classif.service, classif.namespace, classif.podLabel
	urlPort := u.Port()
	if urlPort == "" {
		if u.Scheme == "https" {
			urlPort = "443"
		} else {
			urlPort = "80"
		}
	}
	svc, err := client.GetService(ctx, identity, svcNamespace, svcName)
	if err != nil {
		if apierrors.IsForbidden(err) {
			return false, nil, forbiddenTrustError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires permission to get the Service %s/%s, which the caller lacks", svcNamespace, svcName))
		}
		if apierrors.IsNotFound(err) {
			// A missing Service is a definitive negative answer, not an
			// availability failure: the name simply does not name a
			// verifiable in-cluster endpoint.
			return false, nil, nil
		}
		// Log only a safe error category: raw Kubernetes errors can embed
		// caller-controlled label selectors in their message.
		logger.Warn("service lookup failed during trusted host resolution", "service", svcName, "namespace", svcNamespace, "error_reason", string(apierrors.ReasonForError(err)))
		return false, nil, externalmodels.NewConnectionError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires the Kubernetes API: getting the Service %s/%s failed", svcNamespace, svcName))
	}
	if svc.Spec.Type == corev1.ServiceTypeExternalName {
		return false, nil, nil
	}
	if len(svc.Spec.Selector) == 0 {
		return false, nil, nil
	}
	// Resolve the backend port. Headless Services and pod-specific DNS names
	// resolve to Pod IPs directly, so the URL's port is the backend port. ClusterIP
	// Services translate the Service
	// port to the targetPort at the VIP, which direct dialing bypasses, so the
	// port actually routed must be resolved per EndpointSlice: each slice
	// publishes the resolved targetPort (numeric or named) for the ports it
	// serves, and Kubernetes routes through those published endpoint ports — even
	// for numeric targetPorts, a recently changed Service targetPort may not yet
	// be reflected in existing slices. Only TCP Service ports are candidates —
	// the verification connection is TCP, and a Service may expose the same port
	// number for UDP with a different targetPort.
	backendPort := ""
	resolveFromSlice := false
	isHeadless := svc.Spec.ClusterIP == corev1.ClusterIPNone
	// Pod-specific DNS names resolve directly to endpoint addresses even for
	// ClusterIP Services (CoreDNS answers endpoint queries for them), so they share
	// headless semantics: the URL's port is the backend port, and only endpoints the
	// DNS would publish are dial candidates.
	directEndpoint := isHeadless || podLabel != ""
	var svcPort corev1.ServicePort
	if !directEndpoint {
		urlPortNum, err := strconv.ParseInt(urlPort, 10, 32)
		if err != nil {
			return false, nil, nil
		}
		found := false
		for _, p := range svc.Spec.Ports {
			if int64(p.Port) == urlPortNum && (p.Protocol == "" || p.Protocol == corev1.ProtocolTCP) {
				svcPort, found = p, true
				break
			}
		}
		if !found {
			// The URL's port is not exposed by the Service, so nothing routable
			// matches it.
			return false, nil, nil
		}
		resolveFromSlice = true
	} else {
		backendPort = urlPort
	}
	// internalTrafficPolicy: Local makes kube-proxy route VIP traffic only to
	// endpoints on the traffic source's node — the BFF's node — treating the
	// Service as endpoint-less from nodes without a local endpoint. The pinned
	// dial bypasses the VIP and would reach a remote Pod directly, reporting
	// success for a URL the BFF cannot use normally. The BFF cannot determine
	// its own node to filter endpoints by locality, so fail closed. Headless
	// Services and pod-specific DNS names bypass the VIP in normal traffic too,
	// so the policy does not apply to them.
	if !directEndpoint &&
		svc.Spec.InternalTrafficPolicy != nil &&
		*svc.Spec.InternalTrafficPolicy == corev1.ServiceInternalTrafficPolicyLocal {
		logger.Warn("service uses internalTrafficPolicy Local; node-local routing cannot be verified for the pinned dial",
			"service", svcName, "namespace", svcNamespace)
		return false, nil, nil
	}
	slices, err := client.GetServiceEndpointSlices(ctx, identity, svcNamespace, svcName)
	if err != nil {
		if apierrors.IsForbidden(err) {
			return false, nil, forbiddenTrustError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires permission to list EndpointSlices for the Service %s/%s, which the caller lacks", svcNamespace, svcName))
		}
		// Log only a safe error category: raw Kubernetes errors can embed
		// caller-controlled label selectors in their message.
		logger.Warn("endpoint slice lookup failed during trusted host resolution", "service", svcName, "namespace", svcNamespace, "error_reason", string(apierrors.ReasonForError(err)))
		return false, nil, externalmodels.NewConnectionError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires the Kubernetes API: listing EndpointSlices for the Service %s/%s failed", svcNamespace, svcName))
	}
	// Every endpoint is validated against its referenced Pod and the endpoint
	// addresses confirmed to belong to that Pod: a targetRef is just a name an
	// EndpointSlice writer can forge, so it must be checked against a running,
	// non-host-network Pod in the caller's namespace whose PodIPs contain every
	// endpoint address. All referenced Pods are resolved with a single
	// selector-scoped list of the Service's Pods — a referenced Pod absent from
	// that list (deleted, or no longer matching the selector) fails closed.
	pods, err := client.ListPods(ctx, identity, svcNamespace, svc.Spec.Selector)
	if err != nil {
		if apierrors.IsForbidden(err) {
			return false, nil, forbiddenTrustError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires permission to list the Pods of the Service %s/%s, which the caller lacks", svcNamespace, svcName))
		}
		// Log only a safe error category: raw Kubernetes errors can embed
		// caller-controlled label selectors in their message.
		logger.Warn("pod list failed during trusted host resolution", "service", svcName, "namespace", svcNamespace, "error_reason", string(apierrors.ReasonForError(err)))
		return false, nil, externalmodels.NewConnectionError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires the Kubernetes API: listing the Pods of the Service %s/%s failed", svcNamespace, svcName))
	}
	podByName := make(map[string]*corev1.Pod, len(pods))
	for i := range pods {
		podByName[pods[i].Name] = &pods[i]
	}
	var readyTargets, servingTargets []string
	// dashedEndpointName returns CoreDNS's default endpoint name for an
	// address: dots (and colons, for IPv6) replaced by dashes. EndpointSlices
	// without a hostname publish this name per endpoint address.
	dashedEndpointName := func(address string) string {
		return strings.ReplaceAll(strings.ReplaceAll(address, ".", "-"), ":", "-")
	}
	for i := range slices {
		slice := &slices[i]
		sliceBackendPort := backendPort
		if resolveFromSlice {
			// Resolve the selected Service port against this slice's ports: slice
			// port names correspond to Service port names, and the published port
			// is the concrete backend port Kubernetes actually routes to.
			sliceBackendPort = ""
			for _, p := range slice.Ports {
				if p.Port == nil {
					continue
				}
				portName := ""
				if p.Name != nil {
					portName = *p.Name
				}
				if portName != svcPort.Name {
					continue
				}
				if p.Protocol != nil && *p.Protocol != corev1.ProtocolTCP {
					continue
				}
				sliceBackendPort = strconv.Itoa(int(*p.Port))
				break
			}
			if sliceBackendPort == "" {
				// This slice does not expose the selected Service port (slices can
				// carry different port sets, e.g. during mixed-version rollouts or
				// while reconciling a targetPort change), so it supplies no backends
				// for it; skip it without discarding the other slices' validated
				// targets.
				continue
			}
		}
		for _, endpoint := range slice.Endpoints {
			// Pod-specific DNS names only route to the endpoint answering that
			// name: the one whose hostname matches the pod label or — when the
			// EndpointSlice sets no hostname — the one carrying an address whose
			// CoreDNS default dashed-IP name matches it.
			if podLabel != "" {
				if endpoint.Hostname != nil {
					if *endpoint.Hostname != podLabel {
						continue
					}
				} else {
					answerName := false
					for _, address := range endpoint.Addresses {
						if dashedEndpointName(address) == podLabel {
							answerName = true
							break
						}
					}
					if !answerName {
						continue
					}
				}
			}
			ref := endpoint.TargetRef
			if ref == nil || ref.Kind != "Pod" || ref.Namespace != namespace || ref.Name == "" {
				return false, nil, nil
			}
			pod, found := podByName[ref.Name]
			if !found {
				// Fail closed: the referenced Pod is not among the Service's
				// selector-matched Pods.
				return false, nil, nil
			}
			// Host-network Pods indicate a manually managed setup that must not
			// receive the SSRF exemption for the whole Service.
			if pod.Spec.HostNetwork {
				return false, nil, nil
			}
			// Non-running Pods (e.g. a Pending replica that already has an IP and
			// a published endpoint) are excluded from dial candidates without
			// discarding the Service's other validated destinations.
			if pod.Status.Phase != corev1.PodRunning {
				continue
			}
			for _, address := range endpoint.Addresses {
				if !podOwnsAddress(pod, address) {
					return false, nil, nil
				}
				if podLabel != "" && endpoint.Hostname == nil && dashedEndpointName(address) != podLabel {
					// A hostname-less endpoint answers the pod-specific name only
					// for the address whose dashed form matches it.
					continue
				}
				target := net.JoinHostPort(address, sliceBackendPort)
				if endpoint.Conditions.Ready == nil || *endpoint.Conditions.Ready {
					// The published Ready condition is authoritative even for
					// publishNotReadyAddresses Services: the endpoint controller
					// marks their endpoints Ready, so an unreconciled Ready=false
					// slice must not be dialed.
					readyTargets = append(readyTargets, target)
				} else if !directEndpoint && endpoint.Conditions.Serving != nil && *endpoint.Conditions.Serving &&
					endpoint.Conditions.Terminating != nil && *endpoint.Conditions.Terminating {
					// Terminating-endpoint fallback, ClusterIP Service-name only:
					// the VIP keeps routing to terminating-but-serving endpoints, but
					// endpoint DNS (headless or pod-specific) does not
					// publish them, so pinning their addresses would verify
					// a URL normal DNS cannot resolve. kube-proxy's fallback
					// selects only endpoints that are both serving and explicitly
					// terminating, so an absent or false Terminating condition is
					// not eligible; likewise an absent Serving condition defers to
					// Ready, which is false here.
					servingTargets = append(servingTargets, target)
				}
			}
		}
	}
	// Fail closed when no endpoint was verified: an endpoint-less Service (e.g.
	// scaled to zero) has no validated destination to pin the connection to.
	targets := readyTargets
	if len(targets) == 0 {
		targets = servingTargets
	}
	if len(targets) == 0 {
		return false, nil, nil
	}
	return true, targets, nil
}

// podOwnsAddress reports whether an EndpointSlice address matches one of the
// Pod's IPs. Kubernetes parses and re-stringifies Pod IPs when publishing
// EndpointSlices, so equivalent IPv6 textual forms (e.g. PodIP
// fd08::5678:0000:0000:9abc:def0 vs endpoint address fd08::5678:0:0:9abc:def0)
// must compare via net.IP.Equal, not string equality.
func podOwnsAddress(pod *corev1.Pod, address string) bool {
	addressIP := net.ParseIP(address)
	for _, podIP := range pod.Status.PodIPs {
		if podIP.IP == address {
			return true
		}
		if ip := net.ParseIP(podIP.IP); ip != nil && addressIP != nil && ip.Equal(addressIP) {
			return true
		}
	}
	return false
}

// forbiddenTrustError builds the permission error returned when a caller lacks read
// access to a resource needed to verify an in-cluster endpoint.
func forbiddenTrustError(baseURL, message string) *externalmodels.ExternalModelError {
	return &externalmodels.ExternalModelError{
		Code:       "FORBIDDEN",
		Message:    message,
		BaseURL:    baseURL,
		StatusCode: http.StatusForbidden,
	}
}

// internalHostRootCAs returns the provided CA pool only when the URL targets an internal
// host. For external hosts it returns nil so the client falls back to the system CA pool,
// which contains the public root CAs needed to verify certificates from services like
// api.openai.com. Passing a cluster-only CA pool to an external host would break TLS.
func internalHostRootCAs(trusted bool, rootCAs *x509.CertPool) *x509.CertPool {
	if trusted {
		return rootCAs
	}
	return nil
}

// VerifyExternalModel tests an external model endpoint using the external models client.
// namespace is the caller's authorized namespace (from AttachNamespace); it scopes which
// in-cluster service hosts are trusted to skip SSRF validation.
// rootCAs is the application CA pool (nil falls back to system pool for external hosts).
// insecureSkipVerify mirrors cfg.InsecureSkipVerify and disables TLS cert validation when true.
// allowLoopback mirrors cfg.AllowLocalModelEndpoints and trusts localhost/loopback endpoints
// only in local development.
func (r *ExternalModelsRepository) VerifyExternalModel(
	logger *slog.Logger,
	ctx context.Context,
	client kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	namespace string,
	req models.VerifyExternalModelRequest,
	rootCAs *x509.CertPool,
	insecureSkipVerify bool,
	allowLoopback bool,
) (*models.VerifyExternalModelResponse, error) {
	// Reject malformed URLs as configuration errors before the DNS-dependent
	// classification below, which can otherwise turn an invalid URL into an
	// availability error or a trust denial.
	if err := externalmodels.ValidateBaseURLFormat(req.BaseURL); err != nil {
		return nil, err
	}
	// Classify the host once so every trust decision below shares the same
	// parse (and DNS lookup) result. A classification that could not complete
	// (e.g. a transient DNS failure distinguishing a short Service name from
	// an external hostname) fails closed as an availability error rather than
	// risking a misclassification.
	classif, err := classifyHost(ctx, req.BaseURL)
	if err != nil {
		// Log the parsed hostname only: the raw base URL may carry userinfo
		// or sensitive path/query data.
		logger.Warn("endpoint host classification did not complete", "host", classif.host, "error", err)
		return nil, externalmodels.NewConnectionError(req.BaseURL, "the endpoint host could not be classified because its DNS lookup did not complete")
	}
	if classif.mustDeny {
		return nil, forbiddenTrustError(req.BaseURL, "single-label endpoint hosts cannot be verified because the namespace they would resolve in cannot be established")
	}
	trusted, pinnedAddresses, err := resolveTrustedHost(ctx, client, identity, req.BaseURL, classif, namespace, allowLoopback, logger)
	if err != nil {
		return nil, err
	}
	if !trusted && classif.crossNamespace(namespace) {
		return nil, forbiddenTrustError(req.BaseURL, fmt.Sprintf(
			"in-cluster service endpoints are only allowed in your own namespace (%s); the URL targets a service in another namespace", namespace))
	}
	// A same-namespace Service DNS name that failed validation (ExternalName,
	// selectorless, no verified endpoints, ...) must also be rejected rather
	// than fall back to DNS-based SSRF validation: on a non-RFC1918 Service
	// CIDR the Service VIP passes that filter and the BFF would connect to
	// manually configured, unvalidated endpoints.
	if !trusted && classif.isServiceName {
		return nil, forbiddenTrustError(req.BaseURL, "in-cluster service endpoint could not be verified against the Kubernetes API (e.g. ExternalName, selectorless, or no verified endpoints)")
	}
	modelsClient, err := externalmodels.NewExternalModelsClient(
		logger,
		req.BaseURL,
		req.SecretValue,
		req.ModelType,
		&externalmodels.ClientOptions{
			AllowHTTP:          trusted,
			SkipSSRFValidation: trusted,
			// Only supply the cluster CA pool for internal hosts; external hosts
			// must use the system CA pool to verify public certificates.
			SkipTLSVerification: insecureSkipVerify && trusted,
			RootCAs:             internalHostRootCAs(trusted, rootCAs),
			// Pin trusted in-cluster connections to the validated Pod addresses so
			// routing mutations after the trust decision cannot redirect them.
			PinnedDialAddresses: pinnedAddresses,
		},
	)
	if err != nil {
		return nil, err
	}

	// Verify the model using the client (pass embedding dimension for embedding models)
	return modelsClient.VerifyModel(ctx, req.ModelID, req.EmbeddingDimension)
}
