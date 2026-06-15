package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"time"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/kubernetes"
)

type SharedClientLogic struct {
	Client kubernetes.Interface
	Logger *slog.Logger
	Token  BearerToken
}

func (kc *SharedClientLogic) BearerToken() (string, error) { return kc.Token.Raw(), nil }

func (kc *SharedClientLogic) GetGroups(ctx context.Context) ([]string, error) { return []string{}, nil }

// GetEvalHubDiscoveryURL reads the EvalHubDiscovery ConfigMap from the given namespace and
// returns the service URL. Supports both the operator key format ("{instanceName}.url") and
// the legacy "service-url" key.
// Returns ("", nil) if the ConfigMap does not exist — callers should fall through to CR discovery.
func (kc *SharedClientLogic) GetEvalHubDiscoveryURL(ctx context.Context, _ *RequestIdentity, namespace string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	cm, err := kc.Client.CoreV1().ConfigMaps(namespace).Get(ctx, EvalHubDiscoveryConfigMap, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			kc.Logger.Debug("EvalHubDiscovery ConfigMap not found in namespace, will fall through to CR discovery",
				"namespace", namespace)
			return "", nil
		}
		if k8serrors.IsForbidden(err) {
			kc.Logger.Debug("Access denied reading EvalHubDiscovery ConfigMap",
				"namespace", namespace)
			return "", nil
		}
		return "", fmt.Errorf("failed to read %s ConfigMap in namespace %q: %w",
			EvalHubDiscoveryConfigMap, namespace, err)
	}

	serviceURL := resolveDiscoveryURL(cm.Data)
	if serviceURL == "" {
		kc.Logger.Warn("EvalHubDiscovery ConfigMap exists but contains no usable service URL",
			"namespace", namespace)
		return "", nil
	}

	if err := validateServiceURL(serviceURL); err != nil {
		kc.Logger.Error("EvalHubDiscovery ConfigMap contains invalid service-url",
			"namespace", namespace, "error", err)
		return "", fmt.Errorf("invalid service-url in %s ConfigMap (namespace %q): %w",
			EvalHubDiscoveryConfigMap, namespace, err)
	}

	kc.Logger.Debug("Resolved EvalHub service URL from discovery ConfigMap",
		"namespace", namespace, "serviceURL", serviceURL)
	return serviceURL, nil
}

// resolveDiscoveryURL extracts the service URL from the discovery ConfigMap data.
// It supports two formats:
//   - Operator format (PR trustyai-service-operator#760): keys ending in ".url" (e.g. "evalhub.url")
//   - Legacy format: a single "service-url" key
//
// When multiple ".url" keys exist, the lexicographically smallest key is chosen
// to ensure deterministic routing across calls.
func resolveDiscoveryURL(data map[string]string) string {
	var bestKey, bestURL string
	for key, value := range data {
		if strings.HasSuffix(key, EvalHubDiscoveryURLSuffix) {
			if u := strings.TrimSpace(value); u != "" {
				if bestKey == "" || key < bestKey {
					bestKey = key
					bestURL = u
				}
			}
		}
	}
	if bestURL != "" {
		return bestURL
	}
	// Fall back to legacy "service-url" key for manually-created ConfigMaps.
	return strings.TrimSpace(data[EvalHubDiscoveryURLKey])
}

// validateServiceURL ensures the URL is well-formed and pinned to a known EvalHub service
// inside the cluster. This prevents SSRF if a malicious actor gains write access to the
// discovery ConfigMap — the BFF will refuse to forward bearer tokens to arbitrary endpoints.
func validateServiceURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("malformed URL: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("unsupported scheme %q (must be http or https)", u.Scheme)
	}
	if u.User != nil {
		return fmt.Errorf("URL must not contain embedded credentials")
	}
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("URL must contain a hostname")
	}
	if !strings.HasSuffix(host, ".svc.cluster.local") && !strings.HasSuffix(host, ".svc") {
		return fmt.Errorf("host %q is not a cluster-internal service (must end with .svc or .svc.cluster.local)", host)
	}
	serviceName := strings.SplitN(host, ".", 2)[0]
	if !strings.HasPrefix(serviceName, "evalhub") {
		return fmt.Errorf("service name %q does not match expected EvalHub service prefix", serviceName)
	}
	return nil
}

func ParseEvalHubCRStatus(item *unstructured.Unstructured) (*models.EvalHubCRStatus, error) {
	status, ok := item.Object["status"].(map[string]interface{})
	if !ok {
		return &models.EvalHubCRStatus{
			Name:      item.GetName(),
			Namespace: item.GetNamespace(),
			Phase:     "Progressing",
		}, nil
	}

	result := &models.EvalHubCRStatus{
		Name:      item.GetName(),
		Namespace: item.GetNamespace(),
	}

	if phase, ok := status["phase"].(string); ok {
		result.Phase = phase
	}
	if result.Phase == "" {
		result.Phase = "Progressing"
	}
	if ready, ok := status["ready"].(string); ok {
		result.Ready = ready
	}
	if url, ok := status["url"].(string); ok {
		result.URL = url
	}
	if lastUpdate, ok := status["lastUpdateTime"].(string); ok {
		result.LastUpdateTime = lastUpdate
	}
	if readyReplicas, ok := status["readyReplicas"].(int64); ok {
		result.ReadyReplicas = readyReplicas
	} else if readyReplicasFloat, ok := status["readyReplicas"].(float64); ok {
		result.ReadyReplicas = int64(readyReplicasFloat)
	}
	if replicas, ok := status["replicas"].(int64); ok {
		result.Replicas = replicas
	} else if replicasFloat, ok := status["replicas"].(float64); ok {
		result.Replicas = int64(replicasFloat)
	}

	if providers, ok := status["activeProviders"].([]interface{}); ok {
		for _, p := range providers {
			if s, ok := p.(string); ok {
				result.ActiveProviders = append(result.ActiveProviders, s)
			}
		}
	}

	if conditions, ok := status["conditions"].([]interface{}); ok {
		for _, c := range conditions {
			cond, ok := c.(map[string]interface{})
			if !ok {
				continue
			}
			result.Conditions = append(result.Conditions, models.EvalHubCondition{
				Type:               getStringField(cond, "type"),
				Status:             getStringField(cond, "status"),
				LastTransitionTime: getStringField(cond, "lastTransitionTime"),
				Reason:             getStringField(cond, "reason"),
				Message:            getStringField(cond, "message"),
			})
		}
	}

	return result, nil
}

func getStringField(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}
