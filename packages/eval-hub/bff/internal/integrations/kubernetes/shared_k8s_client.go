package kubernetes

import (
	"context"
	"log/slog"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
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

func parseEvalHubCRStatus(item *unstructured.Unstructured) (*models.EvalHubCRStatus, error) {
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
