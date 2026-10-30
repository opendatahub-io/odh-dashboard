package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"
	"unicode"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/util/validation"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	communityPluginsConfigMapName = "community-plugins-config"
	communityPluginsNamespace     = "redhat-ods-community-plugins"
	communityPluginsProxyPrefix   = "/community-plugins"
)

var (
	communityProxyPathSegment = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
)

// communityFederationSourceEntry is the installer-owned source contract. It
// remains distinct from federationEntry because paths and optional connection
// policy must be validated and normalized before reaching the Dashboard runtime.
type communityFederationSourceEntry struct {
	Backend      federationBackend                  `json:"backend"`
	ProxyService []communityProxyServiceSourceEntry `json:"proxyService,omitempty"`
}

// communityProxyServiceSourceEntry accepts a relative suffix rather than a
// public path. The Dashboard controls the public route namespace and derives
// the final path as /community-plugins/<remote-name>/<path-suffix>.
type communityProxyServiceSourceEntry struct {
	Authorize   *bool      `json:"authorize,omitempty"`
	PathSuffix  string     `json:"pathSuffix"`
	PathRewrite string     `json:"pathRewrite,omitempty"`
	TLS         *bool      `json:"tls,omitempty"`
	Service     serviceRef `json:"service"`
}

func validateCommunityServiceRef(field string, service serviceRef) error {
	if errs := validation.IsDNS1035Label(service.Name); len(errs) > 0 {
		return fmt.Errorf("%s service name %q is invalid: %s", field, service.Name, strings.Join(errs, ", "))
	}
	if errs := validation.IsDNS1123Label(service.Namespace); len(errs) > 0 {
		return fmt.Errorf("%s service namespace %q is invalid: %s", field, service.Namespace, strings.Join(errs, ", "))
	}
	if service.Port < 1 || service.Port > 65535 {
		return fmt.Errorf("%s service port %d is outside the valid range", field, service.Port)
	}
	return nil
}

func communityProxyPath(remoteName, suffix string) (string, error) {
	if suffix == "" || strings.HasPrefix(suffix, "/") || strings.HasSuffix(suffix, "/") {
		return "", fmt.Errorf("proxyService pathSuffix %q must be a non-empty relative URL path", suffix)
	}
	for _, segment := range strings.Split(suffix, "/") {
		if !communityProxyPathSegment.MatchString(segment) {
			return "", fmt.Errorf("proxyService pathSuffix %q contains an invalid path segment", suffix)
		}
	}
	return communityPluginsProxyPrefix + "/" + remoteName + "/" + suffix, nil
}

func hasInvalidCommunityAbsolutePathFormat(path string) bool {
	return path == "" ||
		!strings.HasPrefix(path, "/") ||
		strings.ContainsAny(path, "?#%\\") ||
		strings.IndexFunc(path, unicode.IsControl) >= 0
}

func validateCommunityAbsolutePath(field, path string) error {
	if hasInvalidCommunityAbsolutePathFormat(path) {
		return fmt.Errorf("%s %q must be a non-empty absolute URL path", field, path)
	}
	for _, segment := range strings.Split(strings.TrimPrefix(path, "/"), "/") {
		if segment == "" || segment == "." || segment == ".." {
			return fmt.Errorf("%s %q contains an invalid path segment", field, path)
		}
	}
	return nil
}

func validateCommunityRemoteEntryPath(remoteEntry string) error {
	return validateCommunityAbsolutePath("backend.remoteEntry", remoteEntry)
}

func validateCommunityPathRewrite(pathRewrite string) error {
	if pathRewrite == "" || pathRewrite == "/" {
		return nil
	}
	return validateCommunityAbsolutePath("proxyService.pathRewrite", pathRewrite)
}

func validateCommunityFederationEntry(entry federationEntry, existingNames map[string]struct{}) error {
	if !moduleFederationRemoteName.MatchString(entry.Name) {
		return fmt.Errorf("community plugin entry key %q must be a valid Module Federation remote name", entry.Name)
	}
	if _, exists := existingNames[entry.Name]; exists {
		return fmt.Errorf("community plugin entry key %q collides with an existing federation entry", entry.Name)
	}
	if entry.Backend == nil {
		return errors.New("community plugin entry must include a backend")
	}
	if err := validateCommunityRemoteEntryPath(entry.Backend.RemoteEntry); err != nil {
		return err
	}
	if err := validateCommunityServiceRef("backend", entry.Backend.Service); err != nil {
		return err
	}

	paths := make(map[string]struct{}, len(entry.ProxyService))
	for _, proxy := range entry.ProxyService {
		if err := validateCommunityPathRewrite(proxy.PathRewrite); err != nil {
			return err
		}
		if err := validateCommunityServiceRef("proxyService", proxy.Service); err != nil {
			return err
		}
		if _, exists := paths[proxy.Path]; exists {
			return fmt.Errorf("proxyService path %q is duplicated within this community plugin", proxy.Path)
		}
		paths[proxy.Path] = struct{}{}
	}

	return nil
}

