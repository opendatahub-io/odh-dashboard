package k8sutil

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
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
// the resource. Over the wire, the /apis body and the group version's resource
// list must decode as an APIGroupList and an APIResourceList; a malformed
// successful body is inconclusive, while a valid empty list still counts.
//
// It returns (true, nil) only on confirmed absence. Any discovery failure, a
// served resource, or a nil client returns (false, err) wrapping
// ErrAbsenceUnconfirmed. Discovery (/api, /apis) is readable by every
// authenticated identity through the default system:discovery role.
func ConfirmAPIAbsent(ctx context.Context, disc discovery.DiscoveryInterface, gvr schema.GroupVersionResource) (bool, error) {
	if disc == nil {
		return false, fmt.Errorf("%w: no discovery client", ErrAbsenceUnconfirmed)
	}
	gv := gvr.GroupVersion().String()

	type result struct {
		absent bool
		err    error
	}
	done := make(chan result, 1)
	go func() {
		absent, err := confirmAPIAbsent(ctx, disc, gvr, gv)
		done <- result{absent, err}
	}()
	select {
	case r := <-done:
		return r.absent, r.err
	case <-ctx.Done():
		// The discovery client takes no context; give up waiting instead.
		return false, fmt.Errorf("%w: %w", ErrAbsenceUnconfirmed, ctx.Err())
	}
}

func confirmAPIAbsent(ctx context.Context, disc discovery.DiscoveryInterface, gvr schema.GroupVersionResource, gv string) (bool, error) {
	groups, err := disc.ServerGroups()
	if err != nil {
		return false, fmt.Errorf("%w: group list: %w", ErrAbsenceUnconfirmed, err)
	}
	if groups == nil {
		return false, fmt.Errorf("%w: empty group list", ErrAbsenceUnconfirmed)
	}
	// Every real API server serves the core group. An answer without it is
	// not a discovery document (a stub or an error page from an
	// intermediary), so its silence about gvr proves nothing.
	if !listsGroupVersion(groups, "", "v1") {
		return false, fmt.Errorf("%w: the group list does not include the core group", ErrAbsenceUnconfirmed)
	}
	// The core group comes from /api; the other groups come from /apis. A
	// successful /apis body that is not an APIGroupList (for example
	// {"message": "..."}) decodes to no groups without error, so /apis is read
	// and validated on its own before its silence counts.
	if gvr.Group != "" {
		apis, err := validatedGroupList(ctx, disc)
		if err != nil {
			return false, fmt.Errorf("%w: /apis: %w", ErrAbsenceUnconfirmed, err)
		}
		if apis != nil {
			groups = apis
		}
	}
	if !listsGroupVersion(groups, gvr.Group, gv) {
		return true, nil
	}

	// The group version is listed, so a missing resource list now contradicts
	// discovery and is not evidence of absence.
	resources, err := disc.ServerResourcesForGroupVersion(gv)
	if err != nil {
		return false, fmt.Errorf("%w: resource list: %w", ErrAbsenceUnconfirmed, err)
	}
	if resources == nil {
		return false, fmt.Errorf("%w: empty resource list", ErrAbsenceUnconfirmed)
	}
	// A malformed successful body decodes to an empty resource list (client-go
	// fills in the group version), which would otherwise read as absence.
	if err := validateResourceList(ctx, disc, gvr); err != nil {
		return false, fmt.Errorf("%w: resource list: %w", ErrAbsenceUnconfirmed, err)
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

// validatedGroupList reads /apis and returns it only if the body is an
// APIGroupList. A client without a REST transport (an in-memory fake) has no
// response body to validate and returns (nil, nil), so the caller keeps the
// typed ServerGroups result.
func validatedGroupList(ctx context.Context, disc discovery.DiscoveryInterface) (*metav1.APIGroupList, error) {
	var list metav1.APIGroupList
	ok, err := readDiscoveryDocument(ctx, disc, "/apis", "APIGroupList", &list)
	if err != nil || !ok {
		return nil, err
	}
	return &list, nil
}

// validateResourceList checks that the group version's resource list is an
// APIResourceList (nil for an in-memory fake, as in validatedGroupList).
func validateResourceList(ctx context.Context, disc discovery.DiscoveryInterface, gvr schema.GroupVersionResource) error {
	path := "/api/" + gvr.Version
	if gvr.Group != "" {
		path = "/apis/" + gvr.Group + "/" + gvr.Version
	}
	var list metav1.APIResourceList
	_, err := readDiscoveryDocument(ctx, disc, path, "APIResourceList", &list)
	return err
}

// readDiscoveryDocument GETs path and decodes it into into, requiring the
// given kind. It returns false without error when disc has no REST transport.
func readDiscoveryDocument(ctx context.Context, disc discovery.DiscoveryInterface, path, kind string, into any) (bool, error) {
	rc := disc.RESTClient()
	if rc == nil || reflect.ValueOf(rc).IsNil() {
		return false, nil
	}
	raw, err := rc.Get().AbsPath(path).SetHeader("Accept", "application/json").Do(ctx).Raw()
	if err != nil {
		return false, err
	}
	var meta metav1.TypeMeta
	if err := json.Unmarshal(raw, &meta); err != nil {
		return false, fmt.Errorf("not a discovery document: %w", err)
	}
	if meta.Kind != kind {
		return false, fmt.Errorf("the response is not an %s", kind)
	}
	if err := json.Unmarshal(raw, into); err != nil {
		return false, fmt.Errorf("not a discovery document: %w", err)
	}
	return true, nil
}
