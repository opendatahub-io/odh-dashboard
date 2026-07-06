package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	k8sclient "k8s.io/client-go/kubernetes"

	"k8s.io/client-go/dynamic"
)

func (app *App) EnableManagedPipelinesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	logger := slog.Default()

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

	dspas, err := listDSPipelineApplications(ctx, client, namespace, app.config.MockK8Client, logger)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if len(dspas) == 0 {
		app.notFoundResponseWithMessage(w, r, fmt.Sprintf("no DSPipelineApplication found in namespace %s", namespace))
		return
	}

	dspa := dspas[0]

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

	gvr, err := discoverDSPipelineApplicationGVR(ctx, restConfig, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	resource := dynamicClient.Resource(gvr).Namespace(namespace)

	// Read the live DSPA to decide whether to enable or restart.
	// If managedPipelines is already set but the pipeline definitions are missing,
	// patching the same value is a no-op — the controller sees no spec change and
	// the server won't restart. In that case we delete the pipeline server pods so
	// the init-managed-pipelines init container re-runs and recreates the definitions.
	// Annotating the DSPA with restartedAt does NOT work because the DSPA controller
	// does not propagate annotations to the deployment's pod template.
	live, err := resource.Get(ctx, dspa.Metadata.Name, metav1.GetOptions{})
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
		// Delete pipeline server pods to force a restart. The deployment controller
		// recreates them, and the init-managed-pipelines init container re-registers
		// any missing pipeline definitions on startup.
		clientset, ok2 := client.GetClientset().(k8sclient.Interface)
		if !ok2 {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get kubernetes clientset for pod deletion"))
			return
		}

		labelSelector := fmt.Sprintf("app=ds-pipeline-%s", dspa.Metadata.Name)
		err = clientset.CoreV1().Pods(namespace).DeleteCollection(ctx,
			metav1.DeleteOptions{},
			metav1.ListOptions{LabelSelector: labelSelector},
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

		_, err = resource.Patch(ctx, dspa.Metadata.Name, types.MergePatchType, patchBytes, metav1.PatchOptions{})
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
