package k8sutil

import (
	"context"
	"errors"
	"fmt"

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
// discovery answer: the group list does not include the group version, or the
// group version's resource list does not include the resource.
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
		absent, err := confirmAPIAbsent(disc, gvr, gv)
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

func confirmAPIAbsent(disc discovery.DiscoveryInterface, gvr schema.GroupVersionResource, gv string) (bool, error) {
	groups, err := disc.ServerGroups()
	if err != nil {
		return false, fmt.Errorf("%w: group list: %w", ErrAbsenceUnconfirmed, err)
	}
	if groups == nil {
		return false, fmt.Errorf("%w: empty group list", ErrAbsenceUnconfirmed)
	}
	served := false
	for _, g := range groups.Groups {
		if g.Name != gvr.Group {
			continue
		}
		for _, v := range g.Versions {
			if v.GroupVersion == gv {
				served = true
			}
		}
	}
	if !served {
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
	for _, r := range resources.APIResources {
		if r.Name == gvr.Resource {
			return false, fmt.Errorf("%w: the resource is served", ErrAbsenceUnconfirmed)
		}
	}
	return true, nil
}
