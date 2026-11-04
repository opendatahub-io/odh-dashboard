package repositories

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

const (
	mcpGatewayNamespace          = "mcp-gateway-system"
	mcpGatewayServiceLabel       = "gateway.networking.k8s.io/gateway-name=mcp-gateway"
	mcpUsabilityConfigMapName    = "project-matrix-gateway-usability"
	mcpUsabilityProbeTimeout     = 20 * time.Second
	mcpUsabilityResponseMaxBytes = 2 << 20
)

var (
	openshiftRouteGVR = schema.GroupVersionResource{
		Group: "route.openshift.io", Version: "v1", Resource: "routes",
	}
	serviceGVR = schema.GroupVersionResource{Version: "v1", Resource: "services"}
)

// GetGatewayLayerUsability reads the last authenticated probe result. No
// result is represented as an unchecked state rather than as a failure.
func GetGatewayLayerUsability(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
) (models.GatewayLayerUsability, error) {
	dyn, err := dynamicClientFor(client)
	if err != nil {
		return models.GatewayLayerUsability{}, err
	}
	item, err := dyn.Resource(configMapGVR).Namespace(namespace).Get(ctx, mcpUsabilityConfigMapName, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return models.GatewayLayerUsability{}, nil
	}
	if err != nil {
		return models.GatewayLayerUsability{}, fmt.Errorf("failed to read Gateway usability result: %w", err)
	}

	data, _, err := unstructured.NestedStringMap(item.Object, "data")
	if err != nil {
		return models.GatewayLayerUsability{}, fmt.Errorf("failed to decode Gateway usability result: %w", err)
	}
	return models.GatewayLayerUsability{
		Checked:   data["checked"] == "true",
		Usable:    data["usable"] == "true",
		Message:   data["message"],
		CheckedAt: data["checkedAt"],
	}, nil
}

// RunGatewayLayerUsabilityProbe performs the authenticated MCP protocol
// checks through the discovered OpenShift Route and persists only the result,
// never the bearer token or response payload.
func RunGatewayLayerUsabilityProbe(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	token string,
	insecureSkipVerify bool,
	rootCAs *x509.CertPool,
) (models.GatewayLayerUsability, error) {
	result := models.GatewayLayerUsability{
		Checked:   true,
		CheckedAt: time.Now().UTC().Format(time.RFC3339),
	}

	if strings.TrimSpace(token) == "" {
		result.Message = "The authenticated MCP usability probe requires the signed-in user's bearer token."
		return result, persistGatewayLayerUsability(ctx, client, namespace, result)
	}

	dyn, err := dynamicClientFor(client)
	if err == nil {
		var endpoint string
		endpoint, err = discoverMcpGatewayEndpoint(ctx, dyn)
		if err == nil {
			result, err = probeMcpGateway(ctx, endpoint, token, insecureSkipVerify, rootCAs)
		}
	}
	if err != nil {
		result.Usable = false
		result.Message = fmt.Sprintf("Authenticated MCP usability probe failed: %s", err)
	}

	if persistErr := persistGatewayLayerUsability(ctx, client, namespace, result); persistErr != nil {
		return result, persistErr
	}
	return result, nil
}

func dynamicClientFor(client k8s.KubernetesClientInterface) (dynamic.Interface, error) {
	cfg, err := restConfigForClient(client)
	if err != nil {
		return nil, err
	}
	dyn, err := dynamic.NewForConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic Kubernetes client: %w", err)
	}
	return dyn, nil
}

func discoverMcpGatewayEndpoint(ctx context.Context, dyn dynamic.Interface) (string, error) {
	services, err := dyn.Resource(serviceGVR).Namespace(mcpGatewayNamespace).List(ctx, metav1.ListOptions{LabelSelector: mcpGatewayServiceLabel})
	if err != nil {
		return "", fmt.Errorf("failed to discover MCP Gateway service: %w", err)
	}
	serviceNames := make(map[string]struct{}, len(services.Items))
	for _, service := range services.Items {
		serviceNames[service.GetName()] = struct{}{}
	}

	routes, err := dyn.Resource(openshiftRouteGVR).Namespace(mcpGatewayNamespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, route := range routes.Items {
			host, _, _ := unstructured.NestedString(route.Object, "spec", "host")
			backend, _, _ := unstructured.NestedString(route.Object, "spec", "to", "name")
			if host != "" {
				if _, matchesGatewayService := serviceNames[backend]; matchesGatewayService || route.GetName() == "mcp-gateway" {
					return "https://" + host + "/mcp", nil
				}
			}
		}
	}

	// A deployment may provide an explicit route for platforms that do not
	// expose the OpenShift Route API to the dashboard service account.
	if explicit := strings.TrimRight(strings.TrimSpace(os.Getenv("PROJECT_MATRIX_GATEWAY_URL")), "/"); explicit != "" {
		return explicit + "/mcp", nil
	}
	if err != nil {
		return "", fmt.Errorf("failed to discover MCP Gateway route: %w", err)
	}
	return "", errors.New("no exposed MCP Gateway route was discovered")
}

