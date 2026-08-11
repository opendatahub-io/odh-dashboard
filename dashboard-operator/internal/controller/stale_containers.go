package controller

import (
	"context"
	"encoding/json"
	"fmt"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// removeStaleContainers patches live Deployments to delete containers that
// exist in the cluster but are absent from the desired manifests. This
// resolves SSA field-manager splits where an old manager still owns
// containers that a newer manager's manifest intentionally omits
// (RHOAIENG-81952).
func removeStaleContainers(ctx context.Context, cli client.Client, resources []unstructured.Unstructured) error {
	logger := log.FromContext(ctx)

	for i := range resources {
		res := &resources[i]
		if res.GetKind() != "Deployment" || res.GroupVersionKind().Group != "apps" {
			continue
		}

		live := &unstructured.Unstructured{}
		live.SetGroupVersionKind(res.GroupVersionKind())
		key := client.ObjectKeyFromObject(res)

		if err := cli.Get(ctx, key, live); err != nil {
			if k8serrors.IsNotFound(err) {
				continue
			}
			return fmt.Errorf("getting live deployment %s: %w", key, err)
		}

		patch, err := buildStaleContainerPatch(live, res)
		if err != nil {
			return fmt.Errorf("building stale container patch for %s: %w", key, err)
		}
		if patch == nil {
			continue
		}

		patchBytes, err := json.Marshal(patch)
		if err != nil {
			return fmt.Errorf("marshalling stale container patch for %s: %w", key, err)
		}

		logger.Info("Removing stale containers before SSA", "deployment", key, "patch", string(patchBytes))

		if err := cli.Patch(ctx, live, client.RawPatch(types.StrategicMergePatchType, patchBytes)); err != nil {
			return fmt.Errorf("patching stale containers for %s: %w", key, err)
		}
	}

	return nil
}

func buildStaleContainerPatch(live, desired *unstructured.Unstructured) (map[string]interface{}, error) {
	liveContainers, liveFound, err := unstructured.NestedSlice(live.Object, "spec", "template", "spec", "containers")
	if err != nil {
		return nil, fmt.Errorf("reading live containers: %w", err)
	}
	if !liveFound {
		return nil, nil
	}

	desiredContainers, desiredFound, err := unstructured.NestedSlice(desired.Object, "spec", "template", "spec", "containers")
	if err != nil {
		return nil, fmt.Errorf("reading desired containers: %w", err)
	}
	if !desiredFound || len(desiredContainers) == 0 {
		return nil, fmt.Errorf("desired Deployment has no containers")
	}

	desiredNames := make(map[string]struct{}, len(desiredContainers))
	for _, c := range desiredContainers {
		cMap, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		if name, ok := cMap["name"].(string); ok {
			desiredNames[name] = struct{}{}
		}
	}

	var deleteEntries []interface{}
	for _, c := range liveContainers {
		cMap, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		name, ok := cMap["name"].(string)
		if !ok {
			continue
		}
		if _, wanted := desiredNames[name]; !wanted {
			deleteEntries = append(deleteEntries, map[string]interface{}{
				"$patch": "delete",
				"name":   name,
			})
		}
	}

	if len(deleteEntries) == 0 {
		return nil, nil
	}

	return map[string]interface{}{
		"spec": map[string]interface{}{
			"template": map[string]interface{}{
				"spec": map[string]interface{}{
					"containers": deleteEntries,
				},
			},
		},
	}, nil
}
