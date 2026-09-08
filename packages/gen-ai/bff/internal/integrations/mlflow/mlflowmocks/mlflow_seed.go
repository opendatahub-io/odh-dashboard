package mlflowmocks

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
)

const seedTimeout = 30 * time.Second

const maxWorkspaceErrorBodyBytes = 4096

const (
	kubernetesMCPRegistryName = "com.example/kubernetes"
	githubMCPRegistryName     = "io.github.example/github"
	braveMCPRegistryName      = "com.brave.example/brave"
	kubernetesMCPVersion      = "1.0.0"
	githubMCPVersion          = "1.0.0"
	braveMCPVersion           = "0.1.0"
	githubMCPExampleEndpoint  = "https://github-mcp.example.com/mcp"
)

// SeedMCPRegistry registers sample MCP servers in the local MLflow MCP Registry.
//
// It reads PLAYGROUND_NAMESPACE and KUBERNETES_MCP_SERVER_URL directly from the
// environment via os.Getenv (these are dev-only values exported by the parent Makefile
// from packages/gen-ai/.env.local).
//
// Workspaces seeded: always "default"; additionally the PLAYGROUND_NAMESPACE workspace
// if that env var is non-empty.
//
// Servers registered per workspace:
//   - Mock Brave draft server (com.brave.example/brave) — no access endpoint
//   - Mock GitHub server (io.github.example/github) — fake endpoint + 3 registry tools
//   - Real Kubernetes MCP server (com.example/kubernetes) — seeded only when
//     KUBERNETES_MCP_SERVER_URL is set; skipped with a log message otherwise
//
// Errors are returned to the caller; SetupMLflow logs them as warnings (non-fatal).
func SeedMCPRegistry(trackingURI string, logger *slog.Logger) error {
	playgroundNamespace := strings.TrimSpace(os.Getenv("PLAYGROUND_NAMESPACE"))
	kubernetesMCPServerURL := strings.TrimSpace(os.Getenv("KUBERNETES_MCP_SERVER_URL"))
	workspaces := devMLflowWorkspaces(playgroundNamespace)
	for _, workspace := range workspaces {
		if err := ensureMLflowWorkspace(trackingURI, workspace, logger); err != nil {
			return fmt.Errorf("failed to ensure MLflow workspace %q: %w", workspace, err)
		}
		if err := seedMCPRegistryInWorkspace(trackingURI, workspace, kubernetesMCPServerURL, logger); err != nil {
			return fmt.Errorf("failed to seed MCP registry for workspace %q: %w", workspace, err)
		}
	}

	logger.Info("Seeded MLflow MCP registry", slog.Any("workspaces", workspaces))
	return nil
}

func devMLflowWorkspaces(playgroundNamespace string) []string {
	seen := map[string]bool{"default": true}
	workspaces := []string{"default"}

	add := func(workspace string) {
		workspace = strings.TrimSpace(workspace)
		if workspace == "" || seen[workspace] {
			return
		}
		seen[workspace] = true
		workspaces = append(workspaces, workspace)
	}

	add(playgroundNamespace)

	return workspaces
}

func ensureMLflowWorkspace(trackingURI, workspace string, logger *slog.Logger) error {
	if workspace == "" || workspace == "default" {
		return nil
	}

	body, err := json.Marshal(map[string]string{"name": workspace})
	if err != nil {
		return err
	}

	url := strings.TrimSuffix(trackingURI, "/") + "/ajax-api/3.0/mlflow/workspaces"
	ctx, cancel := context.WithTimeout(context.Background(), seedTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		logger.Info("Created MLflow workspace", slog.String("workspace", workspace))
		return nil
	}

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, maxWorkspaceErrorBodyBytes))
	if resp.StatusCode == http.StatusBadRequest && strings.Contains(string(respBody), "RESOURCE_ALREADY_EXISTS") {
		logger.Debug("MLflow workspace already exists", slog.String("workspace", workspace))
		return nil
	}

	return fmt.Errorf("create workspace %q: status %d: %s", workspace, resp.StatusCode, string(respBody))
}

