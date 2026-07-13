package openshell

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	v1 "github.com/rhuss/openshell-sdk-go/openshell/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

var sandboxGVR = schema.GroupVersionResource{
	Group:    "agents.x-k8s.io",
	Version:  "v1beta1",
	Resource: "sandboxes",
}

var cardProbeClient = &http.Client{Timeout: 3 * time.Second}

type Client struct {
	osClient  v1.ClientInterface
	k8sClient k8s.KubernetesClientInterface
	namespace string
	logger    *slog.Logger
}

// --- List / Get / Namespaces (through SDK) ---

func (c *Client) ListNamespaces(_ context.Context, _ bool) ([]string, error) {
	return []string{c.namespace}, nil
}

func (c *Client) CanListAgentsInNamespace(_ context.Context, _ string) (bool, error) {
	return true, nil
}

func (c *Client) ListAgents(ctx context.Context, _ string) (*agents.AgentList, error) {
	sandboxes, err := c.osClient.Sandboxes().List(ctx)
	if err != nil {
		return nil, fmt.Errorf("OpenShell list failed: %w", err)
	}

	items := make([]agents.AgentSummary, 0, len(sandboxes))
	for _, sb := range sandboxes {
		items = append(items, sandboxToSummary(sb, c.namespace))
	}

	return &agents.AgentList{Items: items}, nil
}

func (c *Client) GetAgent(ctx context.Context, _, name string) (*agents.AgentDetail, error) {
	sb, err := c.osClient.Sandboxes().Get(ctx, name)
	if err != nil {
		if v1.IsNotFound(err) {
			return nil, agents.ErrNotFound
		}
		return nil, fmt.Errorf("OpenShell get failed: %w", err)
	}

	detail := sandboxToDetail(sb, c.namespace)

	// Agent card probe for A2A agents
	framework := ""
	if detail.Metadata.Annotations != nil {
		framework = detail.Metadata.Annotations[agents.AnnotationFramework]
	}
	if framework == "a2a" && sb.Status.Phase == "Ready" {
		serviceFQDN := fmt.Sprintf("%s.%s.svc.cluster.local", sb.Name, c.namespace)
		if card := c.probeAgentCard(serviceFQDN); card != nil {
			detail.AgentCard = card
		}
	}

	return detail, nil
}

// --- Deploy / Delete (through SDK) ---

func (c *Client) DeployAgent(ctx context.Context, params *agents.DeployAgentParams) (*agents.DeployAgentResult, error) {
	if params == nil {
		return nil, fmt.Errorf("deploy params must not be nil")
	}

	image := params.ContainerImage
	if params.ImageTag != "" {
		image = fmt.Sprintf("%s:%s", image, params.ImageTag)
	}

	envMap := make(map[string]string, len(params.EnvVars))
	for _, ev := range params.EnvVars {
		envMap[ev.Name] = ev.Value
	}

	labels := map[string]string{
		agents.LabelAgentType: agents.AgentTypeAgent,
	}

	annotations := map[string]string{}
	if params.Name != "" {
		annotations["openshift.io/display-name"] = params.Name
	}
	if params.Description != "" {
		annotations["openshift.io/description"] = params.Description
	}
	if params.Framework != "" {
		annotations[agents.AnnotationFramework] = params.Framework
	}

	spec := &v1.SandboxSpec{
		Template: &v1.SandboxTemplate{
			Image:       image,
			Environment: envMap,
			Labels:      labels,
			Annotations: annotations,
		},
	}

	c.logger.Info("Deploying agent via OpenShell Gateway",
		slog.String("name", params.Name),
		slog.String("image", image),
		slog.String("framework", params.Framework))

	sb, err := c.osClient.Sandboxes().Create(ctx, params.Name, spec, labels)
	if err != nil {
		if v1.IsAlreadyExists(err) {
			return nil, agents.ErrAlreadyExists
		}
		return nil, fmt.Errorf("OpenShell deploy failed: %w", err)
	}

	return &agents.DeployAgentResult{
		Name:      sb.Name,
		Namespace: c.namespace,
	}, nil
}

func (c *Client) DeleteAgent(ctx context.Context, _, name string) error {
	c.logger.Info("Deleting agent via OpenShell Gateway", slog.String("name", name))

	if err := c.osClient.Sandboxes().Delete(ctx, name); err != nil {
		if v1.IsNotFound(err) {
			return agents.ErrNotFound
		}
		return fmt.Errorf("OpenShell delete failed: %w", err)
	}
	return nil
}

// --- Stop / Start (direct CR — SDK has no methods) ---

func (c *Client) StopAgent(ctx context.Context, namespace, name string) error {
	if c.k8sClient == nil {
		return fmt.Errorf("stop not available: k8s client not configured")
	}
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return fmt.Errorf("failed to get dynamic client: %w", err)
	}

	ns := namespace
	if ns == "" {
		ns = c.namespace
	}

	patch := []byte(`{"spec":{"operatingMode":"Suspended"}}`)
	_, err = dynamicClient.Resource(sandboxGVR).Namespace(ns).Patch(
		ctx, name, types.MergePatchType, patch, metav1.PatchOptions{})
	if err != nil {
		return fmt.Errorf("failed to suspend sandbox: %w", err)
	}
	return nil
}

