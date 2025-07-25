package repositories

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

const insertRagToolPath = "/v1/tool-runtime/rag-tool/insert"

// RAGToolInterface defines the interface for RAG tool operations
type RAGToolInterface interface {
	InsertDocuments(client integrations.HTTPClientInterface, request llamastack.DocumentInsertRequest) error
}

type UIRAGTool struct {
}

func (r UIRAGTool) InsertDocuments(client integrations.HTTPClientInterface, request llamastack.DocumentInsertRequest) error {
	jsonBody, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("error marshaling request body: %w", err)
	}

	bodyReader := bytes.NewReader(jsonBody)
	response, err := client.POST(insertRagToolPath, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to insert documents: %w", err)
	}
	fmt.Printf("Document insertion response: %s\n", string(response))

	return nil
}
