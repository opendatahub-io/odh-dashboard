package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	ehmocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub/ehmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const validImportYAML = `
name: release-gate-safety
description: Release-gate collection combining reasoning and red-teaming benchmarks
domains:
  - knowledge_and_reasoning
tags:
  - release-gate
benchmarks:
  - id: arc_easy
    provider_id: lm_evaluation_harness
    weight: 0.6
    primary_score:
      metric: acc_norm
      lower_is_better: false
    pass_criteria:
      threshold: 0.25
  - id: owasp_llm_top10
    provider_id: garak
    weight: 0.4
`

const validImportJSON = `{
  "name": "quick-reasoning-check",
  "domains": ["knowledge_and_reasoning"],
  "benchmarks": [{"id": "arc_easy", "provider_id": "lm_evaluation_harness"}]
}`

func importRequest(content string) map[string]any {
	return map[string]any{"content": content}
}

func postImport[T any](t *testing.T, content string, ehClient evalhub.EvalHubClientInterface) (T, *http.Response) {
	t.Helper()
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	if ehClient == nil {
		ehClient = ehmocks.NewMockEvalHubClient()
	}
	result, response, err := setupApiTestWithEvalHub[T](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collection-imports?namespace=test-ns",
		importRequest(content), nil, identity, ehClient,
	)
	require.NoError(t, err)
	return result, response
}

func TestImportCollectionHandlerYAML(t *testing.T) {
	result, response := postImport[ImportCollectionEnvelope](t, validImportYAML, nil)

	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "release-gate-safety", result.Data.Collection.Name)
	assert.Equal(t, "created-collection", result.Data.Collection.Resource.ID)
	require.Len(t, result.Data.Collection.Benchmarks, 2)
	assert.Equal(t, "arc_easy", result.Data.Collection.Benchmarks[0].ID)
	assert.Equal(t, "lm_evaluation_harness", result.Data.Collection.Benchmarks[0].ProviderID)
	// The category/domains workaround maps the first domain onto category.
	assert.Equal(t, "knowledge_and_reasoning", result.Data.Collection.Category)
}

func TestImportCollectionHandlerJSON(t *testing.T) {
	result, response := postImport[ImportCollectionEnvelope](t, validImportJSON, nil)

	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "quick-reasoning-check", result.Data.Collection.Name)
	require.Len(t, result.Data.Collection.Benchmarks, 1)
	assert.Equal(t, "arc_easy", result.Data.Collection.Benchmarks[0].ID)
}

func TestImportCollectionHandlerServerManagedFieldsWarned(t *testing.T) {
	content := `
id: knowledge-reasoning-v1
curation_order: 10
name: Knowledge and Reasoning v1
description: Shipped collection definition with server-managed fields.
domains:
  - knowledge_and_reasoning
benchmarks:
  - id: gpqa:diamond
    provider_id: lighteval
    url: https://example.com/benchmark
`
	result, response := postImport[ImportCollectionEnvelope](t, content, nil)

	assert.Equal(t, http.StatusCreated, response.StatusCode)
	warnings := strings.Join(result.Data.Warnings, "\n")
	assert.Contains(t, warnings, `field "id" is managed by the server and will be ignored`)
	assert.Contains(t, warnings, `field "curation_order" is managed by the server and will be ignored`)
	assert.Contains(t, warnings, `benchmark "gpqa:diamond": field "url" is managed by the server and will be ignored`)
}

func TestImportCollectionHandlerWarnings(t *testing.T) {
	content := `
name: warn-me
domains:
  - trustworthiness
unknown_field: oops
benchmarks:
  - id: quality
    provider_id: garak
    mystery: 1
`
	result, response := postImport[ImportCollectionEnvelope](t, content, nil)

	assert.Equal(t, http.StatusCreated, response.StatusCode)
	warnings := strings.Join(result.Data.Warnings, "\n")
	assert.Contains(t, warnings, `unrecognized field "unknown_field" will be ignored`)
	assert.Contains(t, warnings, `benchmark "quality": unrecognized field "mystery" will be ignored`)
	assert.Contains(t, warnings, "no description provided")
}

func TestImportCollectionHandlerMultiDocument(t *testing.T) {
	content := validImportYAML + "\n---\n" + validImportYAML
	result, response := postImport[ImportCollectionEnvelope](t, content, nil)

	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "release-gate-safety", result.Data.Collection.Name)
	require.Len(t, result.Data.Warnings, 1)
	assert.Contains(t, result.Data.Warnings[0], "file contains 2 collection definitions; only the first was imported")
}

