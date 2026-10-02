package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/openai/openai-go"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/vectordb"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	v1 "k8s.io/api/core/v1"
)

func TestResponsesRepositoryResolveMaasClientUsesInjectedFactory(t *testing.T) {
	var gotBaseURL, gotAPIKey string
	wantClient := &maas.Client{}
	repo := NewResponsesRepositoryWithMaaSClientFactory(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: map[string][]byte{
				"MAAS_BASE_URL": []byte("https://maas.example"),
				"MAAS_API_KEY":  []byte("secret-key"),
			}}, nil
		},
	}, func(baseURL, apiKey string) (*maas.Client, error) {
		gotBaseURL, gotAPIKey = baseURL, apiKey
		return wantClient, nil
	})

	got, err := repo.resolveMaasClient(context.Background(), "test-ns", "maas")

	require.NoError(t, err)
	assert.Same(t, wantClient, got)
	assert.Equal(t, "https://maas.example", gotBaseURL)
	assert.Equal(t, "secret-key", gotAPIKey)
}

func TestResponsesRepositoryResolveMaasClientRequiresInjectedFactory(t *testing.T) {
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: map[string][]byte{
				"MAAS_BASE_URL": []byte("https://maas.example"),
			}}, nil
		},
	})

	_, err := repo.resolveMaasClient(context.Background(), "test-ns", "maas")

	require.EqualError(t, err, "MaaS client factory is not configured")
}

func TestResponsesRepositoryResolveMaasClientRejectsUnsafeURLsBeforeFactory(t *testing.T) {
	tests := []struct {
		name    string
		baseURL string
	}{
		{name: "localhost", baseURL: "https://localhost"},
		{name: "private IP", baseURL: "https://10.0.0.1"},
		{name: "userinfo", baseURL: "https://user:secret@maas.example?token=secret#fragment"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			factoryCalled := false
			repo := NewResponsesRepositoryWithMaaSClientFactory(nil, &mockK8sService{
				getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
					return &v1.Secret{Data: map[string][]byte{
						"MAAS_BASE_URL": []byte(tt.baseURL),
						"MAAS_API_KEY":  []byte("secret-key"),
					}}, nil
				},
			}, func(string, string) (*maas.Client, error) {
				factoryCalled = true
				return &maas.Client{}, nil
			})

			_, err := repo.resolveMaasClient(context.Background(), "test-ns", "maas")

			require.Error(t, err)
			assert.False(t, factoryCalled)
			assert.NotContains(t, err.Error(), "secret")
			assert.NotContains(t, err.Error(), "token")
		})
	}
}

func TestResponsesRepositoryResolveVectorDBRejectsUnsupportedSecret(t *testing.T) {
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: map[string][]byte{"NEO4J_URI": []byte("neo4j://example:7687")}}, nil
		},
	})

	_, err := repo.resolveVectorDB(context.Background(), "test-ns", "neo4j")

	require.Error(t, err)
	assert.ErrorIs(t, err, vectordb.ErrUnsupportedVectorDB)
}

type mockURLForwarder struct {
	forwardURL func(context.Context, string) (string, error)
}

func (m *mockURLForwarder) ForwardURL(ctx context.Context, rawURL string) (string, error) {
	return m.forwardURL(ctx, rawURL)
}

type mockVectorDB struct{}

func (m *mockVectorDB) Search(context.Context, string, []float32, string, int, float32, bool) ([]vectordb.SearchResult, error) {
	return nil, nil
}

func (m *mockVectorDB) Close() error { return nil }

func TestResponsesRepositoryResolveVectorDBForwardsMilvusURIWithoutMutatingSecret(t *testing.T) {
	originalURI := "http://milvus.milvus.svc.cluster.local:19530?token=secret"
	secretData := map[string][]byte{
		"MILVUS_URI":   []byte(originalURI),
		"MILVUS_TOKEN": []byte("user:password"),
	}
	var constructedData map[string][]byte
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: secretData}, nil
		},
	}, &mockURLForwarder{
		forwardURL: func(_ context.Context, rawURL string) (string, error) {
			assert.Equal(t, originalURI, rawURL)
			return "http://localhost:4321", nil
		},
	})
	repo.newVectorDB = func(_ context.Context, data map[string][]byte) (vectordb.VectorDB, error) {
		constructedData = data
		return &mockVectorDB{}, nil
	}

	db, err := repo.resolveVectorDB(context.Background(), "run-ns", "database")

	require.NoError(t, err)
	require.NotNil(t, db)
	assert.Equal(t, "http://localhost:4321", string(constructedData["MILVUS_URI"]))
	assert.Equal(t, originalURI, string(secretData["MILVUS_URI"]))
}