type mcpJSONRPCResponse struct {
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func probeMcpGateway(
	ctx context.Context,
	endpoint string,
	token string,
	insecureSkipVerify bool,
	rootCAs *x509.CertPool,
) (models.GatewayLayerUsability, error) {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion:         tls.VersionTLS12,
			InsecureSkipVerify: insecureSkipVerify, // configured by the platform; never enabled by the probe itself
			RootCAs:            rootCAs,
		},
	}
	client := &http.Client{Transport: transport, Timeout: mcpUsabilityProbeTimeout}

	initResponse, sessionID, err := sendMcpRequest(ctx, client, endpoint, token, "", map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "initialize",
		"params": map[string]interface{}{
			"protocolVersion": "2025-11-25",
			"capabilities":    map[string]interface{}{},
			"clientInfo": map[string]string{
				"name":    "project-matrix-probe",
				"version": "0.1.0",
			},
		},
	})
	if err != nil {
		return models.GatewayLayerUsability{}, fmt.Errorf("initialize: %w", err)
	}
	if initResponse.Error != nil || len(initResponse.Result) == 0 {
		return models.GatewayLayerUsability{}, fmt.Errorf("initialize: %s", mcpResponseError(initResponse))
	}

	if _, _, err := sendMcpRequest(ctx, client, endpoint, token, sessionID, map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "notifications/initialized",
	}); err != nil {
		return models.GatewayLayerUsability{}, fmt.Errorf("initialized notification: %w", err)
	}

	listResponse, _, err := sendMcpRequest(ctx, client, endpoint, token, sessionID, map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      2,
		"method":  "tools/list",
		"params":  map[string]interface{}{},
	})
	if err != nil {
		return models.GatewayLayerUsability{}, fmt.Errorf("tools/list: %w", err)
	}
	if listResponse.Error != nil || len(listResponse.Result) == 0 {
		return models.GatewayLayerUsability{}, fmt.Errorf("tools/list: %s", mcpResponseError(listResponse))
	}

	callResponse, _, err := sendMcpRequest(ctx, client, endpoint, token, sessionID, map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      3,
		"method":  "tools/call",
		"params": map[string]interface{}{
			"name":      "discover_tools",
			"arguments": map[string]interface{}{},
		},
	})
	if err != nil {
		return models.GatewayLayerUsability{}, fmt.Errorf("tools/call: %w", err)
	}
	if callResponse.Error != nil || len(callResponse.Result) == 0 {
		return models.GatewayLayerUsability{}, fmt.Errorf("tools/call: %s", mcpResponseError(callResponse))
	}
	var callResult struct {
		IsError bool `json:"isError"`
	}
	if err := json.Unmarshal(callResponse.Result, &callResult); err != nil {
		return models.GatewayLayerUsability{}, fmt.Errorf("tools/call response: %w", err)
	}
	if callResult.IsError {
		return models.GatewayLayerUsability{}, errors.New("tools/call returned an MCP tool error")
	}

	return models.GatewayLayerUsability{
		Checked:   true,
		Usable:    true,
		CheckedAt: time.Now().UTC().Format(time.RFC3339),
		Message:   "Authenticated initialize, tools/list, and tools/call probes passed through the MCP Gateway.",
	}, nil
}

func sendMcpRequest(
	ctx context.Context,
	client *http.Client,
	endpoint string,
	token string,
	sessionID string,
	payload map[string]interface{},
) (mcpJSONRPCResponse, string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return mcpJSONRPCResponse{}, "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return mcpJSONRPCResponse{}, "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if sessionID != "" {
		req.Header.Set("Mcp-Session-Id", sessionID)
	}
	response, err := client.Do(req)
	if err != nil {
		return mcpJSONRPCResponse{}, "", err
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, mcpUsabilityResponseMaxBytes))
	if err != nil {
		return mcpJSONRPCResponse{}, "", err
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return mcpJSONRPCResponse{}, "", fmt.Errorf("HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	if response.StatusCode == http.StatusAccepted {
		return mcpJSONRPCResponse{}, response.Header.Get("Mcp-Session-Id"), nil
	}
	var decoded mcpJSONRPCResponse
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		return mcpJSONRPCResponse{}, "", fmt.Errorf("decode response: %w", err)
	}
	return decoded, response.Header.Get("Mcp-Session-Id"), nil
}

func mcpResponseError(response mcpJSONRPCResponse) string {
	if response.Error != nil && response.Error.Message != "" {
		return response.Error.Message
	}
	return "the Gateway returned no JSON-RPC result"
}

func persistGatewayLayerUsability(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	result models.GatewayLayerUsability,
) error {
	dyn, err := dynamicClientFor(client)
	if err != nil {
		return err
	}
	data := map[string]interface{}{
		"checked":   fmt.Sprintf("%t", result.Checked),
		"usable":    fmt.Sprintf("%t", result.Usable),
		"message":   result.Message,
		"checkedAt": result.CheckedAt,
	}
	configMaps := dyn.Resource(configMapGVR).Namespace(namespace)
	item, err := configMaps.Get(ctx, mcpUsabilityConfigMapName, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		item = &unstructured.Unstructured{Object: map[string]interface{}{
			"apiVersion": "v1",
			"kind":       "ConfigMap",
			"metadata": map[string]interface{}{
				"name":      mcpUsabilityConfigMapName,
				"namespace": namespace,
				"labels": stringMapToInterface(map[string]string{
					projectMatrixManagedByLabel: projectMatrixManager,
					projectMatrixLayerLabel:     projectMatrixGatewayLayer,
				}),
			},
		}}
		if err := unstructured.SetNestedField(item.Object, data, "data"); err != nil {
			return err
		}
		_, err = configMaps.Create(ctx, item, metav1.CreateOptions{})
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to read Gateway usability result for update: %w", err)
	}
	if err := unstructured.SetNestedField(item.Object, data, "data"); err != nil {
		return err
	}
	_, err = configMaps.Update(ctx, item, metav1.UpdateOptions{})
	return err
}
