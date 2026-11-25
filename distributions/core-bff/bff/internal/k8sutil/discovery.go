package k8sutil

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"slices"

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
// document) and either does not list the group version or lists it without
// the resource. Over the wire each document (/api, /apis, the group
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
	gv := gvr.GroupVersion().String()

	// Every real API server serves the core group at /api.
	var core metav1.APIVersions
	if err := readDiscoveryDocument(ctx, rc, "/api", "APIVersions", "versions", &core); err != nil {
		return false, fmt.Errorf("%w: /api: %w", ErrAbsenceUnconfirmed, err)
	}
	if !slices.Contains(core.Versions, "v1") {
		return false, fmt.Errorf("%w: /api does not list the core group", ErrAbsenceUnconfirmed)
	}

	listed := slices.Contains(core.Versions, gvr.Version)
	resourcesPath := "/api/" + gvr.Version
	if gvr.Group != "" {
		var groups metav1.APIGroupList
		if err := readDiscoveryDocument(ctx, rc, "/apis", "APIGroupList", "groups", &groups); err != nil {
			return false, fmt.Errorf("%w: /apis: %w", ErrAbsenceUnconfirmed, err)
		}
		listed = listsGroupVersion(&groups, gvr.Group, gv)
		resourcesPath = "/apis/" + gvr.Group + "/" + gvr.Version
	}
	if !listed {
		return true, nil
	}

	// The group version is listed, so its resource list decides; it is read
	// once and searched as validated.
	var resources metav1.APIResourceList
	if err := readDiscoveryDocument(ctx, rc, resourcesPath, "APIResourceList", "resources", &resources); err != nil {
		return false, fmt.Errorf("%w: resource list: %w", ErrAbsenceUnconfirmed, err)
	}
	return absentFrom(&resources, gvr, gv)
}

// confirmTyped serves clients without a REST transport (in-memory fakes),
// which return typed objects and have no response body to forge.
func confirmTyped(disc discovery.DiscoveryInterface, gvr schema.GroupVersionResource) (bool, error) {
	gv := gvr.GroupVersion().String()
	groups, err := disc.ServerGroups()
	if err != nil {
		return false, fmt.Errorf("%w: group list: %w", ErrAbsenceUnconfirmed, err)
	}
	if groups == nil {
		return false, fmt.Errorf("%w: empty group list", ErrAbsenceUnconfirmed)
	}
	if !listsGroupVersion(groups, "", "v1") {
		return false, fmt.Errorf("%w: the group list does not include the core group", ErrAbsenceUnconfirmed)
	}
	if !listsGroupVersion(groups, gvr.Group, gv) {
		return true, nil
	}
	resources, err := disc.ServerResourcesForGroupVersion(gv)
	if err != nil {
		return false, fmt.Errorf("%w: resource list: %w", ErrAbsenceUnconfirmed, err)
	}
	if resources == nil {
		return false, fmt.Errorf("%w: empty resource list", ErrAbsenceUnconfirmed)
	}
	return absentFrom(resources, gvr, gv)
}

// absentFrom decides from a resource list that must belong to gv: absent only
// if it does not list the resource.
func absentFrom(resources *metav1.APIResourceList, gvr schema.GroupVersionResource, gv string) (bool, error) {
	if resources.GroupVersion != gv {
		return false, fmt.Errorf("%w: the resource list is for %q, not %s", ErrAbsenceUnconfirmed, resources.GroupVersion, gv)
	}
	for _, r := range resources.APIResources {
		if r.Name == gvr.Resource {
			return false, fmt.Errorf("%w: the resource is served", ErrAbsenceUnconfirmed)
		}
	}
	return true, nil
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
