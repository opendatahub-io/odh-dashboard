package k8sutil

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/rest"
)

// ErrAbsenceUnconfirmed reports that discovery could not establish whether an
// API is served. Callers must treat it as inconclusive, never as absence.
var ErrAbsenceUnconfirmed = errors.New("API absence not confirmed by discovery")

// ConfirmAPIAbsent asks discovery whether gvr is served. A 404 without a
// resource name on a GET looks like a missing API, but an intermediary (a
// proxy or gateway in front of the API server) can return the same response,
// so it is not proof on its own. Absence is confirmed only by a successful
// discovery answer that includes the core group (so it is a real discovery
// document) and in which no listed version of the group serves the resource.
// A resource served only at another version is a version skew, not absence,
// and is inconclusive. Over the wire each document (/api, /apis, the group
// version's resource list) is read once with ctx, must decode as its
// discovery kind, and the decision is taken from that same body; a malformed
// successful body is inconclusive, while a valid empty list still counts. A
// caller that cancels ctx cancels the in-flight request.
//
// It returns (true, nil) only on confirmed absence. Any discovery failure, a
// served resource, or a nil client returns (false, err) wrapping
// ErrAbsenceUnconfirmed. Discovery (/api, /apis) is readable by every
// authenticated identity through the default system:discovery role.
func ConfirmAPIAbsent(ctx context.Context, disc discovery.DiscoveryInterface, gvr schema.GroupVersionResource) (bool, error) {
	if disc == nil {
		return false, fmt.Errorf("%w: no discovery client", ErrAbsenceUnconfirmed)
	}
	if err := ctx.Err(); err != nil {
		return false, fmt.Errorf("%w: %w", ErrAbsenceUnconfirmed, err)
	}
	if rc := restClientOf(disc); rc != nil {
		return confirmOverWire(ctx, rc, gvr)
	}
	return confirmTyped(disc, gvr)
}

// confirmOverWire reads each discovery document once, with the caller's
// context so cancellation reaches the transport, and decides from the same
// body it validated. A successful body that is not the expected discovery
// kind (a stub or an error page from an intermediary) is inconclusive.
func confirmOverWire(ctx context.Context, rc rest.Interface, gvr schema.GroupVersionResource) (bool, error) {
	// Every real API server serves the core group at /api.
	var core metav1.APIVersions
	if err := readDiscoveryDocument(ctx, rc, "/api", "APIVersions", "versions", &core); err != nil {
		return false, fmt.Errorf("%w: /api: %w", ErrAbsenceUnconfirmed, err)
	}
	if slices.Contains(core.Versions, "") {
		return false, fmt.Errorf("%w: /api lists an empty version", ErrAbsenceUnconfirmed)
	}
	if !slices.Contains(core.Versions, "v1") {
		return false, fmt.Errorf("%w: /api does not list the core group", ErrAbsenceUnconfirmed)
	}

	// The resource is absent only if no version of its group serves it: a
	// resource served at another version (a version skew, for example the
	// Auth CRD's v1alpha1 set to served: false during an upgrade, while a
	// sibling CRD keeps v1alpha1 listed) may still be the one being read.
	versions := core.Versions
	if gvr.Group != "" {
		var groups metav1.APIGroupList
		if err := readDiscoveryDocument(ctx, rc, "/apis", "APIGroupList", "groups", &groups); err != nil {
			return false, fmt.Errorf("%w: /apis: %w", ErrAbsenceUnconfirmed, err)
		}
		// /apis never lists the core group, so every entry needs a name.
		if err := validateGroupList(&groups, false); err != nil {
			return false, fmt.Errorf("%w: /apis: %w", ErrAbsenceUnconfirmed, err)
		}
		versions = groupVersions(&groups, gvr.Group)
	}

	// Each listed version's resource list is read once and searched as
	// validated; any unreadable list is inconclusive.
	for _, v := range versions {
		path := "/api/" + v
		if gvr.Group != "" {
			path = "/apis/" + gvr.Group + "/" + v
		}
		var resources metav1.APIResourceList
		if err := readDiscoveryDocument(ctx, rc, path, "APIResourceList", "resources", &resources); err != nil {
			return false, fmt.Errorf("%w: resource list: %w", ErrAbsenceUnconfirmed, err)
		}
		if absent, err := absentFrom(&resources, gvr, v); !absent {
			return false, err
		}
	}
	return true, nil
}

// confirmTyped serves clients without a REST transport (in-memory fakes),
// which return typed objects and have no response body to forge.
func confirmTyped(disc discovery.DiscoveryInterface, gvr schema.GroupVersionResource) (bool, error) {
	groups, err := disc.ServerGroups()
	if err != nil {
		return false, fmt.Errorf("%w: group list: %w", ErrAbsenceUnconfirmed, err)
	}
	if groups == nil {
		return false, fmt.Errorf("%w: empty group list", ErrAbsenceUnconfirmed)
	}
	// ServerGroups merges /api in as the unnamed core group.
	if err := validateGroupList(groups, true); err != nil {
		return false, fmt.Errorf("%w: group list: %w", ErrAbsenceUnconfirmed, err)
	}
	if !listsGroupVersion(groups, "", "v1") {
		return false, fmt.Errorf("%w: the group list does not include the core group", ErrAbsenceUnconfirmed)
	}
	for _, v := range groupVersions(groups, gvr.Group) {
		gv := schema.GroupVersion{Group: gvr.Group, Version: v}.String()
		resources, err := disc.ServerResourcesForGroupVersion(gv)
		if err != nil {
			return false, fmt.Errorf("%w: resource list: %w", ErrAbsenceUnconfirmed, err)
		}
		if resources == nil {
			return false, fmt.Errorf("%w: empty resource list", ErrAbsenceUnconfirmed)
		}
		if absent, err := absentFrom(resources, gvr, v); !absent {
			return false, err
		}
	}
	return true, nil
}