func TestResponsesRepositoryResolveVectorDBWithoutForwarderPreservesURI(t *testing.T) {
	originalURI := "http://milvus.milvus.svc.cluster.local:19530"
	secretData := map[string][]byte{"MILVUS_URI": []byte(originalURI)}
	var constructedData map[string][]byte
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: secretData}, nil
		},
	})
	repo.newVectorDB = func(_ context.Context, data map[string][]byte) (vectordb.VectorDB, error) {
		constructedData = data
		return &mockVectorDB{}, nil
	}

	_, err := repo.resolveVectorDB(context.Background(), "run-ns", "database")

	require.NoError(t, err)
	assert.Equal(t, originalURI, string(constructedData["MILVUS_URI"]))
	assert.Equal(t, originalURI, string(secretData["MILVUS_URI"]))
}

func TestResponsesRepositoryResolveVectorDBPassesRequestContextToMilvusFactory(t *testing.T) {
	secretData := map[string][]byte{"MILVUS_URI": []byte("http://milvus.milvus.svc.cluster.local:19530")}
	var factoryContext context.Context
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: secretData}, nil
		},
	})
	repo.newVectorDB = func(ctx context.Context, _ map[string][]byte) (vectordb.VectorDB, error) {
		factoryContext = ctx
		return &mockVectorDB{}, nil
	}

	requestCtx := context.Background()
	_, err := repo.resolveVectorDB(requestCtx, "run-ns", "database")

	require.NoError(t, err)
	require.NotNil(t, factoryContext)
	_, hasDeadline := factoryContext.Deadline()
	assert.False(t, hasDeadline, "the Milvus adapter must own the connection deadline")
}

func TestResponsesRepositoryResolveVectorDBReturnsForwardingErrorSafely(t *testing.T) {
	secretData := map[string][]byte{"MILVUS_URI": []byte("http://milvus.milvus.svc.cluster.local:19530?token=secret")}
	forwardErr := errors.New("no ready pods")
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: secretData}, nil
		},
	}, &mockURLForwarder{
		forwardURL: func(context.Context, string) (string, error) { return "", forwardErr },
	})

	_, err := repo.resolveVectorDB(context.Background(), "run-ns", "database")

	require.ErrorIs(t, err, forwardErr)
	assert.Contains(t, err.Error(), "failed to forward Milvus endpoint")
	assert.NotContains(t, err.Error(), "token=secret")
}

func TestClassifyForwardingErrorMarksInternalDeadlineAsDatabaseTimeout(t *testing.T) {
	requestCtx := context.Background()
	operationCtx, cancel := context.WithDeadline(context.Background(), time.Now().Add(-time.Second))
	defer cancel()

	err := classifyForwardingError(requestCtx, operationCtx, fmt.Errorf("port-forward startup: %w", context.DeadlineExceeded))

	require.ErrorIs(t, err, vectordb.ErrDatabaseTimeout)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	assert.NotContains(t, err.Error(), "https://user:password@milvus.example:19530")
}

func TestClassifyForwardingErrorPreservesRequestCancellation(t *testing.T) {
	requestCtx, requestCancel := context.WithCancel(context.Background())
	requestCancel()
	operationCtx, operationCancel := context.WithCancel(requestCtx)
	operationCancel()

	err := classifyForwardingError(requestCtx, operationCtx, fmt.Errorf("port-forward startup: %w", context.DeadlineExceeded))

	assert.NotErrorIs(t, err, vectordb.ErrDatabaseTimeout)
}

func TestResponsesRepositoryResolveVectorDBClassifiesForwardingDeadline(t *testing.T) {
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: map[string][]byte{
				"MILVUS_URI":   []byte("http://milvus.milvus.svc.cluster.local:19530?token=secret"),
				"MILVUS_TOKEN": []byte("user:password"),
			}}, nil
		},
	}, &mockURLForwarder{
		forwardURL: func(context.Context, string) (string, error) {
			return "", fmt.Errorf("port-forward startup: %w", context.DeadlineExceeded)
		},
	})

	_, err := repo.resolveVectorDB(context.Background(), "run-ns", "database")

	require.ErrorIs(t, err, vectordb.ErrDatabaseTimeout)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	assert.NotContains(t, err.Error(), "password")
}

