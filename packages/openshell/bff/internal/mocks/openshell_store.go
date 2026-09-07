package mocks

import (
	"fmt"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

const emptyLabelSelector = "openshell.mock/empty"

// OpenShellStore serves upstream-shaped workspace and sandbox fixtures for mock mode.
type OpenShellStore struct{}

func NewOpenShellStore() *OpenShellStore {
	return &OpenShellStore{}
}

func (s *OpenShellStore) ListWorkspaces(labelSelector string) []models.Workspace {
	if labelSelector == emptyLabelSelector {
		return []models.Workspace{}
	}
	return cloneWorkspaces(sampleWorkspaces)
}

func (s *OpenShellStore) GetWorkspace(name string) (*models.Workspace, error) {
	for _, workspace := range sampleWorkspaces {
		if workspace.Metadata.Name == name {
			ws := workspace
			return &ws, nil
		}
	}
	return nil, fmt.Errorf("workspace %q not found", name)
}

func (s *OpenShellStore) ListSandboxes(workspace string, labelSelector string) ([]models.Sandbox, error) {
	if _, err := s.GetWorkspace(workspace); err != nil {
		return nil, err
	}
	if labelSelector == emptyLabelSelector {
		return []models.Sandbox{}, nil
	}
	out := make([]models.Sandbox, 0)
	for _, sandbox := range sampleSandboxes {
		if sandbox.Metadata.Workspace == workspace {
			out = append(out, sandbox)
		}
	}
	return out, nil
}

func (s *OpenShellStore) GetSandbox(workspace, name string) (*models.Sandbox, error) {
	if _, err := s.GetWorkspace(workspace); err != nil {
		return nil, err
	}
	for _, sandbox := range sampleSandboxes {
		if sandbox.Metadata.Workspace == workspace && sandbox.Metadata.Name == name {
			sb := sandbox
			return &sb, nil
		}
	}
	return nil, fmt.Errorf("sandbox %q not found in workspace %q", name, workspace)
}

func cloneWorkspaces(workspaces []models.Workspace) []models.Workspace {
	out := make([]models.Workspace, len(workspaces))
	for i, workspace := range workspaces {
		out[i] = workspace
		if workspace.Metadata.Labels != nil {
			out[i].Metadata.Labels = copyStringMap(workspace.Metadata.Labels)
		}
		if workspace.Metadata.Annotations != nil {
			out[i].Metadata.Annotations = copyStringMap(workspace.Metadata.Annotations)
		}
	}
	return out
}

func copyStringMap(in map[string]string) map[string]string {
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func IsNotFound(err error) bool {
	return err != nil && strings.Contains(err.Error(), "not found")
}

var sampleWorkspaces = []models.Workspace{
	{
		Metadata: models.ObjectMeta{
			ID:              "ws-default-id",
			Name:            "default",
			Labels:          map[string]string{},
			Annotations:     map[string]string{},
			CreatedAtMs:     1722700000000,
			ResourceVersion: 1,
		},
		Phase: models.WorkspacePhaseActive,
	},
	{
		Metadata: models.ObjectMeta{
			ID:              "ws-dev-id",
			Name:            "dev-team",
			Labels:          map[string]string{"env": "development"},
			Annotations:     map[string]string{},
			CreatedAtMs:     1722700100000,
			ResourceVersion: 2,
		},
		Phase: models.WorkspacePhaseActive,
	},
	{
		Metadata: models.ObjectMeta{
			ID:              "ws-staging-id",
			Name:            "staging",
			Labels:          map[string]string{},
			Annotations:     map[string]string{},
			CreatedAtMs:     1722700200000,
			ResourceVersion: 1,
		},
		Phase: models.WorkspacePhaseActive,
	},
}

var sampleSandboxes = []models.Sandbox{
	{
		Metadata: models.ObjectMeta{
			ID:              "sbx-1-id",
			Name:            "my-agent",
			Workspace:       "default",
			Labels:          map[string]string{"purpose": "agent"},
			Annotations:     map[string]string{},
			CreatedAtMs:     1722700000000,
			ResourceVersion: 3,
		},
		Spec: models.SandboxSpec{
			Image:     "ghcr.io/nvidia/openshell-community/sandboxes/base:latest",
			Providers: []string{"anthropic"},
			Policy: &models.SandboxPolicy{
				Filesystem:      &models.FilesystemPolicy{IncludeWorkdir: boolPtr(true)},
				NetworkPolicies: map[string]models.NetworkPolicyRule{},
			},
		},
		Status: models.SandboxStatus{
			Phase:                models.SandboxPhaseReady,
			CurrentPolicyVersion: 1,
		},
	},
	{
		Metadata: models.ObjectMeta{
			ID:              "sbx-2-id",
			Name:            "data-processor",
			Workspace:       "default",
			Labels:          map[string]string{},
			Annotations:     map[string]string{},
			CreatedAtMs:     1722700100000,
			ResourceVersion: 1,
		},
		Spec: models.SandboxSpec{
			Image: "ghcr.io/nvidia/openshell-community/sandboxes/base:latest",
			Policy: &models.SandboxPolicy{
				Filesystem:      &models.FilesystemPolicy{IncludeWorkdir: boolPtr(true)},
				NetworkPolicies: map[string]models.NetworkPolicyRule{},
			},
		},
		Status: models.SandboxStatus{
			Phase:                models.SandboxPhaseProvisioning,
			CurrentPolicyVersion: 1,
		},
	},
	{
		Metadata: models.ObjectMeta{
			ID:              "sbx-3-id",
			Name:            "research",
			Workspace:       "dev-team",
			Labels:          map[string]string{},
			Annotations:     map[string]string{},
			CreatedAtMs:     1722700150000,
			ResourceVersion: 1,
		},
		Spec: models.SandboxSpec{
			Image: "ghcr.io/nvidia/openshell-community/sandboxes/base:latest",
			Policy: &models.SandboxPolicy{
				Filesystem:      &models.FilesystemPolicy{IncludeWorkdir: boolPtr(true)},
				NetworkPolicies: map[string]models.NetworkPolicyRule{},
			},
		},
		Status: models.SandboxStatus{
			Phase:                models.SandboxPhaseReady,
			CurrentPolicyVersion: 1,
		},
	},
}

func boolPtr(v bool) *bool {
	return &v
}
