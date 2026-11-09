package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

type InfoEnvelope Envelope[evalhub.InfoResponse, None]

// InfoHandler proxies the EvalHub service info API: build metadata plus the
// hardware profiles enabled for the caller's tenant namespace, each carrying
// its queue availability for queue-backed scheduling — the BFF performs no
// direct Kueue reads.
func (app *App) InfoHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	evalHubClient, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || evalHubClient == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}
	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	info, err := evalHubClient.GetInfo(ctx, namespace)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to load EvalHub service info")
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, InfoEnvelope{Data: *info}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
