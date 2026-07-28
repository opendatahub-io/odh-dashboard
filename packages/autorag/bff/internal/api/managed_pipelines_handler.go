package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	k8sclient "k8s.io/client-go/kubernetes"

	"k8s.io/client-go/dynamic"
)

func (app *App) EnableManagedPipelinesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: %s", constants.NamespaceHeaderParameterKey))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Check that the caller has permission to patch DSPAs (always required).
	identity, _ := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if app.config.AuthMethod != config.AuthMethodDisabled {
		allowed, permErr := client.CanPatchDSPipelineApplications(ctx, identity, namespace)
		if permErr != nil {
			app.serverErrorResponse(w, r, permErr)
			return
		}
		if !allowed {
			app.forbiddenResponse(w, r, "insufficient permissions to patch DSPipelineApplications")
			return
		}
	}

	result, err := listDSPipelineApplicationsWithGVR(ctx, client, namespace, app.config.MockK8Client, logger)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if len(result.dspas) == 0 {
		app.notFoundResponseWithMessage(w, r, fmt.Sprintf("no DSPipelineApplication found in namespace %s", namespace))
		return
	}

	dspa := result.dspas[0]

	// In mock mode, skip the dynamic client operations (no real API server available).
	if app.config.MockK8Client {
		if writeErr := app.WriteJSON(w, http.StatusOK, map[string]string{
			"message": "managed pipelines enabled",
			"dspa":    dspa.Metadata.Name,
		}, nil); writeErr != nil {
			app.serverErrorResponse(w, r, writeErr)
		}
		return
	}

	restConfig := client.GetRestConfig()
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	resource := dynamicClient.Resource(result.gvr).Namespace(namespace)

	const k8sTimeout = 30 * time.Second
	k8sCtx, k8sCancel := context.WithTimeout(ctx, k8sTimeout)
	defer k8sCancel()

	live, err := resource.Get(k8sCtx, dspa.Metadata.Name, metav1.GetOptions{})
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	alreadyEnabled := false
	if spec, ok2 := live.Object["spec"].(map[string]any); ok2 {
		if apiServer, ok3 := spec["apiServer"].(map[string]any); ok3 {
			if _, ok4 := apiServer["managedPipelines"]; ok4 {
				alreadyEnabled = true
			}
		}
	}

	if alreadyEnabled {
		// Rollout restart the pipeline server deployment so the
		// init-managed-pipelines init container re-registers any missing
		// pipeline definitions on startup. This is equivalent to
		// `kubectl rollout restart deployment` and performs a graceful
		// rolling update rather than deleting pods outright.
		clientset, ok2 := client.GetClientset().(k8sclient.Interface)
		if !ok2 {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get kubernetes clientset for rollout restart"))
			return
		}

		deploymentName := fmt.Sprintf("ds-pipeline-%s", dspa.Metadata.Name)

		// Restart requires deployment patch permission scoped to the concrete deployment.
		if app.config.AuthMethod != config.AuthMethodDisabled {
			allowed, permErr := client.CanPatchDeployments(k8sCtx, identity, namespace, deploymentName)
			if permErr != nil {
				app.serverErrorResponse(w, r, permErr)
				return
			}
			if !allowed {
				app.forbiddenResponse(w, r, "insufficient permissions to restart pipeline server deployment")
				return
			}
		}
		restartPatch := fmt.Sprintf(
			`{"spec":{"template":{"metadata":{"annotations":{"kubectl.kubernetes.io/restartedAt":"%s"}}}}}`,
			metav1.Now().UTC().Format("2006-01-02T15:04:05Z"),
		)
		_, err = clientset.AppsV1().Deployments(namespace).Patch(
			k8sCtx, deploymentName, types.StrategicMergePatchType,
			[]byte(restartPatch), metav1.PatchOptions{},
		)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	} else {
		patchBytes, marshalErr := json.Marshal(map[string]any{
			"spec": map[string]any{
				"apiServer": map[string]any{
					"managedPipelines": map[string]any{},
				},
			},
		})
		if marshalErr != nil {
			app.serverErrorResponse(w, r, marshalErr)
			return
		}

		_, err = resource.Patch(k8sCtx, dspa.Metadata.Name, types.MergePatchType, patchBytes, metav1.PatchOptions{})
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	action := "enabled"
	if alreadyEnabled {
		action = "restarted"
	}

	if writeErr := app.WriteJSON(w, http.StatusOK, map[string]string{
		"message": fmt.Sprintf("managed pipelines %s", action),
		"dspa":    dspa.Metadata.Name,
	}, nil); writeErr != nil {
		app.serverErrorResponse(w, r, writeErr)
	}
}
