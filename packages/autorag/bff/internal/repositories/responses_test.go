package repositories

import (
	"fmt"
	"testing"

	"github.com/openai/openai-go"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

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