func TestResponsesRepositoryValidateResponsesClassifiesForwardingDeadline(t *testing.T) {
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: map[string][]byte{
				"MILVUS_URI": []byte("http://milvus.milvus.svc.cluster.local:19530?token=secret"),
			}}, nil
		},
	}, &mockURLForwarder{
		forwardURL: func(context.Context, string) (string, error) {
			return "", fmt.Errorf("port-forward startup: %w", context.DeadlineExceeded)
		},
	})

	err := repo.ValidateResponses(context.Background(), ResponsesParams{
		Namespace: "run-ns", DBSecretName: "database",
	}, fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"collection"},
	}))

	require.ErrorIs(t, err, vectordb.ErrDatabaseTimeout)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	assert.NotContains(t, err.Error(), "secret")
}

func TestResponsesRepositoryValidateResponsesChecksDatabaseProviderForAllSearchModes(t *testing.T) {
	request := fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"collection"},
	})

	tests := []struct {
		name       string
		secretData map[string][]byte
		wantErr    error
	}{
		{
			name:       "unsupported provider",
			secretData: map[string][]byte{"NEO4J_URI": []byte("neo4j://example:7687")},
			wantErr:    vectordb.ErrUnsupportedVectorDB,
		},
		{
			name:       "supported provider",
			secretData: map[string][]byte{"PGVECTOR_HOST": []byte("db.example.com")},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewResponsesRepository(nil, &mockK8sService{
				getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
					return &v1.Secret{Data: tt.secretData}, nil
				},
			})

			err := repo.ValidateResponses(context.Background(), ResponsesParams{
				Namespace: "test-ns", DBSecretName: "database",
			}, request)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestResponsesRepositoryValidateResponsesBoundsMilvusForwarding(t *testing.T) {
	request := fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"collection"},
	})
	var observedDeadline time.Time
	repo := NewResponsesRepository(nil, &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: map[string][]byte{"MILVUS_URI": []byte("http://milvus.milvus.svc.cluster.local:19530")}}, nil
		},
	}, &mockURLForwarder{
		forwardURL: func(ctx context.Context, rawURL string) (string, error) {
			var ok bool
			observedDeadline, ok = ctx.Deadline()
			assert.True(t, ok)
			return rawURL, nil
		},
	})

	require.NoError(t, repo.ValidateResponses(context.Background(), ResponsesParams{
		Namespace: "test-ns", DBSecretName: "database",
	}, request))
	assert.LessOrEqual(t, time.Until(observedDeadline), vectordb.MilvusOperationTimeout)
}

// msgRole returns the role of a chat message param union, or "" if unset.
// Role constants marshal lazily (their in-memory zero value is ""), so this
// checks which variant is populated rather than relying on GetRole().
func msgRole(m openai.ChatCompletionMessageParamUnion) string {
	switch {
	case m.OfSystem != nil:
		return "system"
	case m.OfUser != nil:
		return "user"
	case m.OfAssistant != nil:
		return "assistant"
	case m.OfDeveloper != nil:
		return "developer"
	case m.OfTool != nil:
		return "tool"
	case m.OfFunction != nil:
		return "function"
	default:
		return ""
	}
}

// msgContent returns the plain-text content of a chat message param union, or "" if not a simple string.
func msgContent(m openai.ChatCompletionMessageParamUnion) string {
	if s, ok := m.GetContent().AsAny().(*string); ok && s != nil {
		return *s
	}
	return ""
}

// ---------- extractHistoryAndQuestion ----------

