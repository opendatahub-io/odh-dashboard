package kubernetes

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"gopkg.in/yaml.v2"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	// AgentProfileNamePrefix is the prefix for agent profile ConfigMap names
	AgentProfileNamePrefix = "agent-profile-"

	// AgentProfileDataKey is the key in the ConfigMap data where the profile YAML is stored
	AgentProfileDataKey = "profile.yaml"

	// Label keys for agent profile ConfigMaps (following ODH Dashboard conventions)
	DashboardResourceLabel = "opendatahub.io/dashboard"
	AgentProfileLabel      = "opendatahub.io/agent-profile"
)

// CreateAgentProfile creates a new AgentProfile ConfigMap in the specified namespace
func (kc *TokenKubernetesClient) CreateAgentProfile(
	ctx context.Context,
	namespace string,
	profile *models.AgentProfile,
) (*models.AgentProfileCreateResponse, error) {
	// Validate the profile
	if err := validateAgentProfile(profile); err != nil {
		return nil, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "invalid_request",
				Message: fmt.Sprintf("profile validation failed: %v", err),
			},
		}
	}

	// Serialize profile to YAML
	profileYAML, err := yaml.Marshal(profile)
	if err != nil {
		kc.Logger.Error("failed to marshal agent profile to YAML", "error", err, "profile", profile.Metadata.Name)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "serialization_error",
				Message: "failed to serialize agent profile",
			},
		}
	}

	// Construct ConfigMap name
	configMapName := AgentProfileNamePrefix + profile.Metadata.Name

	// Create ConfigMap
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      configMapName,
			Namespace: namespace,
			Labels: map[string]string{
				DashboardResourceLabel: "true",
				AgentProfileLabel:      "true",
			},
		},
		Data: map[string]string{
			AgentProfileDataKey: string(profileYAML),
		},
	}

	// Create the ConfigMap in the cluster
	if err := kc.Client.Create(ctx, configMap); err != nil {
		if apierrors.IsAlreadyExists(err) {
			kc.Logger.Warn("agent profile already exists", "name", profile.Metadata.Name, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 409,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "already_exists",
					Message: fmt.Sprintf("agent profile %s already exists", profile.Metadata.Name),
				},
			}
		}
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to create agent profile ConfigMap", "error", err, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to create agent profile in this namespace",
				},
			}
		}
		kc.Logger.Error("failed to create agent profile ConfigMap", "error", err, "name", configMapName, "namespace", namespace)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "create_error",
				Message: "failed to create agent profile",
			},
		}
	}

	kc.Logger.Info("created agent profile ConfigMap", "name", configMapName, "namespace", namespace)

	// Return the created resource reference
	return &models.AgentProfileCreateResponse{
		Name:            configMapName,
		Namespace:       namespace,
		ResourceVersion: configMap.ResourceVersion,
	}, nil
}

// GetAgentProfile retrieves an AgentProfile from a ConfigMap
func (kc *TokenKubernetesClient) GetAgentProfile(
	ctx context.Context,
	namespace string,
	name string,
) (*models.AgentProfile, error) {
	// Construct ConfigMap name
	configMapName := AgentProfileNamePrefix + name

	// Get the ConfigMap
	configMap := &corev1.ConfigMap{}
	key := client.ObjectKey{
		Namespace: namespace,
		Name:      configMapName,
	}

	if err := kc.Client.Get(ctx, key, configMap); err != nil {
		if apierrors.IsNotFound(err) {
			kc.Logger.Warn("agent profile not found", "name", name, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 404,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "not_found",
					Message: fmt.Sprintf("agent profile %s not found", name),
				},
			}
		}
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to get agent profile ConfigMap", "error", err, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to access agent profile in this namespace",
				},
			}
		}
		kc.Logger.Error("failed to get agent profile ConfigMap", "error", err, "name", configMapName, "namespace", namespace)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "get_error",
				Message: "failed to retrieve agent profile",
			},
		}
	}

	// Extract and deserialize the profile YAML
	profileYAML, ok := configMap.Data[AgentProfileDataKey]
	if !ok {
		kc.Logger.Error("agent profile ConfigMap missing profile.yaml key", "name", configMapName, "namespace", namespace)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "invalid_data",
				Message: "agent profile ConfigMap is malformed",
			},
		}
	}

	var profile models.AgentProfile
	if err := yaml.Unmarshal([]byte(profileYAML), &profile); err != nil {
		kc.Logger.Error("failed to unmarshal agent profile YAML", "error", err, "name", configMapName)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "deserialization_error",
				Message: "failed to parse agent profile",
			},
		}
	}

	// Augment with Kubernetes metadata (resourceVersion for optimistic concurrency)
	profile.Metadata.ResourceVersion = configMap.ResourceVersion

	return &profile, nil
}

