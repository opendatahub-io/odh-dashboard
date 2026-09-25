package kubernetes

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	sandboxMCPAuthSecretPrefix   = "agent-mcp-auth-"
	sandboxMCPAuthSecretKey      = "authorization"
	sandboxModelAuthSecretPrefix = "agent-model-auth-"
	mcpServerIDAnnotation        = "opendatahub.io/mcp-server-id"
)

// CreateSandboxMCPAuthSecret creates a deployment-only Secret for one MCP server's
// authorization value. The caller attaches the Sandbox owner after creating the CR.
func (kc *TokenKubernetesClient) CreateSandboxMCPAuthSecret(
	ctx context.Context,
	namespace, serverID, authorization string,
) (*corev1.Secret, error) {
	suffix, err := RandomHex4()
	if err != nil {
		return nil, fmt.Errorf("failed to generate MCP auth Secret name suffix: %w", err)
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:        sandboxMCPAuthSecretPrefix + suffix,
			Namespace:   namespace,
			Labels:      map[string]string{dashboardLabel: "true"},
			Annotations: map[string]string{mcpServerIDAnnotation: serverID},
		},
		Type:       corev1.SecretTypeOpaque,
		StringData: map[string]string{sandboxMCPAuthSecretKey: authorization},
	}
	if err := kc.Client.Create(ctx, secret); err != nil {
		if apierrors.IsForbidden(err) {
			return nil, &integrations.HTTPError{StatusCode: 403, ErrorResponse: integrations.ErrorResponse{Code: "forbidden", Message: "insufficient permissions to create MCP authentication Secret"}}
		}
		return nil, fmt.Errorf("failed to create MCP authentication Secret: %w", err)
	}
	kc.Logger.Info("created MCP authentication Secret", "name", secret.Name, "namespace", namespace, "serverID", serverID)
	return secret, nil
}

// CreateSandboxModelAuthSecret creates a deployment-owned Secret for a custom endpoint API key.
// The caller attaches the Sandbox owner after creating the CR.
func (kc *TokenKubernetesClient) CreateSandboxModelAuthSecret(
	ctx context.Context,
	namespace, apiKey string,
) (*corev1.Secret, error) {
	suffix, err := RandomHex4()
	if err != nil {
		return nil, fmt.Errorf("failed to generate model auth Secret name suffix: %w", err)
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      sandboxModelAuthSecretPrefix + suffix,
			Namespace: namespace,
			Labels:    map[string]string{dashboardLabel: "true"},
		},
		Type:       corev1.SecretTypeOpaque,
		StringData: map[string]string{sandboxMCPAuthSecretKey: apiKey},
	}
	if err := kc.Client.Create(ctx, secret); err != nil {
		if apierrors.IsForbidden(err) {
			return nil, &integrations.HTTPError{StatusCode: 403, ErrorResponse: integrations.ErrorResponse{Code: "forbidden", Message: "insufficient permissions to create model authentication Secret"}}
		}
		return nil, fmt.Errorf("failed to create model authentication Secret: %w", err)
	}
	kc.Logger.Info("created model authentication Secret", "name", secret.Name, "namespace", namespace)
	return secret, nil
}

// SetSandboxMCPAuthSecretsOwner makes deployment-created MCP credential Secrets depend
// on the Sandbox CR so they are garbage collected with the agent.
func (kc *TokenKubernetesClient) SetSandboxMCPAuthSecretsOwner(ctx context.Context, namespace, sandboxName string, secretNames ...string) error {
	ownerRef, err := kc.sandboxOwnerReference(ctx, namespace, sandboxName)
	if err != nil {
		return err
	}
	for _, name := range secretNames {
		secret := &corev1.Secret{}
		if err := kc.Client.Get(ctx, client.ObjectKey{Namespace: namespace, Name: name}, secret); err != nil {
			return fmt.Errorf("failed to read MCP authentication Secret %s for owner reference: %w", name, err)
		}
		original := secret.DeepCopy()
		secret.OwnerReferences = appendOwnerReference(secret.OwnerReferences, ownerRef)
		if err := kc.Client.Patch(ctx, secret, client.MergeFrom(original)); err != nil {
			return fmt.Errorf("failed to set Sandbox owner reference on MCP authentication Secret %s: %w", name, err)
		}
	}
	return nil
}