func TestExtractHistoryAndQuestion(t *testing.T) {
	msg := func(role, text string) models.InputMessage {
		return models.InputMessage{
			Type: "message",
			Role: role,
			Content: []models.InputContent{
				{Type: "input_text", Text: text},
			},
		}
	}

	tests := []struct {
		name             string
		input            []models.InputMessage
		wantSystemPrompt string
		wantQuestion     string
		wantHistoryRoles []string
	}{
		{
			name:             "single user message",
			input:            []models.InputMessage{msg("user", "hello")},
			wantSystemPrompt: "",
			wantQuestion:     "hello",
			wantHistoryRoles: nil,
		},
		{
			name: "system + user message",
			input: []models.InputMessage{
				msg("system", "you are helpful"),
				msg("user", "what is 2+2?"),
			},
			wantSystemPrompt: "you are helpful",
			wantQuestion:     "what is 2+2?",
			wantHistoryRoles: nil,
		},
		{
			name: "multi-turn conversation",
			input: []models.InputMessage{
				msg("user", "first question"),
				msg("assistant", "first answer"),
				msg("user", "second question"),
			},
			wantSystemPrompt: "",
			wantQuestion:     "second question",
			wantHistoryRoles: []string{"user", "assistant"},
		},
		{
			name: "system + multi-turn",
			input: []models.InputMessage{
				msg("system", "be concise"),
				msg("user", "q1"),
				msg("assistant", "a1"),
				msg("user", "q2"),
			},
			wantSystemPrompt: "be concise",
			wantQuestion:     "q2",
			wantHistoryRoles: []string{"user", "assistant"},
		},
		{
			name:             "empty input",
			input:            []models.InputMessage{},
			wantSystemPrompt: "",
			wantQuestion:     "",
			wantHistoryRoles: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			systemPrompt, history, question := extractHistoryAndQuestion(tt.input)

			assert.Equal(t, tt.wantSystemPrompt, systemPrompt)
			assert.Equal(t, tt.wantQuestion, question)

			roles := make([]string, len(history))
			for i, h := range history {
				roles[i] = msgRole(h)
			}
			if tt.wantHistoryRoles == nil {
				assert.Empty(t, roles)
			} else {
				assert.Equal(t, tt.wantHistoryRoles, roles)
			}
		})
	}
}

func TestExtractHistoryAndQuestion_NormalizedStringInput(t *testing.T) {
	var req models.ResponsesRequest
	require.NoError(t, json.Unmarshal([]byte(`{"input":"what is RAG?"}`), &req))

	systemPrompt, history, question := extractHistoryAndQuestion(req.Input)

	assert.Empty(t, systemPrompt)
	assert.Empty(t, history)
	assert.Equal(t, "what is RAG?", question)
}

// ---------- buildMessages ----------

func TestBuildMessages(t *testing.T) {
	sources := []models.SourceChunk{
		{Text: "doc one", Score: 0.9},
		{Text: "doc two", Score: 0.8},
	}

	tests := []struct {
		name                  string
		systemPrompt          string
		contextTemplate       string
		userTemplate          string
		history               []openai.ChatCompletionMessageParamUnion
		question              string
		sources               []models.SourceChunk
		wantMsgCount          int
		wantFirstRole         string
		wantLastRole          string
		wantLastContentSubstr string
	}{
		{
			name:                  "no templates, no system, no history",
			systemPrompt:          "",
			contextTemplate:       "",
			userTemplate:          "",
			history:               nil,
			question:              "what is this?",
			sources:               sources,
			wantMsgCount:          1,
			wantFirstRole:         "user",
			wantLastRole:          "user",
			wantLastContentSubstr: "what is this?",
		},
		{
			name:                  "system prompt prepended",
			systemPrompt:          "be helpful",
			contextTemplate:       "",
			userTemplate:          "",
			history:               nil,
			question:              "hello",
			sources:               nil,
			wantMsgCount:          2,
			wantFirstRole:         "system",
			wantLastRole:          "user",
			wantLastContentSubstr: "hello",
		},
		{
			name:                  "context template applied per chunk",
			systemPrompt:          "",
			contextTemplate:       "Doc {doc_number}: {document}",
			userTemplate:          "",
			history:               nil,
			question:              "summarise",
			sources:               sources,
			wantMsgCount:          1,
			wantLastRole:          "user",
			wantLastContentSubstr: "Doc 1: doc one",
		},
		{
			name:                  "user template substitutes placeholders",
			systemPrompt:          "",
			contextTemplate:       "{document}",
			userTemplate:          "Docs:\n{reference_documents}\nQ: {question}",
			history:               nil,
			question:              "summarise",
			sources:               sources,
			wantMsgCount:          1,
			wantLastRole:          "user",
			wantLastContentSubstr: "Q: summarise",
		},
		{
			name:            "history inserted between system and user",
			systemPrompt:    "sys",
			contextTemplate: "",
			userTemplate:    "",
			history: []openai.ChatCompletionMessageParamUnion{
				openai.UserMessage("prev q"),
				openai.AssistantMessage("prev a"),
			},
			question:              "new q",
			sources:               nil,
			wantMsgCount:          4,
			wantFirstRole:         "system",
			wantLastRole:          "user",
			wantLastContentSubstr: "new q",
		},
		{
			name:                  "no sources, no context template — question only",
			systemPrompt:          "",
			contextTemplate:       "",
			userTemplate:          "",
			history:               nil,
			question:              "standalone",
			sources:               nil,
			wantMsgCount:          1,
			wantLastContentSubstr: "standalone",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msgs := buildMessages(tt.systemPrompt, tt.contextTemplate, tt.userTemplate, tt.history, tt.question, tt.sources)

			assert.Len(t, msgs, tt.wantMsgCount)
			if tt.wantFirstRole != "" {
				assert.Equal(t, tt.wantFirstRole, msgRole(msgs[0]))
			}
			if tt.wantLastRole != "" {
				assert.Equal(t, tt.wantLastRole, msgRole(msgs[len(msgs)-1]))
			}
			if tt.wantLastContentSubstr != "" {
				assert.Contains(t, msgContent(msgs[len(msgs)-1]), tt.wantLastContentSubstr)
			}
		})
	}
}

