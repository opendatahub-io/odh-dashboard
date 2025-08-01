package api

import (
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/rag-playground/internal/constants"
	"github.com/opendatahub-io/rag-playground/internal/integrations"
	"github.com/opendatahub-io/rag-playground/internal/integrations/llamastack"
	"github.com/opendatahub-io/rag-playground/internal/models"
)

type ModelEnvelope Envelope[models.Model, None]
type ModelListEnvelope Envelope[models.ModelList, None]

const (
	LLMModelType       = "llm"
	EmbeddingModelType = "embedding"
)

func (app *App) GetAllModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	client, ok := r.Context().Value(constants.LlamaStackHttpClientKey).(integrations.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("REST client not found"))
		return
	}

	modelList, err := app.repositories.LlamaStackClient.GetAllModels(client)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	params := r.URL.Query()
	modelType := params.Get("model_type")

	switch modelType {
	case LLMModelType:
		llmModels := []llamastack.Model{}
		for _, model := range modelList.Data {
			if model.ModelType == llamastack.LLMModelType {
				llmModels = append(llmModels, model)
			}
		}
		modelList = &llamastack.ModelList{Data: llmModels}
	case EmbeddingModelType:
		embeddingModels := []llamastack.Model{}
		for _, model := range modelList.Data {
			if model.ModelType == llamastack.EmbeddingModelType {
				embeddingModels = append(embeddingModels, model)
			}
		}
		modelList = &llamastack.ModelList{Data: embeddingModels}
	}

	result := ModelListEnvelope{
		Data: convertModelList(modelList),
	}

	err = app.WriteJSON(w, http.StatusOK, result, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func convertModel(model *llamastack.Model) models.Model {
	return models.Model{
		Identifier:         model.Identifier,
		ModelType:          string(model.ModelType),
		ProviderID:         model.ProviderID,
		ProviderResourceID: model.ProviderResourceID,
	}
}

func convertModelList(modelList *llamastack.ModelList) models.ModelList {
	var items []models.Model

	for _, model := range modelList.Data {
		items = append(items, convertModel(&model))
	}

	return models.ModelList{
		Items: items,
	}
}
