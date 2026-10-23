package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// revertServicePortDrift replaces a live Service's port list when an external
// field manager changes an associative-list key such as spec.ports[*].port.
// ForceOwnership alone cannot remove the now externally owned list entry, so
// SSA would otherwise try to add the desired entry alongside it and may fail
// validation on duplicate port names (RHOAIENG-78639).
func revertServicePortDrift(
	ctx context.Context,
	reader client.Reader,
	writer client.Client,
	resources []unstructured.Unstructured,
) error {
	logger := log.FromContext(ctx)

	for i := range resources {
		desired := &resources[i]
		if desired.GetKind() != "Service" || desired.GroupVersionKind().Group != "" {
			continue
		}

		live := &unstructured.Unstructured{}
		live.SetGroupVersionKind(desired.GroupVersionKind())
		key := client.ObjectKeyFromObject(desired)
		if err := reader.Get(ctx, key, live); err != nil {
			if k8serrors.IsNotFound(err) {
				continue
			}
			return fmt.Errorf("getting live Service %s: %w", key, err)
		}

		patch, err := buildServicePortDriftPatch(live, desired)
		if err != nil {
			return fmt.Errorf("building Service port drift patch for %s: %w", key, err)
		}
		if patch == nil {
			continue
		}

		patchBytes, err := json.Marshal(patch)
		if err != nil {
			return fmt.Errorf("marshalling Service port drift patch for %s: %w", key, err)
		}
		logger.Info("Restoring Service ports before SSA", "service", key)
		if err := writer.Patch(
			ctx,
			live,
			client.RawPatch(types.MergePatchType, patchBytes),
			client.FieldOwner("dashboard-operator"),
		); err != nil {
			return fmt.Errorf("patching Service port drift for %s: %w", key, err)
		}
	}

	return nil
}

func buildServicePortDriftPatch(live, desired *unstructured.Unstructured) (map[string]any, error) {
	livePorts, liveFound, err := unstructured.NestedSlice(live.Object, "spec", "ports")
	if err != nil {
		return nil, fmt.Errorf("reading live ports: %w", err)
	}
	desiredPorts, desiredFound, err := unstructured.NestedSlice(desired.Object, "spec", "ports")
	if err != nil {
		return nil, fmt.Errorf("reading desired ports: %w", err)
	}
	if !liveFound || !desiredFound || servicePortsMatch(livePorts, desiredPorts) {
		return nil, nil
	}

	replacement := runtime.DeepCopyJSONValue(desiredPorts).([]any)
	preserveAllocatedNodePorts(livePorts, replacement)

	return map[string]any{"spec": map[string]any{"ports": replacement}}, nil
}

func servicePortsMatch(livePorts, desiredPorts []any) bool {
	if len(livePorts) != len(desiredPorts) {
		return false
	}

	used := make([]bool, len(livePorts))
	for _, desiredPort := range desiredPorts {
		desired, ok := desiredPort.(map[string]any)
		if !ok {
			return false
		}
		match := -1
		for i, livePort := range livePorts {
			if used[i] {
				continue
			}
			live, ok := livePort.(map[string]any)
			if ok && sameServicePortIdentity(live, desired) && desiredServicePortFieldsMatch(live, desired) {
				match = i
				break
			}
		}
		if match < 0 {
			return false
		}
		used[match] = true
	}
	return true
}

func sameServicePortIdentity(live, desired map[string]any) bool {
	desiredName, _ := desired["name"].(string)
	if desiredName != "" {
		liveName, _ := live["name"].(string)
		return liveName == desiredName
	}
	return reflect.DeepEqual(live["port"], desired["port"]) &&
		normalizedProtocol(live) == normalizedProtocol(desired)
}

func desiredServicePortFieldsMatch(live, desired map[string]any) bool {
	if normalizedProtocol(live) != normalizedProtocol(desired) {
		return false
	}
	liveTargetPort := live["targetPort"]
	if liveTargetPort == nil {
		liveTargetPort = live["port"]
	}
	desiredTargetPort := desired["targetPort"]
	if desiredTargetPort == nil {
		desiredTargetPort = desired["port"]
	}
	if !reflect.DeepEqual(liveTargetPort, desiredTargetPort) {
		return false
	}

	for key, desiredValue := range desired {
		if key == "nodePort" || key == "protocol" || key == "targetPort" {
			continue
		}
		liveValue := live[key]
		if !reflect.DeepEqual(liveValue, desiredValue) {
			return false
		}
	}
	return true
}

func normalizedProtocol(port map[string]any) string {
	protocol, _ := port["protocol"].(string)
	if protocol == "" {
		return "TCP"
	}
	return protocol
}

func preserveAllocatedNodePorts(livePorts, desiredPorts []any) {
	for _, desiredPort := range desiredPorts {
		desired, ok := desiredPort.(map[string]any)
		if !ok || desired["nodePort"] != nil {
			continue
		}
		for _, livePort := range livePorts {
			live, ok := livePort.(map[string]any)
			if !ok || !sameServicePortIdentity(live, desired) {
				continue
			}
			if nodePort, exists := live["nodePort"]; exists {
				desired["nodePort"] = nodePort
			}
			break
		}
	}
}
