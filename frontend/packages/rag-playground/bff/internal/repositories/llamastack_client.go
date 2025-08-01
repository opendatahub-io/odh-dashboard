package repositories

type LlamaStackClientInterface interface {
	ModelsInterface
	VectorDBInterface
	RAGToolInterface
}

type LlamaStackClient struct {
	UIModels
	UIVectorDB
	UIRAGTool
}

func NewLlamaStackClient() (LlamaStackClientInterface, error) {
	return &LlamaStackClient{}, nil
}
