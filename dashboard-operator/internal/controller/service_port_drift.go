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

const managedAnnotation = "opendatahub.io/managed"

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
		if servicePortRepairOptedOut(desired) {
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
		if servicePortRepairOptedOut(live) {
			continue
		}

		patch, err := buildServicePortDriftPatch(live, desired)
		if err != nil {
			return fmt.Errorf("building Service port drift patch for %s: %w", key, err)
		}
		if _, desiredFound, err := unstructured.NestedSlice(desired.Object, "spec", "ports"); err == nil && !desiredFound {
			logger.Info("Skipping Service port drift check because the desired Service has no spec.ports", "service", key)
		}
		if patch == nil {
			continue
		}

		patchBytes, err := json.Marshal(patch)
		if err != nil {
			return fmt.Errorf("marshalling Service port drift patch for %s: %w", key, err)
		}
		// A JSON merge patch intentionally replaces the complete list. A strategic
		// merge would retain the externally owned associative-list entry.
		if err := writer.Patch(
			ctx,
			live,
			client.RawPatch(types.MergePatchType, patchBytes),
			client.FieldOwner("dashboard-operator"),
		); err != nil {
			return fmt.Errorf("patching Service port drift for %s: %w", key, err)
		}
		logger.Info("Restored Service ports before SSA", "service", key)
	}

	return nil
}

func servicePortRepairOptedOut(service *unstructured.Unstructured) bool {
	return service.GetAnnotations()[managedAnnotation] == "false"
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

	rawReplacement := runtime.DeepCopyJSONValue(desiredPorts)
	replacement, ok := rawReplacement.([]any)
	if !ok {
		return nil, fmt.Errorf("copying desired ports returned unexpected type %T", rawReplacement)
	}
	preserveAllocatedNodePorts(livePorts, replacement)

	return map[string]any{"spec": map[string]any{"ports": replacement}}, nil
}

func servicePortsMatch(livePorts, desiredPorts []any) bool {
	if len(livePorts) != len(desiredPorts) {
		return false
	}

	// Services conventionally expose only a handful of ports, so the quadratic
	// matching keeps the comparison simple while remaining negligible in cost.
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
	return servicePortNumberEqual(live["port"], desired["port"]) &&
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
	if !servicePortValueEqual(liveTargetPort, desiredTargetPort) {
		return false
	}

	for key, desiredValue := range desired {
		if key == "nodePort" || key == "protocol" || key == "targetPort" {
			continue
		}
		liveValue := live[key]
		if key == "port" {
			if !servicePortNumberEqual(liveValue, desiredValue) {
				return false
			}
			continue
		}
		if !reflect.DeepEqual(liveValue, desiredValue) {
			return false
		}
	}
	for key := range live {
		if key == "nodePort" || key == "protocol" || key == "targetPort" || key == "port" {
			continue
		}
		if _, exists := desired[key]; !exists {
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

func servicePortValueEqual(live, desired any) bool {
	if liveNumber, liveOK := servicePortNumber(live); liveOK {
		desiredNumber, desiredOK := servicePortNumber(desired)
		return desiredOK && liveNumber == desiredNumber
	}
	if _, desiredOK := servicePortNumber(desired); desiredOK {
		return false
	}
	return reflect.DeepEqual(live, desired)
}

func servicePortNumberEqual(live, desired any) bool {
	liveNumber, liveOK := servicePortNumber(live)
	desiredNumber, desiredOK := servicePortNumber(desired)
	return liveOK && desiredOK && liveNumber == desiredNumber
}

func servicePortNumber(value any) (int64, bool) {
	switch number := value.(type) {
	case int:
		return int64(number), true
	case int32:
		return int64(number), true
	case int64:
		return number, true
	case float64:
		converted := int64(number)
		return converted, float64(converted) == number
	default:
		return 0, false
	}
}

func preserveAllocatedNodePorts(livePorts, desiredPorts []any) {
	for desiredIndex, desiredPort := range desiredPorts {
		desired, ok := desiredPort.(map[string]any)
		if !ok || hasExplicitNodePort(desired) {
			continue
		}
		var matchingLive map[string]any
		for _, livePort := range livePorts {
			live, ok := livePort.(map[string]any)
			if !ok || !sameServicePortIdentity(live, desired) {
				continue
			}
			matchingLive = live
			break
		}
		if matchingLive == nil && desiredPortIsUnnamed(desired) && desiredIndex < len(livePorts) {
			live, ok := livePorts[desiredIndex].(map[string]any)
			if ok && desiredPortIsUnnamed(live) && normalizedProtocol(live) == normalizedProtocol(desired) {
				matchingLive = live
			}
		}
		if matchingLive == nil {
			matchingLive = uniquelyMatchingLivePort(livePorts, desired)
		}
		if nodePort, exists := matchingLive["nodePort"]; exists {
			desired["nodePort"] = nodePort
		}
	}
}

// uniquelyMatchingLivePort preserves an allocation when a named port was
// renamed but its externally visible port and protocol did not change. It
// deliberately declines ambiguous matches rather than copying the wrong
// allocation between ports.
func uniquelyMatchingLivePort(livePorts []any, desired map[string]any) map[string]any {
	var match map[string]any
	for _, livePort := range livePorts {
		live, ok := livePort.(map[string]any)
		if !ok || !servicePortNumberEqual(live["port"], desired["port"]) ||
			normalizedProtocol(live) != normalizedProtocol(desired) {
			continue
		}
		if match != nil {
			return nil
		}
		match = live
	}
	return match
}

func desiredPortIsUnnamed(port map[string]any) bool {
	name, _ := port["name"].(string)
	return name == ""
}

func hasExplicitNodePort(port map[string]any) bool {
	nodePort, exists := port["nodePort"]
	if !exists || nodePort == nil {
		return false
	}
	number, numeric := servicePortNumber(nodePort)
	return !numeric || number != 0
}
