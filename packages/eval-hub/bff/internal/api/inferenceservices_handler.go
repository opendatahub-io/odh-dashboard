package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

var inferenceServiceGVR = schema.GroupVersionResource{
	Group:    "serving.kserve.io",
	Version:  "v1beta1",
	Resource: "inferenceservices",
}

type InferenceServicesEnvelope Envelope[models.InferenceServicesResponse, None]

func (app *App) InferenceServicesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	dynClient, err := newUserDynamicClient(identity.Token)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create dynamic client: %w", err))
		return
	}

	result, err := listInferenceServices(ctx, dynClient, namespace)
	if err != nil {
		logger.Warn("InferenceService listing failed, returning empty list", "namespace", namespace, "error", err)

		warning := "unable to list InferenceServices"
		if k8serrors.IsNotFound(err) {
			warning = "InferenceService CRD is not installed on this cluster"
		} else if k8serrors.IsForbidden(err) {
			warning = "you do not have permission to list InferenceServices in this namespace"
		}

		envelope := InferenceServicesEnvelope{
			Data: models.InferenceServicesResponse{
				Items:   []models.InferenceServiceItem{},
				Warning: warning,
			},
		}
		if writeErr := app.WriteJSON(w, http.StatusOK, envelope, nil); writeErr != nil {
			app.serverErrorResponse(w, r, writeErr)
		}
		return
	}

	envelope := InferenceServicesEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func newUserDynamicClient(token string) (dynamic.Interface, error) {
	baseConfig, err := helper.GetKubeconfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	cfg := rest.AnonymousClientConfig(baseConfig)
	cfg.BearerToken = token
	cfg.BearerTokenFile = ""
	cfg.Username = ""
	cfg.Password = ""
	cfg.ExecProvider = nil
	cfg.AuthProvider = nil

	return dynamic.NewForConfig(cfg)
}

func listInferenceServices(ctx context.Context, client dynamic.Interface, namespace string) (*models.InferenceServicesResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	list, err := client.Resource(inferenceServiceGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	items := make([]models.InferenceServiceItem, 0, len(list.Items))
	for _, obj := range list.Items {
		name := obj.GetName()
		var url string
		var ready bool

		if status, ok := obj.Object["status"].(map[string]interface{}); ok {
			// Prefer status.address.url (includes the real container port for
			// headless / RawDeployment services) over the top-level status.url
			// which defaults to port 80.
			if addr, ok := status["address"].(map[string]interface{}); ok {
				if u, ok := addr["url"].(string); ok && u != "" {
					url = u
				}
			}
			if url == "" {
				if u, ok := status["url"].(string); ok {
					url = u
				}
			}
			if conditions, ok := status["conditions"].([]interface{}); ok {
				for _, c := range conditions {
					cond, ok := c.(map[string]interface{})
					if !ok {
						continue
					}
					if cond["type"] == "Ready" && cond["status"] == "True" {
						ready = true
						break
					}
				}
			}
		}

		items = append(items, models.InferenceServiceItem{
			Name:  name,
			URL:   url,
			Ready: ready,
		})
	}

	return &models.InferenceServicesResponse{Items: items}, nil
}