func TestImportCollectionHandlerRejections(t *testing.T) {
	tests := []struct {
		name        string
		content     string
		wantMessage string
	}{
		{
			name:        "empty content",
			content:     "   \n\t ",
			wantMessage: "no collection definition found in file",
		},
		{
			name:        "comment-only YAML",
			content:     "# just a comment\n# another comment\n",
			wantMessage: "no collection definition found in file",
		},
		{
			name:        "null document",
			content:     "null",
			wantMessage: "no collection definition found in file",
		},
		{
			name:        "non-object document",
			content:     "- one\n- two\n",
			wantMessage: "collection definition must be an object",
		},
		{
			name: "YAML syntax error",
			content: `
name: broken
  bad_indent: true
`,
			wantMessage: "invalid YAML",
		},
		{
			name:        "custom YAML tag",
			content:     "name: !evil {}\nbenchmarks: []\n",
			wantMessage: "custom tags are not allowed",
		},
		{
			name:        "missing name",
			content:     "domains: [software]\nbenchmarks: [{id: quality, provider_id: garak}]\n",
			wantMessage: "name is required",
		},
		{
			name:        "missing benchmarks",
			content:     "name: no-benchmarks\ndomains: [software]\n",
			wantMessage: "at least one benchmark is required",
		},
		{
			name:        "benchmark missing provider_id",
			content:     "name: x\ndomains: [software]\nbenchmarks: [{id: quality}]\n",
			wantMessage: "provider_id is required",
		},
		{
			name:        "neither category nor domains",
			content:     "name: x\nbenchmarks: [{id: quality, provider_id: garak}]\n",
			wantMessage: "either category or a non-empty domains list is required",
		},
		{
			name:        "invalid JSON",
			content:     `{"name": "x",`,
			wantMessage: "invalid JSON",
		},
		{
			name:        "wrong field type",
			content:     `{"name": 42, "domains": ["x"], "benchmarks": [{"id": "a", "provider_id": "b"}]}`,
			wantMessage: "name is required and must be a non-empty string",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := &verifyingEHClient{MockEvalHubClient: ehmocks.NewMockEvalHubClient()}
			result, response := postImport[HTTPError](t, tt.content, recorder)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
			assert.Contains(t, result.Error.Message, tt.wantMessage)
			// No create call may reach the server on rejection.
			assert.Equal(t, 0, recorder.createCalls)
		})
	}
}

func TestImportCollectionHandlerOversized(t *testing.T) {
	content := strings.Repeat("# padding\n", (maxImportContentSize/10)+10)
	_, _, err := parseImportContent(content)
	require.Error(t, err)
	assert.Equal(t, "File exceeds the 1 MiB size limit", err.Error())
}

func TestImportCollectionHandlerDepthLimit(t *testing.T) {
	deep := &strings.Builder{}
	deep.WriteString("name: deep\nbenchmarks: []\nextra:\n")
	indent := ""
	for range maxYAMLDepth + 2 {
		indent += "  "
		deep.WriteString(indent + "nested:\n")
	}
	_, _, err := parseImportContent(deep.String())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "nesting exceeds")
}

func TestImportCollectionHandlerJSONDepthLimit(t *testing.T) {
	content := `{"name": "deep", "benchmarks": [], "custom": ` + strings.Repeat(`{"a": `, maxYAMLDepth+5) + "1" + strings.Repeat("}", maxYAMLDepth+5) + "}"
	_, _, err := parseImportContent(content)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "nesting exceeds")
}

func TestImportCollectionHandlerAliasLimit(t *testing.T) {
	anchor := "  - &a {id: quality, provider_id: garak}\n"
	var b strings.Builder
	b.WriteString("name: aliases\nbenchmarks:\n")
	b.WriteString(anchor)
	for range maxYAMLAliases + 1 {
		b.WriteString("  - *a\n")
	}
	_, _, err := parseImportContent(b.String())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "aliases")
}

// verifyingEHClient records the create request the handler submits.
type verifyingEHClient struct {
	*ehmocks.MockEvalHubClient
	createRequest evalhub.CreateCollectionRequest
	createCalls   int
}

func TestImportCollectionHandlerCleansPayload(t *testing.T) {
	content := `
id: shipped-collection
curation_order: 5
name: Cleaned
description: desc
domains: [software]
benchmarks:
  - id: quality
    provider_id: garak
    url: https://ignored.example.com
`
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	recorder := &verifyingEHClient{MockEvalHubClient: ehmocks.NewMockEvalHubClient()}
	_, response, err := setupApiTestWithEvalHub[ImportCollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collection-imports?namespace=test-ns",
		importRequest(content), nil, identity, recorder,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "Cleaned", recorder.createRequest.Name)
	assert.Empty(t, recorder.createRequest.Benchmarks[0].URL)
}

func (m *verifyingEHClient) CreateCollection(_ context.Context, _ string, req evalhub.CreateCollectionRequest) (*evalhub.Collection, error) {
	m.createCalls++
	m.createRequest = req
	return m.MockEvalHubClient.CreateCollection(context.Background(), "", req)
}