// validateAgentProfile validates the agent profile structure
func validateAgentProfile(profile *models.AgentProfile) error {
	if profile == nil {
		return fmt.Errorf("profile cannot be nil")
	}

	// Validate API version and kind
	if profile.APIVersion != "genai.redhat.com/v1alpha1" {
		return fmt.Errorf("invalid apiVersion: expected genai.redhat.com/v1alpha1, got %s", profile.APIVersion)
	}
	if profile.Kind != "AgentProfile" {
		return fmt.Errorf("invalid kind: expected AgentProfile, got %s", profile.Kind)
	}

	// Validate metadata
	if profile.Metadata.Name == "" {
		return fmt.Errorf("metadata.name is required (should be auto-generated UUID)")
	}

	// Validate metadata.name is a valid UUID format (loose check for UUID pattern)
	if len(profile.Metadata.Name) < 36 {
		return fmt.Errorf("metadata.name should be a valid UUID")
	}

	// Validate spec
	if profile.Spec.DisplayName == "" {
		return fmt.Errorf("spec.displayName is required")
	}
	if len(profile.Spec.DisplayName) > 100 {
		return fmt.Errorf("spec.displayName must be 100 characters or less, got %d", len(profile.Spec.DisplayName))
	}

	// Validate model reference
	if profile.Spec.Model.ID == "" {
		return fmt.Errorf("spec.model.id is required")
	}
	if profile.Spec.Model.URI == "" {
		return fmt.Errorf("spec.model.uri is required")
	}

	// Validate temperature range if provided
	if profile.Spec.Temperature != nil {
		temp := *profile.Spec.Temperature
		if temp < 0.0 || temp > 2.0 {
			return fmt.Errorf("spec.temperature must be between 0.0 and 2.0, got %f", temp)
		}
	}

	// Validate maxOutputTokens range if provided
	if profile.Spec.MaxOutputTokens != nil {
		tokens := *profile.Spec.MaxOutputTokens
		if tokens < 1 || tokens > 32000 {
			return fmt.Errorf("spec.maxOutputTokens must be between 1 and 32000, got %d", tokens)
		}
	}

	// Validate vector stores if provided
	if profile.Spec.VectorStores != nil {
		if len(profile.Spec.VectorStores.Stores) == 0 {
			return fmt.Errorf("spec.vectorStores.stores: must contain at least one item")
		}
		for i, store := range profile.Spec.VectorStores.Stores {
			// Exactly one of storeRef or id must be set
			if (store.StoreRef == nil && store.ID == "") || (store.StoreRef != nil && store.ID != "") {
				return fmt.Errorf("spec.vectorStores.stores[%d]: exactly one of storeRef or id must be set", i)
			}
		}
	}

	// Validate MCP servers if provided
	if len(profile.Spec.MCPServers) > 0 {
		for i, mcp := range profile.Spec.MCPServers {
			if mcp.ServerRef.Kind == "" || mcp.ServerRef.Name == "" {
				return fmt.Errorf("spec.mcpServers[%d]: serverRef.kind and serverRef.name are required", i)
			}
			// key is required for ConfigMap, unused for MCPServer
			if mcp.ServerRef.Kind == "ConfigMap" && mcp.ServerRef.Key == "" {
				return fmt.Errorf("spec.mcpServers[%d]: serverRef.key is required when kind is ConfigMap", i)
			}
		}
	}

	// Validate guardrails if provided
	if len(profile.Spec.Guardrails) > 0 {
		for i, gr := range profile.Spec.Guardrails {
			if gr.Provider == "" {
				return fmt.Errorf("spec.guardrails[%d]: provider is required", i)
			}
			if gr.GuardrailRef.Name == "" {
				return fmt.Errorf("spec.guardrails[%d]: guardrailRef.name is required", i)
			}
		}
	}

	return nil
}

