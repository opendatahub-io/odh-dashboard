package mapper

import (
	"fmt"
	"strings"
	"time"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

// MapAgentCardDetail builds the UI agent card view from observed runtime card data and workload metadata.
func MapAgentCardDetail(detail *agents.AgentDetail, serviceEndpoints []models.AgentServiceEndpoint) *models.AgentCardDetail {
	if detail == nil || detail.AgentCard == nil {
		return nil
	}

	card := detail.AgentCard
	if card.Name == "" && card.Description == "" && len(card.Skills) == 0 && len(card.LinkedSkills) == 0 &&
		strings.TrimSpace(card.ExternalAgentCardURL) == "" && len(card.ToolConnections) == 0 {
		return nil
	}

	agentCardURL := BuildAgentCardDiscoveryURL(serviceEndpoints)
	if agentCardURL == "" && strings.TrimSpace(card.URL) != "" {
		agentCardURL = agentCardURLFromCardField(card.URL)
	}

	skills := MapAgentCardSkills(card.Skills)
	optionalCaps := optionalCapabilities(card)

	return &models.AgentCardDetail{
		Name:                  firstNonEmpty(card.Name, detail.Metadata.Name),
		Description:           card.Description,
		Version:               card.Version,
		Provider:              mapAgentCardProvider(card),
		AgentCardURL:          agents.SanitizeHTTPURL(agentCardURL),
		ExternalAgentCardURL:  agents.SanitizeHTTPURL(strings.TrimSpace(card.ExternalAgentCardURL)),
		DocumentationURL:      agents.SanitizeHTTPURL(card.DocumentationURL),
		IconURL:               agents.SanitizeHTTPURL(card.IconURL),
		DefaultInputModes:     nonEmptyStringSlice(card.DefaultInputModes),
		DefaultOutputModes:    nonEmptyStringSlice(card.DefaultOutputModes),
		AuthenticationMethods: discoverAuthenticationMethods(card),
		Protocols:             discoverProtocols(card.Protocol, detail.Metadata.Labels),
		Labels:                discoverLabels(card, detail.Metadata.Labels, detail.Metadata.Name),
		Skills:                skills,
		Capabilities: models.AgentCardCapabilities{
			Streaming:         card.Streaming,
			PushNotifications: card.PushNotifications,
			Optional:          optionalCaps,
		},
		ToolConnections:   nonEmptyStringSlice(card.ToolConnections),
		UUID:              strings.TrimSpace(detail.Metadata.UID),
		SpiffeID:          resolveSpiffeID(card, detail),
		LastFetchTime:     timePtr(ParseTime(card.LastCardFetchTime)),
		TransportSecurity: card.TransportSecurity,
		ValidSignature:    card.ValidSignature,
		LinkedSkills:      nonEmptyStringSlice(card.LinkedSkills),
	}
}

// BuildAgentCardDiscoveryURL returns the in-cluster A2A discovery URL for an agent.
func BuildAgentCardDiscoveryURL(serviceEndpoints []models.AgentServiceEndpoint) string {
	if len(serviceEndpoints) == 0 {
		return ""
	}

	ports := make([]agents.AgentServicePort, 0, len(serviceEndpoints))
	for _, endpoint := range serviceEndpoints {
		ports = append(ports, agents.AgentServicePort{Name: endpoint.Name, Port: endpoint.Port})
	}
	primary, ok := SelectPrimaryPort(ports)
	if !ok {
		return ""
	}

	for _, endpoint := range serviceEndpoints {
		if endpoint.Port != primary.Port {
			continue
		}
		base := strings.TrimSpace(endpoint.URL)
		if base == "" {
			continue
		}
		return strings.TrimSuffix(base, "/") + agents.A2AAgentCardPath()
	}

	// Endpoints without port metadata: use the first non-empty URL.
	for _, endpoint := range serviceEndpoints {
		base := strings.TrimSpace(endpoint.URL)
		if base == "" {
			continue
		}
		return strings.TrimSuffix(base, "/") + agents.A2AAgentCardPath()
	}
	return ""
}

func agentCardURLFromCardField(rawURL string) string {
	url := strings.TrimSuffix(strings.TrimSpace(rawURL), "/")
	if url == "" {
		return ""
	}
	if strings.HasSuffix(url, agents.A2AAgentCardPath()) {
		return url
	}
	return url + agents.A2AAgentCardPath()
}

func MapAgentCardSkills(skills []agents.AgentCardSkillObserved) []models.AgentCardSkill {
	if len(skills) == 0 {
		return []models.AgentCardSkill{}
	}

	out := make([]models.AgentCardSkill, 0, len(skills))
	for _, skill := range skills {
		out = append(out, models.AgentCardSkill{
			ID:          skill.ID,
			Name:        skill.Name,
			Description: skill.Description,
			Tags:        nonEmptyStringSlice(skill.Tags),
			Examples:    nonEmptyStringSlice(skill.Examples),
			InputModes:  nonEmptyStringSlice(skill.InputModes),
			OutputModes: nonEmptyStringSlice(skill.OutputModes),
			Parameters:  mapSkillParameters(skill.Parameters),
		})
	}
	return out
}

func mapSkillParameters(params []agents.AgentCardSkillParameterObserved) []models.AgentCardSkillParameter {
	if len(params) == 0 {
		return []models.AgentCardSkillParameter{}
	}
	out := make([]models.AgentCardSkillParameter, 0, len(params))
	for _, param := range params {
		out = append(out, models.AgentCardSkillParameter{
			Name:        param.Name,
			Type:        param.Type,
			Description: param.Description,
			Required:    param.Required,
			Default:     param.Default,
		})
	}
	return out
}

func mapAgentCardProvider(card *agents.AgentCardObserved) *models.AgentCardProvider {
	if card == nil {
		return nil
	}
	org := strings.TrimSpace(card.ProviderOrganization)
	url := strings.TrimSpace(card.ProviderURL)
	if org == "" && url == "" {
		return nil
	}
	return &models.AgentCardProvider{
		Organization: org,
		URL:          agents.SanitizeHTTPURL(url),
	}
}

func discoverAuthenticationMethods(card *agents.AgentCardObserved) []string {
	if card == nil {
		return []string{}
	}

	methods := make([]string, 0, 2)
	seen := map[string]struct{}{}
	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		if _, exists := seen[value]; exists {
			return
		}
		seen[value] = struct{}{}
		methods = append(methods, value)
	}

	if strings.EqualFold(card.TransportSecurity, "mtls") {
		add("mTLS")
	}
	if card.SupportsAuthenticatedExtendedCard || authBridgeEnabled(card.AuthBridgeMode) {
		add("Bearer")
	}
	return methods
}