// providerRefusingClient simulates the server rejecting an inaccessible
// provider reference.
type providerRefusingClient struct {
	*ehmocks.MockEvalHubClient
}

func (m *providerRefusingClient) CreateCollection(_ context.Context, _ string, _ evalhub.CreateCollectionRequest) (*evalhub.Collection, error) {
	return nil, evalhub.NewEvalHubError(evalhub.ErrCodeNotFound, "provider 'private-provider' not found in tenant", http.StatusNotFound)
}

func TestImportCollectionHandlerUniformReferenceError(t *testing.T) {
	refusing := &providerRefusingClient{MockEvalHubClient: ehmocks.NewMockEvalHubClient()}
	result, response := postImport[HTTPError](t, validImportYAML, refusing)

	assert.Equal(t, http.StatusNotFound, response.StatusCode)
	assert.Equal(t, "a referenced provider or benchmark is not found or not accessible", result.Error.Message)
}

func TestImportCollectionHandlerServerError(t *testing.T) {
	_, response := postImport[HTTPError](t, validImportYAML, &erroringEHClient{})
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}

// denyingImportK8sFactory returns a client whose create-permission SSAR is denied.
type denyingImportK8sFactory struct{}

func (f *denyingImportK8sFactory) GetClient(_ context.Context) (kubernetes.KubernetesClientInterface, error) {
	return &denyingImportK8sClient{}, nil
}

func (f *denyingImportK8sFactory) ExtractRequestIdentity(h http.Header) (*kubernetes.RequestIdentity, error) {
	userID := h.Get("kubeflow-userid")
	if userID == "" {
		userID = "test-user@example.com"
	}
	return &kubernetes.RequestIdentity{UserID: userID, Token: "test-token"}, nil
}

func (f *denyingImportK8sFactory) ValidateRequestIdentity(_ *kubernetes.RequestIdentity) error {
	return nil
}

type denyingImportK8sClient struct {
	testK8sClient
}

func (c *denyingImportK8sClient) CanCreateEvalHubResources(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (bool, error) {
	return false, nil
}

func TestImportAccessHandlerAllowed(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	result, response, err := setupApiTestWithEvalHub[ImportAccessEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collection-imports/access?namespace=test-ns",
		nil, nil, identity, nil,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.True(t, result.Data.Allowed)
}

func TestImportAccessHandlerDenied(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	result, response, err := setupApiTestWithEvalHub[ImportAccessEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collection-imports/access?namespace=test-ns",
		nil, &denyingImportK8sFactory{}, identity, nil,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.False(t, result.Data.Allowed)
}

func TestBuildImportCreateRequestWarningOrder(t *testing.T) {
	doc := map[string]any{
		"name":     "ordered",
		"zebra":    1,
		"alpha":    2,
		"category": "safety",
		"benchmarks": []any{
			map[string]any{"id": "quality", "provider_id": "garak"},
		},
	}
	request, warnings, err := buildImportCreateRequest(doc)
	require.NoError(t, err)
	assert.Equal(t, "ordered", request.Name)
	require.Len(t, warnings, 3)
	assert.Equal(t, `unrecognized field "alpha" will be ignored`, warnings[0])
	assert.Equal(t, `unrecognized field "zebra" will be ignored`, warnings[1])
	assert.Equal(t, "no description provided; consider adding one so the collection is easy to identify", warnings[2])
}

func TestTranslateImportError(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantRepeat bool
		want       string
	}{
		{
			name:       "provider not found",
			err:        evalhub.NewEvalHubError("NOT_FOUND", "provider 'x' not found", http.StatusNotFound),
			wantRepeat: true,
			want:       "a referenced provider or benchmark is not found or not accessible",
		},
		{
			name:       "benchmark forbidden",
			err:        evalhub.NewEvalHubError("INVALID_REQUEST", "benchmark 'y' access denied", http.StatusBadRequest),
			wantRepeat: true,
			want:       "a referenced provider or benchmark is not found or not accessible",
		},
		{
			name:       "unrelated not-found",
			err:        evalhub.NewEvalHubError("NOT_FOUND", "collection 'z' not found", http.StatusNotFound),
			wantRepeat: false,
		},
		{
			name:       "provider but not a status error",
			err:        evalhub.NewEvalHubError("INVALID_REQUEST", "provider_id must be non-empty", http.StatusBadRequest),
			wantRepeat: false,
		},
		{
			name:       "plain error untouched",
			err:        errors.New("boom"),
			wantRepeat: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			translated := translateImportError(tt.err)
			if !tt.wantRepeat {
				assert.Equal(t, tt.err.Error(), translated.Error())
				return
			}
			var ehErr *evalhub.EvalHubError
			require.ErrorAs(t, translated, &ehErr)
			assert.Equal(t, tt.want, ehErr.Message)
		})
	}
}
