package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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

func weightPtr(f float64) *float64 { return &f }

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

// The server contract marks provider_id optional (nullable), so imports
// without it must not be blocked in the BFF; the server stays authoritative.
func TestImportCollectionHandlerBenchmarkWithoutProviderID(t *testing.T) {
	content := `{"name": "no-provider", "domains": ["d"], "benchmarks": [{"id": "a"}, {"id": "b", "provider_id": null}]}`
	result, response := postImport[ImportCollectionEnvelope](t, content, nil)

	assert.Equal(t, http.StatusCreated, response.StatusCode)
	require.Len(t, result.Data.Collection.Benchmarks, 2)
	assert.Equal(t, "a", result.Data.Collection.Benchmarks[0].ID)
	assert.Empty(t, result.Data.Collection.Benchmarks[0].ProviderID)
	assert.Empty(t, result.Data.Collection.Benchmarks[1].ProviderID)
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
			name:        "unknown YAML namespace tag",
			content:     "name: !!custom x\nbenchmarks: []\n",
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
			name:        "benchmark provider_id wrong type",
			content:     "name: x\ndomains: [software]\nbenchmarks: [{id: quality, provider_id: 42}]\n",
			wantMessage: "provider_id must be a string",
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
		{
			name:        "collection pass_criteria missing threshold",
			content:     `{"name": "x", "domains": ["d"], "pass_criteria": {}, "benchmarks": [{"id": "a", "provider_id": "b"}]}`,
			wantMessage: "collection: pass_criteria.threshold is required and must be a number",
		},
		{
			name:        "collection pass_criteria null threshold",
			content:     `{"name": "x", "domains": ["d"], "pass_criteria": {"threshold": null}, "benchmarks": [{"id": "a", "provider_id": "b"}]}`,
			wantMessage: "collection: pass_criteria.threshold is required and must be a number",
		},
		{
			name:        "collection pass_criteria string threshold",
			content:     `{"name": "x", "domains": ["d"], "pass_criteria": {"threshold": "0.5"}, "benchmarks": [{"id": "a", "provider_id": "b"}]}`,
			wantMessage: "collection: pass_criteria.threshold is required and must be a number",
		},
		{
			name:        "benchmark pass_criteria missing threshold",
			content:     `{"name": "x", "domains": ["d"], "benchmarks": [{"id": "a", "provider_id": "b", "pass_criteria": {}}]}`,
			wantMessage: `benchmark "a": pass_criteria.threshold is required and must be a number`,
		},
		{
			name:        "benchmark primary_score missing metric",
			content:     `{"name": "x", "domains": ["d"], "benchmarks": [{"id": "a", "provider_id": "b", "primary_score": {"lower_is_better": true}}]}`,
			wantMessage: `benchmark "a": primary_score.metric is required`,
		},
		{
			name:        "benchmark primary_score missing lower_is_better",
			content:     `{"name": "x", "domains": ["d"], "benchmarks": [{"id": "a", "provider_id": "b", "primary_score": {"metric": "acc"}}]}`,
			wantMessage: `benchmark "a": primary_score.lower_is_better is required`,
		},
		{
			name:        "benchmark primary_score string lower_is_better",
			content:     `{"name": "x", "domains": ["d"], "benchmarks": [{"id": "a", "provider_id": "b", "primary_score": {"metric": "acc", "lower_is_better": "false"}}]}`,
			wantMessage: `benchmark "a": primary_score.lower_is_better must be a boolean`,
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
	assert.Equal(t, "file exceeds the 1 MiB size limit", err.Error())
}

func TestImportCollectionHandlerBodyLimitBoundaries(t *testing.T) {
	base := "name: padded\ndomains: [d]\nbenchmarks: [{id: quality, provider_id: garak}]\ndescription: "
	atLimit := base + strings.Repeat("a", maxImportContentSize-len(base))
	require.Len(t, atLimit, maxImportContentSize)
	result, response := postImport[ImportCollectionEnvelope](t, atLimit, nil)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "padded", result.Data.Collection.Name)

	overLimit := base + strings.Repeat("a", maxImportContentSize-len(base)+1)
	errorResult, errorResponse := postImport[HTTPError](t, overLimit, nil)
	assert.Equal(t, http.StatusBadRequest, errorResponse.StatusCode)
	assert.Contains(t, errorResult.Error.Message, "file exceeds the 1 MiB size limit")
}

