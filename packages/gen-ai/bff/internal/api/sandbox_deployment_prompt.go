package api

import (
	"context"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

var sandboxPromptVariablePattern = regexp.MustCompile(`\{\{\s*([a-zA-Z_]\w*)\s*\}\}`)

// resolveSandboxSystemPrompt loads the selected MLflow prompt and returns its rendered system message.
// The value is snapshotted into the Sandbox at deployment time rather than loaded by the agent pod.
func (app *App) resolveSandboxSystemPrompt(
	ctx context.Context,
	namespace string,
	prompt *models.SystemPromptReference,
) (string, error) {
	if prompt == nil || prompt.Source != "mlflow" {
		return "", nil
	}

	mlflowClient := app.mlflowBFFClient(ctx)
	if mlflowClient == nil {
		return "", bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow)
	}

	path := "/prompts/" + url.PathEscape(prompt.Name) + "?workspace=" + url.QueryEscape(namespace)
	if prompt.Version != "" {
		path += "&version=" + url.QueryEscape(prompt.Version)
	}

	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	var response struct {
		Data models.MLflowPromptVersion `json:"data"`
	}
	if err := mlflowClient.Call(callCtx, "GET", path, nil, &response); err != nil {
		return "", err
	}

	for _, message := range response.Data.Messages {
		if strings.EqualFold(message.Role, "system") && strings.TrimSpace(message.Content) != "" {
			return substituteSandboxPromptVariables(message.Content, prompt.Variables), nil
		}
	}
	// MLflow supports either chat messages or a single text template. A template
	// represents the entire prompt, so use it as the deployment's system message
	// when the selected prompt was not registered in chat-message form.
	if strings.TrimSpace(response.Data.Template) != "" {
		return substituteSandboxPromptVariables(response.Data.Template, prompt.Variables), nil
	}

	return "", fmt.Errorf("MLflow prompt %q version %d has no system message", response.Data.Name, response.Data.Version)
}

func substituteSandboxPromptVariables(template string, variables map[string]models.PromptVariable) string {
	return sandboxPromptVariablePattern.ReplaceAllStringFunc(template, func(match string) string {
		name := sandboxPromptVariablePattern.FindStringSubmatch(match)[1]
		if variable, ok := variables[name]; ok {
			return variable.Text
		}
		return ""
	})
}
