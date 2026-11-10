package mocks

import (
	"context"
	"fmt"
)

// ReadUsageDashboard mirrors the production named dashboard reader for local mock mode.
func ReadUsageDashboard(_ context.Context, namespace, name string) (map[string]any, error) {
	if name != "dashboard-5-maas-usage-logs" && name != "dashboard-4-maas-usage-logs-admin" {
		return nil, fmt.Errorf("unknown mock usage dashboard %q", name)
	}
	title := "My Usage"
	if name == "dashboard-4-maas-usage-logs-admin" {
		title = "Usage"
	}
	return map[string]any{
		"kind": "Dashboard",
		"metadata": map[string]any{
			"name": name, "project": namespace, "version": 1,
			"createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-01T00:00:00Z",
		},
		"spec": map[string]any{
			"display":  map[string]any{"name": title},
			"duration": "1h", "datasources": map[string]any{},
			"panels": map[string]any{}, "layouts": []any{}, "variables": []any{},
		},
	}, nil
}