// ListAgentProfiles retrieves all AgentProfile ConfigMaps in a namespace
func (kc *TokenKubernetesClient) ListAgentProfiles(
	ctx context.Context,
	namespace string,
) (*models.AgentProfileListResponse, error) {
	// List ConfigMaps with label filter
	configMapList := &corev1.ConfigMapList{}
	listOptions := []client.ListOption{
		client.InNamespace(namespace),
		client.MatchingLabels{
			AgentProfileLabel: "true",
		},
	}

	if err := kc.Client.List(ctx, configMapList, listOptions...); err != nil {
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to list agent profile ConfigMaps", "error", err, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to list agent profiles in this namespace",
				},
			}
		}
		kc.Logger.Error("failed to list agent profile ConfigMaps", "error", err, "namespace", namespace)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "list_error",
				Message: "failed to list agent profiles",
			},
		}
	}

	// Convert ConfigMaps to summaries
	profiles := make([]models.AgentProfileSummary, 0, len(configMapList.Items))
	for _, cm := range configMapList.Items {
		// Extract profile YAML
		profileYAML, ok := cm.Data[AgentProfileDataKey]
		if !ok {
			kc.Logger.Warn("skipping ConfigMap with missing profile.yaml", "name", cm.Name, "namespace", cm.Namespace)
			continue
		}

		// Deserialize to extract spec fields
		var profile models.AgentProfile
		if err := yaml.Unmarshal([]byte(profileYAML), &profile); err != nil {
			kc.Logger.Warn("skipping ConfigMap with invalid YAML", "name", cm.Name, "error", err)
			continue
		}

		// Extract UUID from ConfigMap name
		if !strings.HasPrefix(cm.Name, AgentProfileNamePrefix) {
			kc.Logger.Warn("skipping ConfigMap with invalid name format", "name", cm.Name, "namespace", cm.Namespace)
			continue
		}
		profileID := cm.Name[len(AgentProfileNamePrefix):]

		// Validate profileID is a valid UUID
		if _, err := uuid.Parse(profileID); err != nil {
			kc.Logger.Warn("skipping ConfigMap with invalid UUID in name", "profileID", profileID, "namespace", cm.Namespace)
			continue
		}

		// Get last modified timestamp from ManagedFields
		lastModified := getLastModifiedTimestamp(&cm)

		summary := models.AgentProfileSummary{
			Name:         cm.Name,
			ProfileID:    profileID,
			DisplayName:  profile.Spec.DisplayName,
			Description:  profile.Spec.Description,
			Namespace:    cm.Namespace,
			LastModified: lastModified,
		}

		profiles = append(profiles, summary)
	}

	// Sort by lastModified (most recent first)
	// Using bubble sort for small lists (AC: up to 50 profiles)
	for i := 0; i < len(profiles)-1; i++ {
		for j := 0; j < len(profiles)-i-1; j++ {
			if profiles[j].LastModified < profiles[j+1].LastModified {
				profiles[j], profiles[j+1] = profiles[j+1], profiles[j]
			}
		}
	}

	return &models.AgentProfileListResponse{
		Profiles:   profiles,
		TotalCount: len(profiles),
	}, nil
}

// getLastModifiedTimestamp extracts the last modified timestamp from ConfigMap
func getLastModifiedTimestamp(cm *corev1.ConfigMap) string {
	// Prefer ManagedFields for accurate last modification time
	if len(cm.ManagedFields) > 0 {
		var latestTime *metav1.Time
		for _, field := range cm.ManagedFields {
			if field.Time != nil {
				if latestTime == nil || field.Time.After(latestTime.Time) {
					latestTime = field.Time
				}
			}
		}
		if latestTime != nil {
			return latestTime.Format("2006-01-02T15:04:05Z")
		}
	}

	// Fallback to creation timestamp
	if !cm.CreationTimestamp.IsZero() {
		return cm.CreationTimestamp.Format("2006-01-02T15:04:05Z")
	}

	return ""
}