// ---------- capHistory ----------

func TestCapHistory(t *testing.T) {
	buildHistory := func(turns int) []openai.ChatCompletionMessageParamUnion {
		var h []openai.ChatCompletionMessageParamUnion
		for i := 0; i < turns; i++ {
			h = append(h,
				openai.UserMessage(fmt.Sprintf("q%d", i)),
				openai.AssistantMessage(fmt.Sprintf("a%d", i)),
			)
		}
		return h
	}

	t.Run("under limit is unchanged", func(t *testing.T) {
		h := buildHistory(5)
		got := capHistory(h, 10)
		assert.Len(t, got, 10)
		assert.Equal(t, "q0", msgContent(got[0]))
	})

	t.Run("at limit is unchanged", func(t *testing.T) {
		h := buildHistory(10)
		got := capHistory(h, 10)
		assert.Len(t, got, 20)
		assert.Equal(t, "q0", msgContent(got[0]))
	})

	t.Run("over limit drops oldest turns", func(t *testing.T) {
		h := buildHistory(12)
		got := capHistory(h, 10)
		assert.Len(t, got, 20)
		assert.Equal(t, "q2", msgContent(got[0]))
		assert.Equal(t, "a2", msgContent(got[1]))
		assert.Equal(t, "q11", msgContent(got[len(got)-2]))
		assert.Equal(t, "a11", msgContent(got[len(got)-1]))

		userCount := 0
		for _, m := range got {
			if m.OfUser != nil {
				userCount++
			}
		}
		assert.Equal(t, 10, userCount)
	})
}

func TestExtractHistoryAndQuestion_CapsHistory(t *testing.T) {
	var input []models.InputMessage
	input = append(input, models.InputMessage{
		Type: "message", Role: "system",
		Content: []models.InputContent{{Type: "input_text", Text: "be helpful"}},
	})
	for i := 0; i < 12; i++ {
		input = append(input,
			models.InputMessage{
				Type: "message", Role: "user",
				Content: []models.InputContent{{Type: "input_text", Text: fmt.Sprintf("q%d", i)}},
			},
			models.InputMessage{
				Type: "message", Role: "assistant",
				Content: []models.InputContent{{Type: "input_text", Text: fmt.Sprintf("a%d", i)}},
			},
		)
	}
	// Final turn: the pending question, not yet answered.
	input = append(input, models.InputMessage{
		Type: "message", Role: "user",
		Content: []models.InputContent{{Type: "input_text", Text: "final question"}},
	})

	systemPrompt, history, question := extractHistoryAndQuestion(input)

	assert.Equal(t, "be helpful", systemPrompt, "system prompt must survive capping")
	assert.Equal(t, "final question", question)
	assert.Len(t, history, 20)

	userCount := 0
	for _, m := range history {
		if m.OfUser != nil {
			userCount++
		}
	}
	assert.Equal(t, 10, userCount)
	assert.Equal(t, "q2", msgContent(history[0]), "oldest turns should be dropped")
	assert.Equal(t, "a11", msgContent(history[len(history)-1]), "most recent turns should be kept")
}

