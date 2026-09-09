package repositories

import (
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	openai "github.com/sashabaranov/go-openai"
	"github.com/stretchr/testify/assert"
)

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
				roles[i] = h.Role
			}
			if tt.wantHistoryRoles == nil {
				assert.Empty(t, roles)
			} else {
				assert.Equal(t, tt.wantHistoryRoles, roles)
			}
		})
	}
}

// ---------- buildMessages ----------

func TestBuildMessages(t *testing.T) {
	sources := []models.SourceChunk{
		{Text: "doc one", Score: 0.9},
		{Text: "doc two", Score: 0.8},
	}

	tests := []struct {
		name                string
		systemPrompt        string
		contextTemplate     string
		userTemplate        string
		history             []openai.ChatCompletionMessage
		question            string
		sources             []models.SourceChunk
		wantMsgCount        int
		wantFirstRole       string
		wantLastRole        string
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
			wantFirstRole:         openai.ChatMessageRoleUser,
			wantLastRole:          openai.ChatMessageRoleUser,
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
			wantFirstRole:         openai.ChatMessageRoleSystem,
			wantLastRole:          openai.ChatMessageRoleUser,
			wantLastContentSubstr: "hello",
		},
		{
			name:             "context template applied per chunk",
			systemPrompt:     "",
			contextTemplate:  "Doc {doc_number}: {document}",
			userTemplate:     "",
			history:          nil,
			question:         "summarise",
			sources:          sources,
			wantMsgCount:     1,
			wantLastRole:     openai.ChatMessageRoleUser,
			wantLastContentSubstr: "Doc 1: doc one",
		},
		{
			name:             "user template substitutes placeholders",
			systemPrompt:     "",
			contextTemplate:  "{document}",
			userTemplate:     "Docs:\n{reference_documents}\nQ: {question}",
			history:          nil,
			question:         "summarise",
			sources:          sources,
			wantMsgCount:     1,
			wantLastRole:     openai.ChatMessageRoleUser,
			wantLastContentSubstr: "Q: summarise",
		},
		{
			name:         "history inserted between system and user",
			systemPrompt: "sys",
			contextTemplate: "",
			userTemplate:    "",
			history: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleUser, Content: "prev q"},
				{Role: openai.ChatMessageRoleAssistant, Content: "prev a"},
			},
			question:              "new q",
			sources:               nil,
			wantMsgCount:          4,
			wantFirstRole:         openai.ChatMessageRoleSystem,
			wantLastRole:          openai.ChatMessageRoleUser,
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
				assert.Equal(t, tt.wantFirstRole, msgs[0].Role)
			}
			if tt.wantLastRole != "" {
				assert.Equal(t, tt.wantLastRole, msgs[len(msgs)-1].Role)
			}
			if tt.wantLastContentSubstr != "" {
				assert.Contains(t, msgs[len(msgs)-1].Content, tt.wantLastContentSubstr)
			}
		})
	}
}

// ---------- sanitizeCollection ----------

func TestSanitizeCollection(t *testing.T) {
	assert.Equal(t, "vs_abc_123", sanitizeCollection("vs-abc-123"))
	assert.Equal(t, "vs_abc_123", sanitizeCollection("vs.abc.123"))
	assert.Equal(t, "already_fine", sanitizeCollection("already_fine"))
	assert.Equal(t, "mix_of_both_things", sanitizeCollection("mix-of.both-things"))
}
