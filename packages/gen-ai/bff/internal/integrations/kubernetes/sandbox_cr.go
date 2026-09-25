package kubernetes

import (
	"context"
	"fmt"
	"strconv"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/pgvector"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	sandboxGroup   = "agents.x-k8s.io"
	sandboxVersion = "v1beta1"
	sandboxKind    = "Sandbox"

	sandboxContainerName = "agent"
	sandboxConfigMount   = "/etc/ogx"
	sandboxWrapperMount  = "/opt/custom"

	agentProfileIDLabel = "opendatahub.io/agent-profile-id"
)

// SandboxCROptions holds all parameters for building a Sandbox CR.
type SandboxCROptions struct {
	// Name is used as the Sandbox CR name and app.kubernetes.io/instance label.
	Name string
	// ProfileID is stored as a label so list/get can use a label selector.
	ProfileID               string
	LlamaStackConfigMapName string
	WrapperAppConfigMapName string
	// Image is the container image for the agent pod, sourced from RELATED_IMAGE_ODH_OGX_CORE_IMAGE.
	Image            string
	MaaSGatewayURL   string
	MaaSSubscription string
	// AgentConfigJSON is the immutable AgentProfile snapshot exposed by the agent's
	// authenticated /internal/agent_config endpoint.
	AgentConfigJSON string
	// OGXModelID is the sole provider-qualified LLM model registered for this deployment.
	// The wrapper applies it to every Responses API request.
	OGXModelID string
	// ModelSourceType controls whether the wrapper exchanges a caller token for a MaaS API key.
	ModelSourceType string
	// SystemPrompt is the resolved MLflow system message applied to every Responses API request.
	SystemPrompt string
	// MCPServersJSON describes selected MCP servers without embedding credentials.
	MCPServersJSON string
	// ModelAuthSecret is set for custom endpoint models and injected as AGENT_MODEL_API_KEY.
	ModelAuthSecret *SandboxSecretEnvVar
	// VectorStoreIDsJSON describes the vector stores selected by the profile. The
	// wrapper uses it to add a file_search tool to every Responses API request.
	VectorStoreIDsJSON string
	MCPAuthSecrets     []SandboxSecretEnvVar
	// PgvectorHost defaults to <pgvector-service>.<namespace>.svc.cluster.local when empty.
	PgvectorHost string
	// PgvectorSecretName defaults to pgvector.CredentialsSecretName when empty.
	PgvectorSecretName string
	// MLflow — empty strings suppress the corresponding env var.
	MLflowTrackingURI   string
	MLflowPromptName    string
	MLflowPromptVersion string
}

// SandboxSecretEnvVar maps a deployment-created Secret to a container environment variable.
type SandboxSecretEnvVar struct {
	Name       string
	SecretName string
}

// SandboxMCPServer contains the non-secret MCP configuration injected into the wrapper.
type SandboxMCPServer struct {
	ServerLabel         string    `json:"server_label"`
	ServerURL           string    `json:"server_url"`
	AllowedTools        *[]string `json:"allowed_tools,omitempty"`
	AuthorizationEnvVar string    `json:"authorization_env_var,omitempty"`
}

func (kc *TokenKubernetesClient) sandboxOwnerReference(
	ctx context.Context,
	namespace, sandboxName string,
) (metav1.OwnerReference, error) {
	sandbox := &unstructured.Unstructured{}
	sandbox.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   sandboxGroup,
		Version: sandboxVersion,
		Kind:    sandboxKind,
	})
	if err := kc.Client.Get(ctx, client.ObjectKey{Namespace: namespace, Name: sandboxName}, sandbox); err != nil {
		return metav1.OwnerReference{}, fmt.Errorf("failed to read Sandbox %s for owner reference: %w", sandboxName, err)
	}
	if sandbox.GetUID() == "" {
		return metav1.OwnerReference{}, fmt.Errorf("sandbox %s has no UID", sandboxName)
	}

	controller := true
	return metav1.OwnerReference{
		APIVersion: sandboxGroup + "/" + sandboxVersion,
		Kind:       sandboxKind,
		Name:       sandboxName,
		UID:        sandbox.GetUID(),
		Controller: &controller,
	}, nil
}