func TestImportCollectionHandlerMappingWidthLimit(t *testing.T) {
	var b strings.Builder
	b.WriteString("name: wide\nbenchmarks: []\nextra:\n")
	for i := range maxImportMappingEntries + 1 {
		fmt.Fprintf(&b, "  key%d: %d\n", i, i)
	}
	_, _, err := parseImportContent(b.String())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "entry limit")
}

func TestImportCollectionHandlerJSONMappingWidthLimit(t *testing.T) {
	var b strings.Builder
	b.WriteString(`{"name": "wide", "benchmarks": [], "extra": {`)
	for i := range maxImportMappingEntries + 1 {
		if i > 0 {
			b.WriteString(",")
		}
		fmt.Fprintf(&b, `"key%d": %d`, i, i)
	}
	b.WriteString("}}")
	_, _, err := parseImportContent(b.String())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "entry limit")
}

func TestImportCollectionHandlerPreservesLargeIntegers(t *testing.T) {
	content := `{"name": "big-int", "domains": ["d"], "custom": {"dataset_revision": 9007199254740993}, "benchmarks": [{"id": "quality", "provider_id": "garak"}]}`
	doc, _, err := parseImportContent(content)
	require.NoError(t, err)
	request, _, err := buildImportCreateRequest(doc)
	require.NoError(t, err)
	revision, ok := request.Custom["dataset_revision"].(json.Number)
	require.True(t, ok)
	assert.Equal(t, "9007199254740993", revision.String())
}

func TestImportCollectionHandlerFlowMappingFallback(t *testing.T) {
	// YAML flow mappings with unquoted keys lead with '{' but are not strict
	// JSON; they must be recovered through the bounded YAML parser.
	content := `{name: flow-suite, domains: [d], benchmarks: [{id: quality, provider_id: garak}]}`
	doc, _, err := parseImportContent(content)
	require.NoError(t, err)
	assert.Equal(t, "flow-suite", doc["name"])

	// Valid JSON still takes the strict path, preserving large integers.
	jsonDoc, _, err := parseImportContent(`{"name": "big-int", "custom": {"dataset_revision": 9007199254740993}}`)
	require.NoError(t, err)
	revision, ok := jsonDoc["custom"].(map[string]any)["dataset_revision"].(json.Number)
	require.True(t, ok)
	assert.Equal(t, "9007199254740993", revision.String())

	// Content that is neither valid JSON nor valid YAML reports the JSON error.
	_, _, err = parseImportContent(`{"name": "x",`)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid JSON")
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

func TestImportCollectionHandlerNestedAliasByteAmplification(t *testing.T) {
	// Nested anchors: each level aliases the previous level four times, so
	// the 16 KiB base string expands through three levels (4 + 16 + 64
	// aliases) past the 1 MiB expanded-byte budget while the document stays
	// ~16 KiB and under the 100-alias budget, so the byte budget is what
	// trips.
	var b strings.Builder
	b.WriteString("name: amp\nbase: &b \"" + strings.Repeat("x", 16<<10) + "\"\n")
	prev := "b"
	for i := range 3 {
		level := fmt.Sprintf("l%02d", i+1)
		fmt.Fprintf(&b, "%s: &%s [*%s, *%s, *%s, *%s]\n", level, level, prev, prev, prev, prev)
		prev = level
	}
	b.WriteString("custom: *l03\n")
	_, _, err := parseImportContent(b.String())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "alias expansion exceeds the 1 MiB size limit")
}

func TestImportCollectionHandlerAliasNodeBudget(t *testing.T) {
	// A wide anchored sequence referenced by the maximum number of aliases:
	// 100 × 301 expanded nodes exceeds the expanded-node budget on a document
	// of a few kilobytes.
	var b strings.Builder
	b.WriteString("name: nodes\nbase: &b [")
	for i := range 300 {
		if i > 0 {
			b.WriteString(",")
		}
		b.WriteString("0")
	}
	b.WriteString("]\n")
	for i := range maxYAMLAliases {
		fmt.Fprintf(&b, "k%03d: *b\n", i)
	}
	_, _, err := parseImportContent(b.String())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "alias expansion exceeds")
}