// absentFrom checks one version's resource list, which must belong to the
// group at that version: absent only if it does not list the resource. A hit
// at the requested version means the resource is served; a hit at another
// version is a version skew. Both are inconclusive.
func absentFrom(resources *metav1.APIResourceList, gvr schema.GroupVersionResource, version string) (bool, error) {
	gv := schema.GroupVersion{Group: gvr.Group, Version: version}.String()
	if resources.GroupVersion != gv {
		return false, fmt.Errorf("%w: the resource list is for %q, not %s", ErrAbsenceUnconfirmed, resources.GroupVersion, gv)
	}
	// An entry without a name or kind is incomplete: it could be the
	// resource, so its silence is not evidence of absence.
	for i, r := range resources.APIResources {
		if r.Name == "" || r.Kind == "" {
			return false, fmt.Errorf("%w: resource entry %d is incomplete", ErrAbsenceUnconfirmed, i)
		}
	}
	for _, r := range resources.APIResources {
		// A subresource ("auths/status") also shows the resource is served.
		if r.Name != gvr.Resource && !strings.HasPrefix(r.Name, gvr.Resource+"/") {
			continue
		}
		if version == gvr.Version {
			return false, fmt.Errorf("%w: the resource is served", ErrAbsenceUnconfirmed)
		}
		return false, errServedAtAnotherVersion
	}
	return true, nil
}

// validateGroupList rejects an incomplete group entry: absence is decided by
// matching names and group versions, so an entry missing either could be the
// group being looked for. Every group needs a name (only the merged core
// group, when allowCore, has none) and at least one version, and each version
// needs a version and the groupVersion that name and version imply. An
// explicit empty group list is still a valid answer.
func validateGroupList(groups *metav1.APIGroupList, allowCore bool) error {
	for i, g := range groups.Groups {
		if g.Name == "" && !allowCore {
			return fmt.Errorf("group entry %d has no name", i)
		}
		if len(g.Versions) == 0 {
			return fmt.Errorf("group entry %d has no versions", i)
		}
		for j, v := range g.Versions {
			want := v.Version
			if g.Name != "" {
				want = g.Name + "/" + v.Version
			}
			if v.Version == "" || v.GroupVersion == "" || v.GroupVersion != want {
				return fmt.Errorf("group entry %d version %d is incomplete", i, j)
			}
		}
	}
	return nil
}

// errServedAtAnotherVersion: the resource is served, only not at the version
// asked for. That is a version skew, not absence, so the caller keeps its
// restrictive path.
var errServedAtAnotherVersion = fmt.Errorf("%w: the resource is served at another version", ErrAbsenceUnconfirmed)

// groupVersions lists every version of the named group, across all of its
// entries.
func groupVersions(groups *metav1.APIGroupList, group string) []string {
	var versions []string
	for _, g := range groups.Groups {
		if g.Name != group {
			continue
		}
		for _, v := range g.Versions {
			if !slices.Contains(versions, v.Version) {
				versions = append(versions, v.Version)
			}
		}
	}
	return versions
}

func listsGroupVersion(groups *metav1.APIGroupList, group, groupVersion string) bool {
	for _, g := range groups.Groups {
		if g.Name != group {
			continue
		}
		for _, v := range g.Versions {
			if v.GroupVersion == groupVersion {
				return true
			}
		}
	}
	return false
}

// restClientOf returns disc's REST transport, or nil for a client without one.
func restClientOf(disc discovery.DiscoveryInterface) rest.Interface {
	rc := disc.RESTClient()
	if rc == nil || reflect.ValueOf(rc).IsNil() {
		return nil
	}
	return rc
}

// readDiscoveryDocument GETs path with ctx and decodes it into into,
// requiring the given kind and its list field (listKey). The list field is
// required by the discovery schema: a body without it, or with null, decodes
// to an empty list and would read as absence, so it is rejected; an explicit
// empty array is a valid answer.
func readDiscoveryDocument(ctx context.Context, rc rest.Interface, path, kind, listKey string, into any) error {
	raw, err := rc.Get().AbsPath(path).SetHeader("Accept", "application/json").Do(ctx).Raw()
	if err != nil {
		return err
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return fmt.Errorf("not a discovery document: %w", err)
	}
	var gotKind string
	if err := json.Unmarshal(fields["kind"], &gotKind); err != nil || gotKind != kind {
		return fmt.Errorf("the response is not an %s", kind)
	}
	if list := bytes.TrimSpace(fields[listKey]); len(list) == 0 || list[0] != '[' {
		return fmt.Errorf("the %s has no %q list", kind, listKey)
	}
	if err := json.Unmarshal(raw, into); err != nil {
		return fmt.Errorf("not a discovery document: %w", err)
	}
	return nil
}
