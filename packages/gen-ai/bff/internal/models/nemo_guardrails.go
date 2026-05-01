package models

import "fmt"

// NemoGuardrailsInitModel is the response payload returned after successfully creating
// NemoGuardrails resources.
type NemoGuardrailsInitModel struct {
	Name string `json:"name"` // name of the created NemoGuardrails CR
}

// ErrNemoGuardrailsAlreadyInitialised is returned when NemoGuardrails resources already
// exist in the namespace. The caller should treat this as a 400 Bad Request.
type ErrNemoGuardrailsAlreadyInitialised struct {
	Namespace string
}

func (e *ErrNemoGuardrailsAlreadyInitialised) Error() string {
	return fmt.Sprintf("NemoGuardrails already initialised in namespace %s", e.Namespace)
}

// GuardrailInlineConfig contains the inline guardrail configuration sent by the frontend
// with each response creation request. The BFF resolves the model endpoint URL and API key
// from Kubernetes at request time, so the frontend only supplies logical IDs.
type GuardrailInlineConfig struct {
	// GuardrailModel is the LlamaStack-registered model ID for NeMo guardrail checks.
	GuardrailModel string `json:"guardrail_model"`

	// GuardrailModelSourceType mirrors model_source_type on the main request:
	//   "namespace"       – in-cluster InferenceService; uses the user's JWT token
	//   "custom_endpoint" – external endpoint from the external-models ConfigMap; key from K8s Secret
	//   "maas"            – MaaS model (maas- prefix); uses an ephemeral MaaS token
	GuardrailModelSourceType ModelSourceTypeEnum `json:"guardrail_model_source_type,omitempty"`

	// GuardrailSubscription is the MaaS subscription for the guardrail model when it differs
	// from the main model's subscription. Falls back to the top-level subscription when omitted.
	GuardrailSubscription string `json:"guardrail_subscription,omitempty"`

	InputEnabled  bool   `json:"input_enabled,omitempty"`
	OutputEnabled bool   `json:"output_enabled,omitempty"`
	InputPrompt   string `json:"input_prompt,omitempty"`
	OutputPrompt  string `json:"output_prompt,omitempty"`
}

// ResolveSubscription returns the subscription to use for MaaS token generation.
// Prefers the guardrail-specific subscription; falls back to the main model's subscription
// so existing callers that set only the top-level field keep working.
func (g *GuardrailInlineConfig) ResolveSubscription(mainSubscription string) string {
	if g.GuardrailSubscription != "" {
		return g.GuardrailSubscription
	}
	return mainSubscription
}