func seedMCPRegistryInWorkspace(trackingURI, workspace, kubernetesMCPServerURL string, logger *slog.Logger) error {
	clientOpts := []mlflow.Option{
		mlflow.WithTrackingURI(trackingURI),
		mlflow.WithInsecure(),
	}
	if workspace != "" && workspace != "default" {
		clientOpts = append(clientOpts, mlflow.WithHeaders(map[string]string{
			"X-MLFLOW-WORKSPACE": workspace,
		}))
	}

	client, err := mlflow.NewClient(clientOpts...)
	if err != nil {
		return fmt.Errorf("failed to create MLflow client for MCP registry seed: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), seedTimeout)
	defer cancel()

	return seedMockAndRealMCPServersInRegistry(ctx, client.MCPRegistry(), kubernetesMCPServerURL, logger)
}

func seedMockAndRealMCPServersInRegistry(ctx context.Context, reg *mcpregistry.Client, kubernetesMCPServerURL string, logger *slog.Logger) error {
	if err := seedMockBraveDraftMCPServer(ctx, reg, logger); err != nil {
		return err
	}

	if err := seedMockGitHubMCPServer(ctx, reg, logger); err != nil {
		return err
	}

	kubernetesURL := strings.TrimSpace(kubernetesMCPServerURL)
	if kubernetesURL == "" {
		logger.Info("KUBERNETES_MCP_SERVER_URL unset — skipping kubernetes MCP registry seed")
		return nil
	}

	if err := seedRealMCPServer(
		ctx,
		reg,
		logger,
		kubernetesMCPRegistryName,
		"Kubernetes MCP Server",
		"Manage resources in a Kubernetes cluster.",
		kubernetesMCPVersion,
		kubernetesURL,
		nil,
	); err != nil {
		return err
	}

	logger.Info("Seeded kubernetes MCP server in registry",
		slog.String("name", kubernetesMCPRegistryName),
		slog.String("endpoint", kubernetesURL),
	)
	return nil
}

func seedMockBraveDraftMCPServer(ctx context.Context, reg *mcpregistry.Client, logger *slog.Logger) error {
	description := "Brave browser MCP server (draft, not yet deployed)"
	if err := ensureMCPServerParent(ctx, reg, braveMCPRegistryName, description); err != nil {
		return err
	}

	if mcpServerVersionExists(ctx, reg, braveMCPRegistryName, braveMCPVersion) {
		logger.Debug("Brave draft MCP server version already exists", slog.String("name", braveMCPRegistryName))
		return nil
	}

	serverJSON := map[string]any{
		"name":        braveMCPRegistryName,
		"description": description,
		"version":     braveMCPVersion,
	}

	_, err := reg.CreateMCPServerVersion(ctx, braveMCPRegistryName, serverJSON,
		mcpregistry.WithVersionStatus(mcpregistry.MCPServerVersionStatusDraft),
	)
	if err != nil {
		return fmt.Errorf("failed to create brave draft MCP server version %s: %w", braveMCPRegistryName, err)
	}

	logger.Debug("Seeded brave draft MCP registry server", slog.String("name", braveMCPRegistryName))
	return nil
}

func seedMockGitHubMCPServer(ctx context.Context, reg *mcpregistry.Client, logger *slog.Logger) error {
	githubTools := []mcpregistry.MCPTool{
		{Name: "create_github_issue", Description: "Create a new GitHub issue"},
		{Name: "search_repositories", Description: "Search GitHub repositories"},
		{Name: "get_file_contents", Description: "Get contents of a file from a repo"},
	}

	return ensureMCPServerWithActiveVersion(
		ctx,
		reg,
		logger,
		githubMCPRegistryName,
		"GitHub MCP Server",
		"GitHub MCP server for issue and repo management.",
		githubMCPVersion,
		githubMCPExampleEndpoint,
		githubTools,
	)
}

func seedRealMCPServer(
	ctx context.Context,
	reg *mcpregistry.Client,
	logger *slog.Logger,
	name, displayName, description, version, endpointURL string,
	tools []mcpregistry.MCPTool,
) error {
	return ensureMCPServerWithActiveVersion(ctx, reg, logger, name, displayName, description, version, endpointURL, tools)
}

func ensureMCPServerParent(ctx context.Context, reg *mcpregistry.Client, name, description string) error {
	if _, err := reg.GetMCPServer(ctx, name); err == nil {
		return nil
	}

	_, err := reg.CreateMCPServer(ctx, name,
		mcpregistry.WithServerDescription(description),
	)
	if err != nil {
		return fmt.Errorf("failed to create MCP server %s: %w", name, err)
	}
	return nil
}

func ensureMCPServerWithActiveVersion(
	ctx context.Context,
	reg *mcpregistry.Client,
	logger *slog.Logger,
	name, displayName, description, version, endpointURL string,
	tools []mcpregistry.MCPTool,
) error {
	if err := ensureMCPServerParent(ctx, reg, name, description); err != nil {
		return err
	}

	if !mcpServerVersionExists(ctx, reg, name, version) {
		serverJSON := map[string]any{
			"name":        name,
			"description": description,
			"version":     version,
		}

		versionOpts := []mcpregistry.CreateMCPServerVersionOption{
			mcpregistry.WithVersionDisplayName(displayName),
			mcpregistry.WithVersionStatus(mcpregistry.MCPServerVersionStatusActive),
		}
		if len(tools) > 0 {
			versionOpts = append(versionOpts, mcpregistry.WithVersionTools(tools))
		}

		if _, err := reg.CreateMCPServerVersion(ctx, name, serverJSON, versionOpts...); err != nil {
			return fmt.Errorf("failed to create MCP server version %s: %w", name, err)
		}
		logger.Debug("Seeded MCP server version", slog.String("name", name), slog.String("version", version))
	}

	if endpointURL == "" {
		return nil
	}

	if mcpServerEndpointExists(ctx, reg, name, endpointURL) {
		return nil
	}

	transport := mcpregistry.MCPTransportStreamableHTTP
	if strings.HasSuffix(endpointURL, "/sse") || strings.Contains(endpointURL, "/sse/") {
		transport = mcpregistry.MCPTransportSSE
	}

	if _, err := reg.CreateMCPAccessEndpoint(ctx, name, endpointURL,
		mcpregistry.WithAccessEndpointTransportType(transport),
		mcpregistry.WithAccessEndpointServerVersion(version),
	); err != nil {
		return fmt.Errorf("failed to create MCP access endpoint for %s: %w", name, err)
	}

	logger.Debug("Seeded MCP server access endpoint", slog.String("name", name), slog.String("endpoint", endpointURL))
	return nil
}

func mcpServerVersionExists(ctx context.Context, reg *mcpregistry.Client, name, version string) bool {
	_, err := reg.GetMCPServerVersion(ctx, name, version)
	return err == nil
}

func mcpServerEndpointExists(ctx context.Context, reg *mcpregistry.Client, name, endpointURL string) bool {
	server, err := reg.GetMCPServer(ctx, name)
	if err != nil {
		return false
	}
	for _, endpoint := range server.AccessEndpoints {
		if endpoint.EndpointURL == endpointURL {
			return true
		}
	}
	return false
}

// SeedPrompts registers sample prompts in the local MLflow instance.
//
// Seeding is idempotent: any prompt whose name already exists in the registry is
// skipped entirely (all its versions), so restarting the BFF against an already-running
// MLflow instance does not create duplicate prompt versions.
func SeedPrompts(trackingURI string, logger *slog.Logger) error {
	playgroundNamespace := strings.TrimSpace(os.Getenv("PLAYGROUND_NAMESPACE"))
	workspaces := devMLflowWorkspaces(playgroundNamespace)
	for _, workspace := range workspaces {
		if err := ensureMLflowWorkspace(trackingURI, workspace, logger); err != nil {
			return fmt.Errorf("failed to ensure MLflow workspace %q: %w", workspace, err)
		}
		if err := seedPromptsInWorkspace(trackingURI, workspace, logger); err != nil {
			return fmt.Errorf("failed to seed prompts for workspace %q: %w", workspace, err)
		}
	}

	logger.Info("Seeded MLflow with sample prompts", slog.Any("workspaces", workspaces))
	return nil
}

func seedPromptsInWorkspace(trackingURI, workspace string, logger *slog.Logger) error {
	clientOpts := []mlflow.Option{
		mlflow.WithTrackingURI(trackingURI),
		mlflow.WithInsecure(),
	}
	if workspace != "" && workspace != "default" {
		clientOpts = append(clientOpts, mlflow.WithHeaders(map[string]string{
			"X-MLFLOW-WORKSPACE": workspace,
		}))
	}

	client, err := mlflow.NewClient(clientOpts...)
	if err != nil {
		return fmt.Errorf("failed to create MLflow client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), seedTimeout)
	defer cancel()

	reg := client.PromptRegistry()

	prompts := []struct {
		name      string
		versions  []seedVersion
		seedType  string
		textTempl string
	}{
		{
			name: "vet-appointment-dora",
			versions: []seedVersion{
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a veterinary clinic assistant. Help schedule appointments for dogs. Be friendly and professional."},
						{Role: "user", Content: "I need to schedule a vet appointment for my dog Dora on {{date}}. Reason: {{reason}}."},
					},
					commit: "Basic appointment scheduling for Dora",
					tags:   map[string]string{"pet": "dora", "breed": "mixed"},
				},
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a veterinary clinic assistant specializing in anxious dogs. Dora is a mixed breed who gets nervous at the vet. Always suggest calming strategies and allow extra time in appointments."},
						{Role: "user", Content: "Hi Dr. {{vet_name}}, I'd like to schedule an appointment for my dog Dora.\nDate: {{date}}\nReason: {{reason}}\nWeight: {{weight}}\n\nShe's a bit nervous at the vet, so please allow extra time."},
					},
					commit: "Detailed appointment request with anxiety note",
					tags:   map[string]string{"pet": "dora", "breed": "mixed", "formal": "true"},
				},
			},
			seedType: "chat",
		},
		{
			name: "pet-health-bella",
			versions: []seedVersion{
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a veterinary health analyst. Provide preliminary health assessments for dogs based on symptoms and vitals. Always recommend follow-up with a veterinarian for definitive diagnosis."},
						{Role: "user", Content: "Patient: Bella\nBreed: {{breed}}\nWeight: {{weight}}\nAge: {{age}}\n\nSymptoms: {{symptoms}}\n\nPlease provide a preliminary health assessment."},
					},
					commit: "Health summary with preliminary assessment",
					tags:   map[string]string{"pet": "bella", "category": "health"},
				},
			},
			seedType: "chat",
		},
		{
			name: "medication-reminder-ellie",
			versions: []seedVersion{
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a pet medication assistant. Generate clear, actionable medication reminders for dogs. Include any relevant warnings about food interactions or timing."},
						{Role: "user", Content: "Create a reminder for Ellie's medication: {{medication}} ({{dosage}}) at {{time}}. Notes: {{notes}}"},
					},
					commit: "Simple medication reminder",
					tags:   map[string]string{"pet": "ellie", "category": "medication"},
				},
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a veterinary pharmacist assistant. Create detailed medication schedules for dogs. Include drug interaction warnings, storage instructions, and signs to watch for adverse reactions."},
						{Role: "user", Content: "Create a detailed medication schedule for Ellie:\n\nMedication: {{medication}}\nDosage: {{dosage}}\nFrequency: {{frequency}}\nTime: {{time}}\nDuration: {{duration}}\nPrescribed by: Dr. {{vet_name}}\n\nSpecial instructions: {{notes}}"},
					},
					commit: "Detailed medication schedule with safety info",
					tags:   map[string]string{"pet": "ellie", "category": "medication", "detailed": "true"},
				},
			},
			seedType: "chat",
		},
		{
			name:     "pet-adoption-letter",
			seedType: "text",
			textTempl: "Dear {{adopter_name}},\n\nCongratulations on adopting {{pet_name}}! Here are some tips for the first week:\n\n" +
				"1. Set up a quiet space for {{pet_name}} to decompress\n" +
				"2. Keep the same food brand: {{food_brand}}\n" +
				"3. First vet visit scheduled: {{vet_date}}\n" +
				"4. Emergency vet number: {{emergency_number}}\n\n" +
				"Welcome to the family, {{pet_name}}!",
			versions: []seedVersion{
				{
					commit: "Adoption welcome letter template",
					tags:   map[string]string{"category": "adoption", "type": "letter"},
				},
			},
		},
	}

	for _, p := range prompts {
		if _, err := reg.LoadPrompt(ctx, p.name); err == nil {
			logger.Debug("Prompt already exists, skipping seed",
				slog.String("name", p.name),
				slog.String("workspace", workspace),
			)
			continue
		}

		for _, v := range p.versions {
			var pv *promptregistry.PromptVersion
			var regErr error

			if p.seedType == "text" {
				pv, regErr = reg.RegisterPrompt(ctx, p.name, p.textTempl,
					promptregistry.WithCommitMessage(v.commit),
					promptregistry.WithTags(v.tags),
				)
			} else {
				pv, regErr = reg.RegisterChatPrompt(ctx, p.name, v.messages,
					promptregistry.WithCommitMessage(v.commit),
					promptregistry.WithTags(v.tags),
				)
			}

			if regErr != nil {
				return fmt.Errorf("failed to seed prompt %s: %w", p.name, regErr)
			}
			logger.Debug("Seeded prompt version",
				slog.String("name", p.name),
				slog.String("workspace", workspace),
				slog.Int("version", pv.Version),
				slog.String("commit", v.commit),
			)
		}
	}

	return nil
}

type seedVersion struct {
	messages []promptregistry.ChatMessage
	commit   string
	tags     map[string]string
}