func authBridgeEnabled(mode string) bool {
	mode = strings.TrimSpace(mode)
	if mode == "" {
		return false
	}
	return !strings.EqualFold(mode, "disabled")
}

func discoverProtocols(cardProtocol string, labels map[string]string) []string {
	protocols := make([]string, 0, 3)
	seen := map[string]struct{}{}

	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		key := strings.ToLower(value)
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		protocols = append(protocols, value)
	}

	if cardProtocol != "" {
		add(strings.ToUpper(cardProtocol))
	}
	for key := range labels {
		if strings.HasPrefix(key, agents.LabelProtocolPrefix) {
			add(strings.ToUpper(strings.TrimPrefix(key, agents.LabelProtocolPrefix)))
		}
	}
	add("HTTP")
	return protocols
}

func discoverLabels(card *agents.AgentCardObserved, labels map[string]string, agentName string) []string {
	out := make([]string, 0, 3)
	seen := map[string]struct{}{}

	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		if _, exists := seen[value]; exists {
			return
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}

	if card != nil {
		add(card.ProviderOrganization)
		add(card.Name)
	}
	if labels != nil {
		add(labels["app.kubernetes.io/name"])
		add(labels["app.kubernetes.io/part-of"])
	}
	if len(out) == 0 {
		add(agentName)
	}
	return out
}

func optionalCapabilities(card *agents.AgentCardObserved) []string {
	if card == nil {
		return []string{}
	}
	out := make([]string, 0, len(card.Extensions)+1)
	if card.Streaming {
		out = append(out, "Streaming")
	}
	if card.PushNotifications {
		out = append(out, "Push notifications")
	}
	for _, ext := range card.Extensions {
		label := strings.TrimSpace(ext.Description)
		if label == "" {
			label = strings.TrimSpace(ext.URI)
		}
		if label != "" {
			out = append(out, label)
		}
	}
	return out
}

func resolveSpiffeID(card *agents.AgentCardObserved, detail *agents.AgentDetail) string {
	if card != nil && strings.TrimSpace(card.AttestedAgentSpiffeID) != "" {
		return strings.TrimSpace(card.AttestedAgentSpiffeID)
	}
	if detail == nil {
		return ""
	}
	serviceAccount := strings.TrimSpace(detail.ServiceAccountName)
	if serviceAccount == "" {
		serviceAccount = "default"
	}
	return fmt.Sprintf("spiffe://%s/ns/%s/sa/%s",
		agents.DefaultSpiffeTrustDomain(),
		detail.Metadata.Namespace,
		serviceAccount,
	)
}

func nonEmptyStringSlice(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func timePtr(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	t := value
	return &t
}
