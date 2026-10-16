package pipelines

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// GetDSPAStatus reports the current readiness state of the pipeline server in the
// namespace. Unlike DiscoverReadyDSPA, it always reads a fresh (uncached) DSPA list:
// the discovery cache can briefly report a previously-ready server while the resource
// is restarting, which status polling must never do.
//
// "not-found" and "starting" are reported as ordinary status values, not errors, so
// callers can distinguish them from real failures.
func (s *service) GetDSPAStatus(ctx context.Context, namespace string) (*DSPAStatus, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Debug("getting DSPA status", "namespace", namespace)

	if namespace == "" {
		return nil, fmt.Errorf("%w: namespace is required", ErrInvalidInput)
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

	// Deliberately uncached — see the method comment.
	dspas, err := s.K8sService.ListResources(ctx, dspaGVR, namespace)
	if err != nil {
		s.Logger.Error("failed to list DSPAs", "namespace", namespace, "error", err)
		return nil, fmt.Errorf("failed to list DSPAs in namespace %s: %w", namespace, err)
	}

	if len(dspas.Items) == 0 {
		return &DSPAStatus{Status: DSPAStatusNotFound}, nil
	}

	for i := range dspas.Items {
		dspa := &dspas.Items[i]
		ready, err := isDSPAReady(dspa.Object)
		if err != nil {
			return nil, err
		}
		if ready {
			logger.Debug("found ready DSPA", "name", dspa.GetName(), "namespace", namespace)
			return &DSPAStatus{Status: DSPAStatusReady, DSPAName: dspa.GetName()}, nil
		}
	}

	return &DSPAStatus{Status: DSPAStatusStarting, DSPAName: dspas.Items[0].GetName()}, nil
}

// isDSPAReady reports whether a DSPA object's Ready condition is True for its current
// generation. Ready is the aggregate condition set by the DSPA controller — it is True
// only when all sub-conditions (APIServerReady, DatabaseReady, PersistenceAgentReady,
// etc.) are also True.
//
// A Ready condition from an older generation than metadata.generation is ignored when
// the operator reports observedGeneration: a restarting server briefly keeps a stale
// Ready condition. A missing conditions list simply means not ready; a malformed one
// returns ErrInvalidDSPAConditions so callers never mistake garbage for a definitive
// state.
func isDSPAReady(obj map[string]any) (bool, error) {
	conditions, found, err := unstructured.NestedSlice(obj, "status", "conditions")
	if err != nil {
		return false, fmt.Errorf("%w: conditions could not be parsed", ErrInvalidDSPAConditions)
	}
	if !found {
		return false, nil
	}

	generation, _, _ := unstructured.NestedInt64(obj, "metadata", "generation")

	for _, cond := range conditions {
		condMap, ok := cond.(map[string]any)
		if !ok {
			return false, fmt.Errorf("%w: condition entries must be objects", ErrInvalidDSPAConditions)
		}
		if condMap["type"] != "Ready" || condMap["status"] != "True" {
			continue
		}
		// A missing generation or observedGeneration always matches — mirroring the
		// dashboard-side readiness check.
		if generation == 0 {
			return true, nil
		}
		observed, ok := toInt64(condMap["observedGeneration"])
		if !ok || observed == generation {
			return true, nil
		}
		// Stale generation — the Ready condition belongs to a previous revision.
	}
	return false, nil
}

// toInt64 normalizes the numeric types JSON decoding can produce for integers.
func toInt64(v any) (int64, bool) {
	switch n := v.(type) {
	case int64:
		return n, true
	case int:
		return int64(n), true
	case float64:
		return int64(n), true
	default:
		return 0, false
	}
}