func (c *Client) StartAgent(ctx context.Context, namespace, name string) error {
	if c.k8sClient == nil {
		return fmt.Errorf("start not available: k8s client not configured")
	}
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return fmt.Errorf("failed to get dynamic client: %w", err)
	}

	ns := namespace
	if ns == "" {
		ns = c.namespace
	}

	patch, _ := json.Marshal(map[string]any{"spec": map[string]any{"operatingMode": "Running"}})
	_, err = dynamicClient.Resource(sandboxGVR).Namespace(ns).Patch(
		ctx, name, types.MergePatchType, patch, metav1.PatchOptions{})
	if err != nil {
		return fmt.Errorf("failed to resume sandbox: %w", err)
	}
	return nil
}

// --- Agent card probe (A2A only) ---

func (c *Client) probeAgentCard(serviceFQDN string) *agents.AgentCardObserved {
	url := fmt.Sprintf("http://%s:8080/.well-known/agent-card.json", serviceFQDN)

	resp, err := cardProbeClient.Get(url)
	if err != nil {
		c.logger.Debug("Agent card probe failed", slog.String("url", url), slog.Any("error", err))
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil
	}

	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil
	}

	observed := &agents.AgentCardObserved{
		Name:              stringField(raw["name"]),
		Description:       stringField(raw["description"]),
		Version:           stringField(raw["version"]),
		URL:               stringField(raw["url"]),
		Protocol:          "a2a",
		LastCardFetchTime: time.Now().UTC().Format(time.RFC3339),
	}

	if provider, ok := raw["provider"].(map[string]any); ok {
		observed.ProviderOrganization = stringField(provider["organization"])
		observed.ProviderURL = stringField(provider["url"])
	}

	if skills, ok := raw["skills"].([]any); ok {
		for _, item := range skills {
			skillMap, ok := item.(map[string]any)
			if !ok {
				continue
			}
			observed.Skills = append(observed.Skills, agents.AgentCardSkillObserved{
				ID:          stringField(skillMap["id"]),
				Name:        stringField(skillMap["name"]),
				Description: stringField(skillMap["description"]),
			})
		}
	}

	if observed.Name == "" && len(observed.Skills) == 0 {
		return nil
	}

	return observed
}

func stringField(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// --- Mappers ---

func sandboxToSummary(sb *v1.Sandbox, namespace string) agents.AgentSummary {
	status := "Unknown"
	if sb.Status.Phase != "" {
		status = string(sb.Status.Phase)
	}

	description := ""
	displayName := ""
	framework := ""
	if sb.Spec.Template != nil && sb.Spec.Template.Annotations != nil {
		displayName = sb.Spec.Template.Annotations["openshift.io/display-name"]
		description = sb.Spec.Template.Annotations["openshift.io/description"]
		framework = sb.Spec.Template.Annotations[agents.AnnotationFramework]
	}
	if description == "" && sb.Spec.Template != nil {
		description = sb.Spec.Template.Image
	}
	_ = displayName

	workloadType := "sandbox"
	if framework != "" {
		workloadType = framework
	}

	return agents.AgentSummary{
		Name:         sb.Name,
		Namespace:    namespace,
		Description:  description,
		Status:       status,
		ResourceType: "agent",
		WorkloadType: workloadType,
		EndpointURL:  fmt.Sprintf("http://%s.%s.svc.cluster.local:8080", sb.Name, namespace),
		CreatedAt:    sb.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func sandboxToDetail(sb *v1.Sandbox, namespace string) *agents.AgentDetail {
	status := "Unknown"
	if sb.Status.Phase != "" {
		status = string(sb.Status.Phase)
	}

	labels := sb.Labels
	if labels == nil {
		labels = make(map[string]string)
	}

	annotations := make(map[string]string)
	if sb.Spec.Template != nil && sb.Spec.Template.Annotations != nil {
		annotations = sb.Spec.Template.Annotations
	}

	spec := map[string]any{
		"operatingMode": status,
	}
	if sb.Spec.Template != nil {
		spec["image"] = sb.Spec.Template.Image
		spec["environment"] = sb.Spec.Environment
	}

	return &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:              sb.Name,
			Namespace:         namespace,
			Labels:            labels,
			Annotations:       annotations,
			CreationTimestamp:  sb.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UID:               sb.ID,
		},
		Spec:         spec,
		Status:       map[string]any{"phase": status, "agentPod": agentPodName(sb), "readyReplicas": readyCount(status)},
		WorkloadType: annotations[agents.AnnotationFramework],
		ReadyStatus:  status,
		Service: &agents.AgentService{
			Name: sb.Name,
			Type: "ClusterIP",
			Ports: []agents.AgentServicePort{
				{Name: "http", Port: 8080, TargetPort: 8080, Protocol: "TCP"},
			},
		},
	}
}

func readyCount(status string) int {
	if status == "Ready" {
		return 1
	}
	return 0
}

func agentPodName(sb *v1.Sandbox) string {
	if sb.Status.AgentPod != "" {
		return sb.Status.AgentPod
	}
	if sb.Status.Phase == "Ready" {
		return sb.Name
	}
	return ""
}