// CreateSandboxCR creates the Sandbox CR using the unstructured controller-runtime client.
// Returns the created Sandbox name.
func (kc *TokenKubernetesClient) CreateSandboxCR(
	ctx context.Context,
	namespace string,
	opts SandboxCROptions,
) (string, error) {
	pgvectorHost := opts.PgvectorHost
	if pgvectorHost == "" {
		pgvectorHost = fmt.Sprintf("%s.%s.svc.cluster.local", pgvector.ServiceName, namespace)
	}
	pgvectorSecret := opts.PgvectorSecretName
	if pgvectorSecret == "" {
		pgvectorSecret = pgvector.CredentialsSecretName
	}

	envVars := buildSandboxEnvVars(opts, pgvectorHost, pgvectorSecret)

	cr := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": sandboxGroup + "/" + sandboxVersion,
			"kind":       sandboxKind,
			"metadata": map[string]interface{}{
				"name":      opts.Name,
				"namespace": namespace,
				"labels": map[string]interface{}{
					dashboardLabel:      "true",
					agentProfileIDLabel: opts.ProfileID,
				},
			},
			"spec": map[string]interface{}{
				"operatingMode": "Running",
				"service":       true,
				"podTemplate": map[string]interface{}{
					"metadata": map[string]interface{}{
						"labels": map[string]interface{}{
							"app.kubernetes.io/instance": lsdName,
						},
					},
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":    sandboxContainerName,
								"image":   opts.Image,
								"command": []interface{}{"python3", "/opt/custom/app.py"},
								"ports": []interface{}{
									map[string]interface{}{
										"name":          "http",
										"containerPort": int64(8321),
									},
								},
								"env": envVars,
								"volumeMounts": []interface{}{
									map[string]interface{}{
										"name":      "ogx-config",
										"mountPath": sandboxConfigMount,
										"readOnly":  true,
									},
									map[string]interface{}{
										"name":      "wrapper-app",
										"mountPath": sandboxWrapperMount,
										"readOnly":  true,
									},
								},
							},
						},
						"volumes": []interface{}{
							map[string]interface{}{
								"name": "ogx-config",
								"configMap": map[string]interface{}{
									"name": opts.LlamaStackConfigMapName,
								},
							},
							map[string]interface{}{
								"name": "wrapper-app",
								"configMap": map[string]interface{}{
									"name": opts.WrapperAppConfigMapName,
								},
							},
						},
					},
				},
			},
		},
	}
	cr.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   sandboxGroup,
		Version: sandboxVersion,
		Kind:    sandboxKind,
	})

	if err := kc.Client.Create(ctx, cr); err != nil {
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to create Sandbox CR", "error", err, "namespace", namespace)
			return "", &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to create Sandbox CR",
				},
			}
		}
		kc.Logger.Error("failed to create Sandbox CR", "error", err, "name", opts.Name, "namespace", namespace)
		return "", fmt.Errorf("failed to create Sandbox CR: %w", err)
	}

	kc.Logger.Info("created Sandbox CR", "name", opts.Name, "namespace", namespace)
	return cr.GetName(), nil
}

func buildSandboxEnvVars(opts SandboxCROptions, pgvectorHost, pgvectorSecret string) []interface{} {
	vars := []interface{}{
		sandboxEnvVar("OGX_CONFIG", "/etc/ogx/config.yaml"),
		sandboxEnvVar("OGX_CONFIG_DIR", "/opt/app-root/src/.ogx/distributions/rh/"),
		sandboxEnvVar("VLLM_TLS_VERIFY", "false"),
		sandboxEnvVar("FAISS_STORE_DIR", "/opt/app-root/.llama/faiss"),
		sandboxEnvVar("MAAS_GATEWAY_URL", opts.MaaSGatewayURL),
		sandboxEnvVar("MAAS_SUBSCRIPTION", opts.MaaSSubscription),
		sandboxEnvVar("AGENT_CONFIG_JSON", opts.AgentConfigJSON),
		sandboxEnvVar("AGENT_OGX_MODEL_ID", opts.OGXModelID),
		sandboxEnvVar("AGENT_MODEL_SOURCE_TYPE", opts.ModelSourceType),
		sandboxEnvVar("AGENT_SYSTEM_PROMPT", opts.SystemPrompt),
		sandboxEnvVar("AGENT_MCP_SERVERS_JSON", opts.MCPServersJSON),
		sandboxEnvVar("AGENT_VECTOR_STORE_IDS_JSON", opts.VectorStoreIDsJSON),
		sandboxEnvVar(pgvector.HostEnvVar, pgvectorHost),
		sandboxEnvVar(pgvector.PortEnvVar, strconv.Itoa(pgvector.DefaultPort)),
		sandboxEnvVar(pgvector.DBEnvVar, pgvector.DefaultDB),
		sandboxEnvVar(pgvector.UserEnvVar, pgvector.DefaultUser),
		sandboxEnvVarFromSecret(pgvector.PasswordEnvVar, pgvectorSecret, pgvector.DefaultPasswordKey),
		sandboxEnvVar("SENTENCE_TRANSFORMERS_HOME", "/opt/app-root/.cache/huggingface/hub"),
		sandboxEnvVar("HF_HUB_OFFLINE", "1"),
		sandboxEnvVar("TRANSFORMERS_OFFLINE", "1"),
		sandboxEnvVar("HF_DATASETS_OFFLINE", "1"),
	}
	for _, secret := range opts.MCPAuthSecrets {
		vars = append(vars, sandboxEnvVarFromSecret(secret.Name, secret.SecretName, sandboxMCPAuthSecretKey))
	}
	if opts.ModelAuthSecret != nil {
		vars = append(vars, sandboxEnvVarFromSecret(opts.ModelAuthSecret.Name, opts.ModelAuthSecret.SecretName, sandboxMCPAuthSecretKey))
	}

	if opts.MLflowTrackingURI != "" {
		vars = append(vars, sandboxEnvVar("MLFLOW_TRACKING_URI", opts.MLflowTrackingURI))
	}
	if opts.MLflowPromptName != "" {
		vars = append(vars, sandboxEnvVar("MLFLOW_PROMPT_NAME", opts.MLflowPromptName))
	}
	if opts.MLflowPromptVersion != "" {
		vars = append(vars, sandboxEnvVar("MLFLOW_PROMPT_VERSION", opts.MLflowPromptVersion))
	}

	return vars
}

func sandboxEnvVar(name, value string) map[string]interface{} {
	return map[string]interface{}{"name": name, "value": value}
}

func sandboxEnvVarFromSecret(name, secretName, key string) map[string]interface{} {
	return map[string]interface{}{
		"name": name,
		"valueFrom": map[string]interface{}{
			"secretKeyRef": map[string]interface{}{
				"name": secretName,
				"key":  key,
			},
		},
	}
}
