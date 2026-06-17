package kubernetes

import (
	"context"
	"log/slog"
	"sort"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

var agentRuntimeGVR = schema.GroupVersionResource{
	Group:    "agent.kagenti.dev",
	Version:  "v1alpha1",
	Resource: "agentruntimes",
}

func (c *Client) enrichAgentCard(ctx context.Context, namespace, name string, detail *agents.AgentDetail) {
	if detail == nil {
		return
	}

	detail.ServiceAccountName = serviceAccountFromSpec(detail.Spec)

	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		c.logger.Warn("skipping agent card enrichment; dynamic client unavailable",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		return
	}

	agentRuntimeName := name
	if runtimeObj, lookupErr := getAgentRuntimeForWorkload(ctx, dynamicClient, namespace, name); lookupErr == nil && runtimeObj != nil {
		agentRuntimeName = runtimeObj.GetName()
	}

	access, err := c.k8sClient.CanAccessAgentCardEnrichment(ctx, c.identity, namespace, agentRuntimeName)
	if err != nil {
		c.logger.Warn("skipping agent card enrichment; enrichment access check failed",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.String("agentRuntime", agentRuntimeName),
			slog.Any("error", err))
		return
	}

	serviceName := agentServiceName(detail, name)

	var externalURL string
	if access.Routes {
		externalURL = findExternalAgentCardURL(ctx, dynamicClient, c.logger, namespace, serviceName)
	}

	var toolConnections []string
	if access.MCPServers {
		toolConnections = listMCPToolConnections(ctx, dynamicClient, namespace)
	}

	if !access.AgentRuntime {
		applyAgentCardEnrichment(detail, nil, externalURL, toolConnections)
		return
	}

	obj, err := getAgentRuntimeForWorkload(ctx, dynamicClient, namespace, name)
	if err != nil {
		if apierrors.IsNotFound(err) || apierrors.IsForbidden(err) {
			c.logger.Debug("AgentRuntime unavailable for card discovery",
				slog.String("namespace", namespace),
				slog.String("name", name),
				slog.Any("error", err))
		} else {
			c.logger.Warn("failed to get AgentRuntime for card discovery",
				slog.String("namespace", namespace),
				slog.String("name", name),
				slog.Any("error", err))
		}
		applyAgentCardEnrichment(detail, nil, externalURL, toolConnections)
		return
	}

	detail.AgentCard = parseAgentRuntimeCard(obj)
	applyAgentCardEnrichment(detail, obj, externalURL, toolConnections)
}

func agentServiceName(detail *agents.AgentDetail, workloadName string) string {
	if detail != nil && detail.Service != nil && strings.TrimSpace(detail.Service.Name) != "" {
		return detail.Service.Name
	}
	return workloadName
}

func applyAgentCardEnrichment(detail *agents.AgentDetail, runtime *unstructured.Unstructured, externalURL string, toolConnections []string) {
	if detail == nil {
		return
	}

	externalURL = agents.SanitizeHTTPURL(externalURL)
	if detail.AgentCard == nil {
		if externalURL == "" && len(toolConnections) == 0 {
			return
		}
		authMode := ""
		if runtime != nil {
			authMode = authBridgeModeFromSpec(runtime.Object["spec"])
		}
		detail.AgentCard = &agents.AgentCardObserved{AuthBridgeMode: authMode}
	}

	sanitizeObservedCardURLs(detail.AgentCard)
	detail.AgentCard.ExternalAgentCardURL = externalURL
	detail.AgentCard.ToolConnections = toolConnections
}

func sanitizeObservedCardURLs(card *agents.AgentCardObserved) {
	if card == nil {
		return
	}
	card.URL = agents.SanitizeHTTPURL(card.URL)
	card.DocumentationURL = agents.SanitizeHTTPURL(card.DocumentationURL)
	card.IconURL = agents.SanitizeHTTPURL(card.IconURL)
	card.ProviderURL = agents.SanitizeHTTPURL(card.ProviderURL)
	for i := range card.Extensions {
		card.Extensions[i].URI = agents.SanitizeResourceURI(card.Extensions[i].URI)
	}
}

func getAgentRuntimeForWorkload(ctx context.Context, dynamicClient dynamic.Interface, namespace, workloadName string) (*unstructured.Unstructured, error) {
	obj, err := dynamicClient.Resource(agentRuntimeGVR).Namespace(namespace).Get(ctx, workloadName, metav1.GetOptions{})
	if err == nil {
		return obj, nil
	}
	if !apierrors.IsNotFound(err) {
		return nil, err
	}

	return findAgentRuntimeByTargetRef(ctx, dynamicClient, namespace, workloadName)
}

func findAgentRuntimeByTargetRef(ctx context.Context, dynamicClient dynamic.Interface, namespace, workloadName string) (*unstructured.Unstructured, error) {
	list, err := dynamicClient.Resource(agentRuntimeGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	var matches []*unstructured.Unstructured
	for i := range list.Items {
		item := &list.Items[i]
		if !agentRuntimeTargetsWorkload(item, workloadName) {
			continue
		}
		matches = append(matches, item.DeepCopy())
	}
	if len(matches) == 0 {
		return nil, apierrors.NewNotFound(agentRuntimeGVR.GroupResource(), workloadName)
	}

	sort.Slice(matches, func(i, j int) bool {
		leftExact := strings.EqualFold(matches[i].GetName(), workloadName)
		rightExact := strings.EqualFold(matches[j].GetName(), workloadName)
		if leftExact != rightExact {
			return leftExact
		}
		return matches[i].GetName() < matches[j].GetName()
	})
	return matches[0], nil
}

func agentRuntimeTargetsWorkload(obj *unstructured.Unstructured, workloadName string) bool {
	if obj == nil {
		return false
	}
	if strings.EqualFold(obj.GetName(), workloadName) {
		return true
	}

	spec, ok := obj.Object["spec"].(map[string]any)
	if !ok {
		return false
	}

	targetRef, ok := spec["targetRef"].(map[string]any)
	if !ok {
		return false
	}

	return strings.EqualFold(stringField(targetRef["name"]), workloadName)
}

func parseAgentRuntimeCard(obj *unstructured.Unstructured) *agents.AgentCardObserved {
	if obj == nil {
		return nil
	}

	status, ok := obj.Object["status"].(map[string]any)
	if !ok {
		return nil
	}

	authBridgeMode := authBridgeModeFromSpec(obj.Object["spec"])

	cardMap, ok := status["card"].(map[string]any)
	if !ok || len(cardMap) == 0 {
		if linked := stringSliceField(status["linkedSkills"]); len(linked) > 0 {
			return &agents.AgentCardObserved{
				LinkedSkills:   linked,
				AuthBridgeMode: authBridgeMode,
			}
		}
		return nil
	}

	observed := &agents.AgentCardObserved{
		Name:                              stringField(cardMap["name"]),
		Description:                       stringField(cardMap["description"]),
		Version:                           stringField(cardMap["version"]),
		URL:                               stringField(cardMap["url"]),
		DocumentationURL:                  stringField(cardMap["documentationUrl"]),
		IconURL:                           stringField(cardMap["iconUrl"]),
		DefaultInputModes:                 stringSliceField(cardMap["defaultInputModes"]),
		DefaultOutputModes:                stringSliceField(cardMap["defaultOutputModes"]),
		Protocol:                          stringField(cardMap["protocol"]),
		TransportSecurity:                 stringField(cardMap["transportSecurity"]),
		LastCardFetchTime:                 stringField(cardMap["lastCardFetchTime"]),
		AttestedAgentSpiffeID:             stringField(cardMap["attestedAgentSpiffeID"]),
		LinkedSkills:                      stringSliceField(status["linkedSkills"]),
		SupportsAuthenticatedExtendedCard: boolField(cardMap["supportsAuthenticatedExtendedCard"]),
		AuthBridgeMode:                    authBridgeMode,
	}

	if provider, ok := cardMap["provider"].(map[string]any); ok {
		observed.ProviderOrganization = stringField(provider["organization"])
		observed.ProviderURL = stringField(provider["url"])
	}

	if capabilities, ok := cardMap["capabilities"].(map[string]any); ok {
		observed.Streaming = boolField(capabilities["streaming"])
		observed.PushNotifications = boolField(capabilities["pushNotifications"])
		observed.Extensions = parseExtensions(capabilities["extensions"])
	}

	observed.Skills = parseSkills(cardMap["skills"])
	observed.ValidSignature = boolPtrField(cardMap["validSignature"])

	if observed.Name == "" && len(observed.Skills) == 0 && observed.Description == "" {
		if len(observed.LinkedSkills) == 0 {
			return nil
		}
	}

	return observed
}

func authBridgeModeFromSpec(spec any) string {
	specMap, ok := spec.(map[string]any)
	if !ok {
		return ""
	}
	return strings.TrimSpace(stringField(specMap["authBridgeMode"]))
}

func parseSkills(raw any) []agents.AgentCardSkillObserved {
	items, ok := raw.([]any)
	if !ok {
		return nil
	}

	skills := make([]agents.AgentCardSkillObserved, 0, len(items))
	for _, item := range items {
		skillMap, ok := item.(map[string]any)
		if !ok {
			continue
		}
		skills = append(skills, agents.AgentCardSkillObserved{
			ID:          stringField(skillMap["id"]),
			Name:        stringField(skillMap["name"]),
			Description: stringField(skillMap["description"]),
			Tags:        stringSliceField(skillMap["tags"]),
			Examples:    stringSliceField(skillMap["examples"]),
			InputModes:  stringSliceField(skillMap["inputModes"]),
			OutputModes: stringSliceField(skillMap["outputModes"]),
			Parameters:  parseSkillParameters(skillMap["parameters"]),
		})
	}
	return skills
}

func parseSkillParameters(raw any) []agents.AgentCardSkillParameterObserved {
	items, ok := raw.([]any)
	if !ok {
		return nil
	}

	params := make([]agents.AgentCardSkillParameterObserved, 0, len(items))
	for _, item := range items {
		paramMap, ok := item.(map[string]any)
		if !ok {
			continue
		}
		params = append(params, agents.AgentCardSkillParameterObserved{
			Name:        stringField(paramMap["name"]),
			Type:        stringField(paramMap["type"]),
			Description: stringField(paramMap["description"]),
			Required:    boolField(paramMap["required"]),
			Default:     stringField(paramMap["default"]),
		})
	}
	return params
}

func parseExtensions(raw any) []agents.AgentCardExtensionObserved {
	items, ok := raw.([]any)
	if !ok {
		return nil
	}

	extensions := make([]agents.AgentCardExtensionObserved, 0, len(items))
	for _, item := range items {
		extMap, ok := item.(map[string]any)
		if !ok {
			continue
		}
		extensions = append(extensions, agents.AgentCardExtensionObserved{
			URI:         agents.SanitizeResourceURI(stringField(extMap["uri"])),
			Description: stringField(extMap["description"]),
		})
	}
	return extensions
}

func serviceAccountFromSpec(spec map[string]any) string {
	if spec == nil {
		return ""
	}
	template, ok := spec["template"].(map[string]any)
	if !ok {
		return ""
	}
	podSpec, ok := template["spec"].(map[string]any)
	if !ok {
		return ""
	}
	return strings.TrimSpace(stringField(podSpec["serviceAccountName"]))
}

func stringField(value any) string {
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	default:
		return ""
	}
}

func stringSliceField(value any) []string {
	raw, ok := value.([]any)
	if !ok {
		return []string{}
	}
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		if s := stringField(item); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func boolField(value any) bool {
	switch v := value.(type) {
	case bool:
		return v
	default:
		return false
	}
}

func boolPtrField(value any) *bool {
	switch v := value.(type) {
	case bool:
		b := v
		return &b
	default:
		return nil
	}
}