func TestImportCollectionHandlerSmallAliasesSupported(t *testing.T) {
	content := "name: aliased\nbenchmarks:\n  - &a {id: quality, provider_id: garak}\n  - *a\n  - *a\n"
	doc, _, err := parseImportContent(content)
	require.NoError(t, err)
	benchmarks, ok := doc["benchmarks"].([]any)
	require.True(t, ok)
	assert.Len(t, benchmarks, 3)
	assert.Equal(t, "quality", benchmarks[0].(map[string]any)["id"])
	assert.Equal(t, "quality", benchmarks[2].(map[string]any)["id"])
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

// An explicit weight of 0 must survive serialization to the EvalHub API
// (a value float64 with omitempty would drop it), while an omitted weight
// must stay absent so the server applies its own default.
func TestBuildImportCreateRequestPreservesExplicitZeroWeight(t *testing.T) {
	doc := map[string]any{
		"name":     "zero-weight",
		"category": "safety",
		"benchmarks": []any{
			map[string]any{"id": "quality", "provider_id": "garak", "weight": 0},
			map[string]any{"id": "toxicity", "provider_id": "garak"},
		},
	}
	request, _, err := buildImportCreateRequest(doc)
	require.NoError(t, err)
	require.NotNil(t, request.Benchmarks[0].Weight)
	assert.Equal(t, float64(0), *request.Benchmarks[0].Weight)
	assert.Nil(t, request.Benchmarks[1].Weight)

	encoded, err := json.Marshal(request)
	require.NoError(t, err)
	assert.JSONEq(t, `{
		"name": "zero-weight",
		"category": "safety",
		"benchmarks": [
			{"id": "quality", "provider_id": "garak", "weight": 0},
			{"id": "toxicity", "provider_id": "garak"}
		]
	}`, string(encoded))
}

// Explicit threshold 0 and lower_is_better false must pass validation and
// serialize as explicit values, while null scoring blocks stay omitted —
// omission is what the required-field checks reject, not the zero values.
func TestBuildImportCreateRequestPreservesExplicitScoringValues(t *testing.T) {
	doc := map[string]any{
		"name":          "scoring",
		"category":      "safety",
		"pass_criteria": map[string]any{"threshold": 0},
		"benchmarks": []any{
			map[string]any{
				"id":            "quality",
				"provider_id":   "garak",
				"primary_score": map[string]any{"metric": "acc", "lower_is_better": false},
				"pass_criteria": map[string]any{"threshold": 0},
			},
		},
	}
	request, _, err := buildImportCreateRequest(doc)
	require.NoError(t, err)
	require.NotNil(t, request.PassCriteria)
	assert.Equal(t, float64(0), request.PassCriteria.Threshold)
	require.NotNil(t, request.Benchmarks[0].PrimaryScore)
	assert.Equal(t, "acc", request.Benchmarks[0].PrimaryScore.Metric)
	assert.False(t, request.Benchmarks[0].PrimaryScore.LowerIsBetter)
	require.NotNil(t, request.Benchmarks[0].PassCriteria)
	assert.Equal(t, float64(0), request.Benchmarks[0].PassCriteria.Threshold)

	encoded, err := json.Marshal(request)
	require.NoError(t, err)
	assert.JSONEq(t, `{
		"name": "scoring",
		"category": "safety",
		"pass_criteria": {"threshold": 0},
		"benchmarks": [
			{
				"id": "quality",
				"provider_id": "garak",
				"primary_score": {"metric": "acc", "lower_is_better": false},
				"pass_criteria": {"threshold": 0}
			}
		]
	}`, string(encoded))

	nullBlocks := map[string]any{
		"name":          "scoring",
		"category":      "safety",
		"pass_criteria": nil,
		"benchmarks": []any{
			map[string]any{"id": "quality", "provider_id": "garak", "primary_score": nil},
		},
	}
	nullRequest, _, err := buildImportCreateRequest(nullBlocks)
	require.NoError(t, err)
	assert.Nil(t, nullRequest.PassCriteria)
	assert.Nil(t, nullRequest.Benchmarks[0].PrimaryScore)
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
			name:       "provider forbidden upstream maps to 404",
			err:        evalhub.NewEvalHubError("FORBIDDEN", "provider 'w' is forbidden", http.StatusForbidden),
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
			assert.Equal(t, http.StatusNotFound, ehErr.StatusCode)
			assert.Equal(t, evalhub.ErrCodeNotFound, ehErr.Code)
		})
	}
}