// UpdateAgentProfile updates an existing AgentProfile ConfigMap with optimistic concurrency control
func (kc *TokenKubernetesClient) UpdateAgentProfile(
	ctx context.Context,
	namespace string,
	profileID string,
	request *models.AgentProfileUpdateRequest,
) (*models.AgentProfileUpdateResponse, error) {
	// Construct ConfigMap name
	configMapName := AgentProfileNamePrefix + profileID

	// Get the existing ConfigMap
	existingCM := &corev1.ConfigMap{}
	key := client.ObjectKey{
		Namespace: namespace,
		Name:      configMapName,
	}

	if err := kc.Client.Get(ctx, key, existingCM); err != nil {
		if apierrors.IsNotFound(err) {
			kc.Logger.Warn("agent profile not found for update", "id", profileID, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 404,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "not_found",
					Message: fmt.Sprintf("agent profile %s not found", profileID),
				},
			}
		}
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to get agent profile ConfigMap", "error", err, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to access agent profile in this namespace",
				},
			}
		}
		kc.Logger.Error("failed to get agent profile ConfigMap for update", "error", err, "name", configMapName)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "get_error",
				Message: "failed to retrieve agent profile",
			},
		}
	}

	// Check resourceVersion for optimistic concurrency control
	if existingCM.ResourceVersion != request.ResourceVersion {
		kc.Logger.Warn("resource version conflict during update",
			"expected", request.ResourceVersion,
			"actual", existingCM.ResourceVersion,
			"name", configMapName)
		return nil, &integrations.HTTPError{
			StatusCode: 409,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "conflict",
				Message: "resource version conflict: profile was modified by another client",
			},
		}
	}

	// Build updated profile
	updatedProfile := &models.AgentProfile{
		APIVersion: "genai.redhat.com/v1alpha1",
		Kind:       "AgentProfile",
		Metadata: models.AgentProfileMetadata{
			Name: profileID,
		},
		Spec: request.Spec,
	}

	// Validate the updated profile
	if err := validateAgentProfile(updatedProfile); err != nil {
		return nil, &integrations.HTTPError{
			StatusCode: 400,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "invalid_request",
				Message: fmt.Sprintf("profile validation failed: %v", err),
			},
		}
	}

	// Serialize to YAML
	profileYAML, err := yaml.Marshal(updatedProfile)
	if err != nil {
		kc.Logger.Error("failed to marshal updated agent profile to YAML", "error", err, "profile", profileID)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "serialization_error",
				Message: "failed to serialize agent profile",
			},
		}
	}

	// Update ConfigMap data (initialize map if nil)
	if existingCM.Data == nil {
		existingCM.Data = make(map[string]string)
	}
	existingCM.Data[AgentProfileDataKey] = string(profileYAML)

	// Update the ConfigMap in the cluster
	if err := kc.Client.Update(ctx, existingCM); err != nil {
		if apierrors.IsConflict(err) {
			kc.Logger.Warn("conflict during ConfigMap update (concurrent modification)", "name", configMapName)
			return nil, &integrations.HTTPError{
				StatusCode: 409,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "conflict",
					Message: "resource version conflict: profile was modified by another client",
				},
			}
		}
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to update agent profile ConfigMap", "error", err, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to update agent profile in this namespace",
				},
			}
		}
		kc.Logger.Error("failed to update agent profile ConfigMap", "error", err, "name", configMapName)
		return nil, &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "update_error",
				Message: "failed to update agent profile",
			},
		}
	}

	kc.Logger.Info("updated agent profile ConfigMap", "name", configMapName, "namespace", namespace)

	return &models.AgentProfileUpdateResponse{
		Name:            configMapName,
		ProfileID:       profileID,
		DisplayName:     request.Spec.DisplayName,
		Namespace:       namespace,
		ResourceVersion: existingCM.ResourceVersion,
	}, nil
}

// DeleteAgentProfile deletes an AgentProfile ConfigMap
func (kc *TokenKubernetesClient) DeleteAgentProfile(
	ctx context.Context,
	namespace string,
	profileID string,
) error {
	// Construct ConfigMap name
	configMapName := AgentProfileNamePrefix + profileID

	// Create ConfigMap object for deletion
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      configMapName,
			Namespace: namespace,
		},
	}

	// Delete the ConfigMap
	if err := kc.Client.Delete(ctx, configMap); err != nil {
		if apierrors.IsNotFound(err) {
			kc.Logger.Warn("agent profile not found for deletion", "id", profileID, "namespace", namespace)
			return &integrations.HTTPError{
				StatusCode: 404,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "not_found",
					Message: fmt.Sprintf("agent profile %s not found", profileID),
				},
			}
		}
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to delete agent profile ConfigMap", "error", err, "namespace", namespace)
			return &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to delete agent profile in this namespace",
				},
			}
		}
		kc.Logger.Error("failed to delete agent profile ConfigMap", "error", err, "name", configMapName)
		return &integrations.HTTPError{
			StatusCode: 500,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "delete_error",
				Message: "failed to delete agent profile",
			},
		}
	}

	kc.Logger.Info("deleted agent profile ConfigMap", "name", configMapName, "namespace", namespace)
	return nil
}