func decodeCommunityFederationSource(rawEntry string) (communityFederationSourceEntry, error) {
	var entry communityFederationSourceEntry

	decoder := json.NewDecoder(strings.NewReader(rawEntry))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&entry); err != nil {
		return communityFederationSourceEntry{}, fmt.Errorf("decoding JSON: %w", err)
	}

	switch err := decoder.Decode(&struct{}{}); {
	case errors.Is(err, io.EOF):
		return entry, nil
	case err == nil:
		return communityFederationSourceEntry{}, errors.New("value must contain exactly one JSON object")
	default:
		return communityFederationSourceEntry{}, fmt.Errorf("invalid data after JSON object: %w", err)
	}
}

func communityFederationEntryFromSource(name string, source communityFederationSourceEntry) (federationEntry, error) {
	entry := federationEntry{Name: name, Backend: &source.Backend}
	for _, sourceProxy := range source.ProxyService {
		proxyPath, err := communityProxyPath(name, sourceProxy.PathSuffix)
		if err != nil {
			return federationEntry{}, err
		}
		entry.ProxyService = append(entry.ProxyService, proxyServiceEntry{
			Path:        proxyPath,
			PathRewrite: sourceProxy.PathRewrite,
			federationTarget: federationTarget{
				Authorize: sourceProxy.Authorize,
				TLS:       sourceProxy.TLS,
				Service:   sourceProxy.Service,
			},
		})
	}

	return entry, nil
}

func communityPluginsConfigMap(ctx context.Context, reader client.Reader) (*corev1.ConfigMap, error) {
	namespace := &corev1.Namespace{}
	if err := reader.Get(ctx, client.ObjectKey{Name: communityPluginsNamespace}, namespace); err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("getting community plugins namespace: %w", err)
	}

	source := &corev1.ConfigMap{}
	key := client.ObjectKey{Name: communityPluginsConfigMapName, Namespace: communityPluginsNamespace}
	if err := reader.Get(ctx, key, source); err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("getting community plugins ConfigMap: %w", err)
	}
	return source, nil
}

func communityFederationEntries(
	ctx context.Context,
	reader client.Reader,
) ([]federationEntry, error) {
	source, err := communityPluginsConfigMap(ctx, reader)
	if err != nil {
		return nil, err
	}
	if source == nil {
		return nil, nil
	}

	existingNames := reservedDashboardFederationNames()

	entries := make([]federationEntry, 0, len(source.Data))
	for name, rawEntry := range source.Data {
		sourceEntry, err := decodeCommunityFederationSource(rawEntry)
		if err != nil {
			log.FromContext(ctx).Info("Ignoring invalid community plugin federation entry", "error", err, "configMap", communityPluginsConfigMapName, "namespace", communityPluginsNamespace, "entry", name)
			continue
		}

		entry, err := communityFederationEntryFromSource(name, sourceEntry)
		if err != nil {
			log.FromContext(ctx).Info("Ignoring invalid community plugin federation entry", "error", err, "configMap", communityPluginsConfigMapName, "namespace", communityPluginsNamespace, "entry", name)
			continue
		}
		if err := validateCommunityFederationEntry(entry, existingNames); err != nil {
			log.FromContext(ctx).Info("Ignoring invalid community plugin federation entry", "error", err, "configMap", communityPluginsConfigMapName, "namespace", communityPluginsNamespace, "entry", name)
			continue
		}

		entries = append(entries, entry)
	}

	return entries, nil
}

// lastKnownGoodCommunityFederationEntries returns the explicitly persisted
// community entries from the operator-owned federation ConfigMap. It is used
// only when the optional source cannot be read, so a transient source failure
// neither removes accepted community plugins nor blocks Dashboard updates.
func (r *DashboardReconciler) lastKnownGoodCommunityFederationEntries(ctx context.Context) ([]federationEntry, error) {
	existing := &corev1.ConfigMap{}
	key := client.ObjectKey{Name: federationConfigMapName, Namespace: r.ApplicationsNamespace}
	if err := r.apiReader().Get(ctx, key, existing); err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("getting generated federation ConfigMap: %w", err)
	}

	existingData, exists := existing.Data[communityFederationConfigKey]
	if !exists {
		return nil, nil
	}
	var existingEntries []federationEntry
	if err := json.Unmarshal([]byte(existingData), &existingEntries); err != nil {
		return nil, fmt.Errorf("decoding generated federation entries: %w", err)
	}

	existingNames := reservedDashboardFederationNames()
	entries := make([]federationEntry, 0, len(existingEntries))
	for _, entry := range existingEntries {
		if err := validateCommunityFederationEntry(entry, existingNames); err != nil {
			return nil, fmt.Errorf("validating last-known-good community entry %q: %w", entry.Name, err)
		}
		existingNames[entry.Name] = struct{}{}
		entries = append(entries, entry)
	}

	return entries, nil
}
