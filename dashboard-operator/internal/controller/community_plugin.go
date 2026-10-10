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

func hasInvalidCommunityRemoteEntryPathFormat(remoteEntry string) bool {
	return remoteEntry == "" ||
		!strings.HasPrefix(remoteEntry, "/") ||
		strings.ContainsAny(remoteEntry, "?#%\\") ||
		strings.IndexFunc(remoteEntry, unicode.IsControl) >= 0
}

func validateCommunityRemoteEntryPath(remoteEntry string) error {
	if hasInvalidCommunityRemoteEntryPathFormat(remoteEntry) {
		return fmt.Errorf("backend.remoteEntry %q must be a non-empty absolute URL path", remoteEntry)
	}
	for _, segment := range strings.Split(strings.TrimPrefix(remoteEntry, "/"), "/") {
		if segment == "" || segment == "." || segment == ".." {
			return fmt.Errorf("backend.remoteEntry %q contains an invalid path segment", remoteEntry)
		}
	}
	return nil
}

func validateCommunityFederationEntry(entry federationEntry, existingNames map[string]struct{}) error {
	if !moduleFederationRemoteName.MatchString(entry.Name) {
		return fmt.Errorf("community plugin entry key %q must be a valid Module Federation remote name", entry.Name)
	}
	if _, exists := existingNames[entry.Name]; exists {
		return fmt.Errorf("community plugin entry key %q collides with an existing federation entry", entry.Name)
	}
	if err := validateCommunityRemoteEntryPath(entry.Backend.RemoteEntry); err != nil {
		return err
	}
	if err := validateCommunityServiceRef("backend", entry.Backend.Service); err != nil {
		return err
	}

	paths := make(map[string]struct{}, len(entry.ProxyService))
	for _, proxy := range entry.ProxyService {
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

func communityFederationEntries(
	ctx context.Context,
	reader client.Reader,
	namespace string,
	existingEntries []federationEntry,
) ([]federationEntry, error) {
	source := &corev1.ConfigMap{}
	key := client.ObjectKey{Name: communityPluginsConfigMapName, Namespace: namespace}
	if err := reader.Get(ctx, key, source); err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("getting community plugins ConfigMap: %w", err)
	}

	existingNames := reservedDashboardFederationNames()
	for _, entry := range existingEntries {
		existingNames[entry.Name] = struct{}{}
	}

	entries := make([]federationEntry, 0, len(source.Data))
	for name, rawEntry := range source.Data {
		sourceEntry, err := decodeCommunityFederationSource(rawEntry)
		if err != nil {
			log.FromContext(ctx).Error(err, "Ignoring invalid community plugin federation entry", "configMap", key.Name, "entry", name)
			continue
		}

		entry, err := communityFederationEntryFromSource(name, sourceEntry)
		if err != nil {
			log.FromContext(ctx).Error(err, "Ignoring invalid community plugin federation entry", "configMap", key.Name, "entry", name)
			continue
		}
		if err := validateCommunityFederationEntry(entry, existingNames); err != nil {
			log.FromContext(ctx).Error(err, "Ignoring invalid community plugin federation entry", "configMap", key.Name, "entry", name)
			continue
		}

		entries = append(entries, entry)
	}

	return entries, nil
}
