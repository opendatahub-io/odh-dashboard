package maputil

import "encoding/json"

// DeepMerge recursively merges overrides into defaults.
// Override values take precedence. Maps are merged recursively.
// Nested maps from defaults are deep-copied so the original defaults are never mutated.
func DeepMerge(defaults, overrides map[string]any) map[string]any {
	result := make(map[string]any, len(defaults))
	for k, v := range defaults {
		if vMap, ok := v.(map[string]any); ok {
			result[k] = DeepCopyMap(vMap)
		} else {
			result[k] = v
		}
	}
	for k, v := range overrides {
		if vMap, ok := v.(map[string]any); ok {
			if dMap, ok := result[k].(map[string]any); ok {
				result[k] = DeepMerge(dMap, vMap)
				continue
			}
		}
		result[k] = v
	}
	return result
}

// DeepCopyMap returns a recursive copy of a map[string]any.
// Only nested map[string]any values are deep-copied; other composite types
// (slices, pointers) are shallow-copied. This is sufficient for the
// dashboard-config merge path where post-merge mutations target only
// nested map values, never slices.
func DeepCopyMap(m map[string]any) map[string]any {
	cp := make(map[string]any, len(m))
	for k, v := range m {
		if vMap, ok := v.(map[string]any); ok {
			cp[k] = DeepCopyMap(vMap)
		} else {
			cp[k] = v
		}
	}
	return cp
}

// ToUnstructuredMap converts a typed Go struct to a map[string]any via JSON round-trip.
func ToUnstructuredMap(obj any) (map[string]any, error) {
	data, err := json.Marshal(obj)
	if err != nil {
		return nil, err
	}
	var result map[string]any
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}