// ---------- sanitizeCollection ----------

func TestSanitizeCollection(t *testing.T) {
	assert.Equal(t, "vs_abc_123", sanitizeCollection("vs-abc-123"))
	assert.Equal(t, "vs_abc_123", sanitizeCollection("vs.abc.123"))
	assert.Equal(t, "already_fine", sanitizeCollection("already_fine"))
	assert.Equal(t, "mix_of_both_things", sanitizeCollection("mix-of.both-things"))
}

// ---------- parseFileSearchTool ----------

func fileSearchRequest(tool models.FileSearchTool) *models.ResponsesRequest {
	return &models.ResponsesRequest{Tools: []models.FileSearchTool{tool}}
}

func floatPtr(value float64) *float64 {
	return &value
}

func TestParseFileSearchTool_Defaults(t *testing.T) {
	collection, topK, alpha, hybrid, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"vs_abc_123"},
	}))
	require.NoError(t, err)
	assert.Equal(t, "vs_abc_123", collection)
	assert.Equal(t, 5, topK)
	assert.InDelta(t, 0.5, alpha, 0.0001)
	assert.False(t, hybrid)
}

func TestParseFileSearchTool_NoFileSearchTool(t *testing.T) {
	_, _, _, _, err := parseFileSearchTool(&models.ResponsesRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no file_search tool with vector_store_ids found")
}

func TestParseFileSearchTool_RejectsInvalidVectorStoreID(t *testing.T) {
	tests := []string{"vs abc", "", "vs/abc"}
	for _, id := range tests {
		t.Run(id, func(t *testing.T) {
			_, _, _, _, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
				Type:           "file_search",
				VectorStoreIDs: []string{id},
			}))
			require.Error(t, err)
			if id != "" {
				assert.Contains(t, err.Error(), "invalid vector_store_ids value")
			} else {
				// An empty ID never enters the loop's collection assignment path,
				// so it surfaces as "no file_search tool" instead.
				assert.Contains(t, err.Error(), "no file_search tool with vector_store_ids found")
			}
		})
	}
}

func TestParseFileSearchTool_CanonicalizesVectorStoreID(t *testing.T) {
	collection, _, _, _, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"vs-abc.123"},
	}))
	require.NoError(t, err)
	assert.Equal(t, "vs_abc_123", collection)
}

func TestParseFileSearchTool_RejectsExcessiveMaxNumResults(t *testing.T) {
	_, _, _, _, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"vs_abc_123"},
		MaxNumResults:  maxTopK + 1,
	}))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "exceeds maximum")
}

func TestParseFileSearchTool_AllowsMaxNumResultsAtLimit(t *testing.T) {
	_, topK, _, _, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"vs_abc_123"},
		MaxNumResults:  maxTopK,
	}))
	require.NoError(t, err)
	assert.Equal(t, maxTopK, topK)
}

func TestParseFileSearchTool_RejectsAlphaAboveOne(t *testing.T) {
	_, _, _, _, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"vs_abc_123"},
		RankingOptions: models.RankingOptions{Ranker: "rrf", Alpha: floatPtr(1.5)},
	}))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must be between 0 and 1")
}

func TestParseFileSearchTool_HybridWithValidAlpha(t *testing.T) {
	collection, _, alpha, hybrid, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"vs_abc_123"},
		RankingOptions: models.RankingOptions{Ranker: "rrf", Alpha: floatPtr(0.7)},
	}))
	require.NoError(t, err)
	assert.Equal(t, "vs_abc_123", collection)
	assert.True(t, hybrid)
	assert.InDelta(t, 0.7, alpha, 0.0001)
}

func TestParseFileSearchTool_PreservesZeroAlpha(t *testing.T) {
	_, _, alpha, hybrid, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"vs_abc_123"},
		RankingOptions: models.RankingOptions{Ranker: "rrf", Alpha: floatPtr(0)},
	}))
	require.NoError(t, err)
	assert.True(t, hybrid)
	assert.Zero(t, alpha)
}

func TestParseFileSearchTool_RejectsUnsupportedRanker(t *testing.T) {
	_, _, _, _, err := parseFileSearchTool(fileSearchRequest(models.FileSearchTool{
		Type:           "file_search",
		VectorStoreIDs: []string{"vs_abc_123"},
		RankingOptions: models.RankingOptions{Ranker: "linear"},
	}))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported")
}
