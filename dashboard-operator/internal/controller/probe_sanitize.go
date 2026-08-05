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

var probeHandlerTypes = []string{"exec", "httpGet", "tcpSocket", "grpc"}

func sanitizeDeploymentProbes(ctx context.Context, cli client.Client, resources []unstructured.Unstructured) error {
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

		patch := buildProbeCleanupPatch(live, res)
		if patch == nil {
			continue
		}

		patchBytes, err := json.Marshal(patch)
		if err != nil {
			return fmt.Errorf("marshalling probe cleanup patch for %s: %w", key, err)
		}

		logger.Info("Sanitizing conflicting probe handlers before SSA", "deployment", key)

		if err := cli.Patch(ctx, live, client.RawPatch(types.StrategicMergePatchType, patchBytes)); err != nil {
			return fmt.Errorf("patching conflicting probes for %s: %w", key, err)
		}
	}

	return nil
}

func buildProbeCleanupPatch(live, desired *unstructured.Unstructured) map[string]interface{} {
	liveContainers, _, _ := unstructured.NestedSlice(live.Object, "spec", "template", "spec", "containers")
	desiredContainers, _, _ := unstructured.NestedSlice(desired.Object, "spec", "template", "spec", "containers")

	desiredByName := make(map[string]map[string]interface{}, len(desiredContainers))
	for _, c := range desiredContainers {
		cMap, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := cMap["name"].(string)
		if name != "" {
			desiredByName[name] = cMap
		}
	}

	var patchContainers []interface{}

	for _, c := range liveContainers {
		liveC, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := liveC["name"].(string)
		desiredC, exists := desiredByName[name]
		if !exists {
			continue
		}

		containerPatch := map[string]interface{}{"name": name}
		hasConflict := false

		for _, probeField := range []string{"livenessProbe", "readinessProbe", "startupProbe"} {
			nullFields := conflictingHandlerFields(liveC, desiredC, probeField)
			if len(nullFields) > 0 {
				probePatch := make(map[string]interface{}, len(nullFields)+1)
				for _, f := range nullFields {
					probePatch[f] = nil
				}
				desiredProbe, _ := desiredC[probeField].(map[string]interface{})
				for _, h := range probeHandlerTypes {
					if val, ok := desiredProbe[h]; ok {
						probePatch[h] = val
						break
					}
				}
				containerPatch[probeField] = probePatch
				hasConflict = true
			}
		}

		if hasConflict {
			patchContainers = append(patchContainers, containerPatch)
		}
	}

	if len(patchContainers) == 0 {
		return nil
	}

	return map[string]interface{}{
		"spec": map[string]interface{}{
			"template": map[string]interface{}{
				"spec": map[string]interface{}{
					"containers": patchContainers,
				},
			},
		},
	}
}

func conflictingHandlerFields(liveContainer, desiredContainer map[string]interface{}, probeField string) []string {
	liveProbe, _ := liveContainer[probeField].(map[string]interface{})
	desiredProbe, _ := desiredContainer[probeField].(map[string]interface{})

	if liveProbe == nil || desiredProbe == nil {
		return nil
	}

	desiredType := ""
	for _, h := range probeHandlerTypes {
		if _, ok := desiredProbe[h]; ok {
			desiredType = h
			break
		}
	}
	if desiredType == "" {
		return nil
	}

	var stale []string
	for _, h := range probeHandlerTypes {
		if h == desiredType {
			continue
		}
		if _, ok := liveProbe[h]; ok {
			stale = append(stale, h)
		}
	}

	return stale
}
