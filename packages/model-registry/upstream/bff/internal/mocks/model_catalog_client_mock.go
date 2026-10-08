package mocks

import (
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"

	"github.com/kubeflow/hub/ui/bff/internal/models"

	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/stretchr/testify/mock"
)

type ModelCatalogClientMock struct {
	mock.Mock
}

func NewModelCatalogClientMock(logger *slog.Logger) (*ModelCatalogClientMock, error) {
	return &ModelCatalogClientMock{}, nil
}

func (m *ModelCatalogClientMock) GetAllCatalogModelsAcrossSources(client httpclient.HTTPClientInterface, pageValues url.Values) (*models.CatalogModelList, error) {
	allModels := GetCatalogModelMocks()
	var filteredModels []models.CatalogModel

	sourceId := pageValues.Get("source")
	sourceLabel := pageValues.Get("sourceLabel")
	query := pageValues.Get("q")

	if sourceId != "" {
		for _, model := range allModels {
			if model.SourceId != nil && *model.SourceId == sourceId {
				filteredModels = append(filteredModels, model)
			}
		}
	} else if sourceLabel != "" {
		allSources := GetCatalogSourceMocks()
		var matchingSourceIds []string

		if sourceLabel == "null" {
			for _, source := range allSources {
				if source.Enabled != nil && !*source.Enabled {
					continue
				}
				if len(source.Labels) == 0 {
					matchingSourceIds = append(matchingSourceIds, source.Id)
				}
			}
		} else {
			for _, source := range allSources {
				for _, label := range source.Labels {
					if label == sourceLabel {
						matchingSourceIds = append(matchingSourceIds, source.Id)
						break
					}
				}
			}
		}

		for _, model := range allModels {
			if model.SourceId != nil {
				for _, sid := range matchingSourceIds {
					if *model.SourceId == sid {
						filteredModels = append(filteredModels, model)
						break
					}
				}
			}
		}
	} else {
		filteredModels = allModels
	}

	if query != "" {
		var queryFilteredModels []models.CatalogModel
		queryLower := strings.ToLower(query)

		for _, model := range filteredModels {
			matchFound := false

			// Check name
			if strings.Contains(strings.ToLower(model.Name), queryLower) {
				matchFound = true
			}

			// Check description
			if !matchFound && model.Description != nil && strings.Contains(strings.ToLower(*model.Description), queryLower) {
				matchFound = true
			}

			// Check provider
			if !matchFound && model.Provider != nil && strings.Contains(strings.ToLower(*model.Provider), queryLower) {
				matchFound = true
			}

			if matchFound {
				queryFilteredModels = append(queryFilteredModels, model)
			}
		}

		filteredModels = queryFilteredModels
	}

	pagedModels, nextPageToken, pageSize, err := pageCatalogMockItems(filteredModels, pageValues, permissiveCatalogMockQuery)
	if err != nil {
		return nil, err
	}
	size := min(len(pagedModels), math.MaxInt32)

	catalogModelList := models.CatalogModelList{
		Items:         pagedModels,
		Size:          int32(size),
		PageSize:      pageSize,
		NextPageToken: nextPageToken,
	}

	return &catalogModelList, nil

}

func (m *ModelCatalogClientMock) GetCatalogSourceModel(client httpclient.HTTPClientInterface, sourceId string, modelName string) (*models.CatalogModel, error) {
	allModels := GetCatalogModelMocks()

	decodedModelName, err := url.QueryUnescape(modelName)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modelName: %w", err)
	}

	decodedModelName = strings.TrimPrefix(decodedModelName, "/")

	for _, model := range allModels {
		if model.SourceId != nil && *model.SourceId == sourceId && model.Name == decodedModelName {
			return &model, nil
		}
	}

	return nil, fmt.Errorf("catalog model not found for sourceId: %s, modelName: %s", sourceId, decodedModelName)
}

func (m *ModelCatalogClientMock) GetAllCatalogSources(client httpclient.HTTPClientInterface, pageValues url.Values) (*models.CatalogSourceList, error) {
	var allMockSources models.CatalogSourceList
	assetType := pageValues.Get("assetType")

	switch assetType {
	case "mcp_servers":
		allMockSources = GetMcpServerCatalogSourceListMock()
	case "agents":
		allMockSources = GetAgentCatalogSourceListMock()
	case "serving_runtimes":
		allMockSources = GetServingRuntimeCatalogSourceListMock()
	default:
		allMockSources = GetCatalogSourceListMock()
	}
	var filteredMockSources []models.CatalogSource

	name := pageValues.Get("name")

	if name != "" {
		nameFilterLower := strings.ToLower(name)
		for _, source := range allMockSources.Items {
			if strings.ToLower(source.Id) == nameFilterLower || strings.ToLower(source.Name) == nameFilterLower {
				filteredMockSources = append(filteredMockSources, source)
			}
		}
	} else {
		filteredMockSources = allMockSources.Items
	}
	catalogSourceList := models.CatalogSourceList{
		Items:         filteredMockSources,
		PageSize:      int32(10),
		NextPageToken: "",
		Size:          int32(len(filteredMockSources)),
	}

	return &catalogSourceList, nil
}

func (m *ModelCatalogClientMock) GetCatalogSourceModelArtifacts(client httpclient.HTTPClientInterface, sourceId string, modelName string, pageValues url.Values) (*models.CatalogModelArtifactList, error) {
	var allMockModelArtifacts models.CatalogModelArtifactList

	if sourceId == "sample-source" && (modelName == "repo1%2Fgranite-8b-code-instruct" || modelName == "repo1%2Fgranite-8b-code-instruct-quantized.w4a16") {
		performanceArtifacts := GetCatalogPerformanceMetricsArtifactListMock(4)
		accuracyArtifacts := GetCatalogAccuracyMetricsArtifactListMock()
		securityArtifacts := GetCatalogSecurityMetricsArtifactListMock()
		modelArtifacts := GetCatalogModelArtifactListMock()
		combinedItems := append(performanceArtifacts.Items, accuracyArtifacts.Items...)
		combinedItems = append(combinedItems, securityArtifacts.Items...)
		combinedItems = append(combinedItems, modelArtifacts.Items...)
		allMockModelArtifacts = models.CatalogModelArtifactList{
			Items:         combinedItems,
			Size:          int32(len(combinedItems)),
			PageSize:      performanceArtifacts.PageSize,
			NextPageToken: "",
		}
	} else if sourceId == "sample-source" && modelName == "repo1%2Fgranite-7b-instruct" {
		accuracyArtifacts := GetCatalogAccuracyMetricsArtifactListMock()
		securityArtifacts := GetCatalogSecurityMetricsArtifactListMock()
		modelArtifacts := GetCatalogModelArtifactListMock()
		combinedItems := append(accuracyArtifacts.Items, securityArtifacts.Items...)
		combinedItems = append(combinedItems, modelArtifacts.Items...)
		allMockModelArtifacts = models.CatalogModelArtifactList{
			Items:         combinedItems,
			Size:          int32(len(combinedItems)),
			PageSize:      accuracyArtifacts.PageSize,
			NextPageToken: "",
		}
	} else if sourceId == "sample-source" && (modelName == "repo1%2Fgranite-3b-code-base") {
		allMockModelArtifacts = GetCatalogModelArtifactListMock()
	} else {
		allMockModelArtifacts = GetCatalogModelArtifactListMock()
	}

	if filterQuery := pageValues.Get("filterQuery"); filterQuery != "" {
		allMockModelArtifacts = filterArtifactsByQuery(allMockModelArtifacts, filterQuery)
	}

	return &allMockModelArtifacts, nil
}

func filterArtifactsByQuery(list models.CatalogModelArtifactList, filterQuery string) models.CatalogModelArtifactList {
	metricsTypeFilter := extractMetricsTypeFilter(filterQuery)
	if metricsTypeFilter == "" {
		return list
	}

	filtered := []models.CatalogArtifact{}
	for _, item := range list.Items {
		if item.MetricsType != nil && *item.MetricsType == metricsTypeFilter {
			filtered = append(filtered, item)
		}
	}

	return models.CatalogModelArtifactList{
		Items:         filtered,
		Size:          int32(len(filtered)),
		PageSize:      list.PageSize,
		NextPageToken: "",
	}
}

func extractMetricsTypeFilter(filterQuery string) string {
	prefix := "metricsType.string_value="
	idx := strings.Index(filterQuery, prefix)
	if idx == -1 {
		return ""
	}
	value := filterQuery[idx+len(prefix):]
	value = strings.Trim(value, "\"")
	if sepIdx := strings.IndexAny(value, "&, "); sepIdx != -1 {
		value = value[:sepIdx]
	}
	return value
}

func (m *ModelCatalogClientMock) GetCatalogModelPerformanceArtifacts(client httpclient.HTTPClientInterface, sourceId string, modelName string, pageValues url.Values) (*models.CatalogModelArtifactList, error) {
	allMockModelPerformanceArtifacts := GetCatalogPerformanceMetricsArtifactListMock(4)
	return &allMockModelPerformanceArtifacts, nil

}

func (m *ModelCatalogClientMock) GetCatalogModelSecurityArtifacts(client httpclient.HTTPClientInterface, sourceId string, modelName string, pageValues url.Values) (*models.CatalogModelArtifactList, error) {
	allMockModelSecurityArtifacts := GetCatalogSecurityMetricsArtifactListMock()
	return &allMockModelSecurityArtifacts, nil
}

func (m *ModelCatalogClientMock) GetCatalogFilterOptions(client httpclient.HTTPClientInterface) (*models.FilterOptionsList, error) {
	filterOptions := GetFilterOptionsListMock()

	return &filterOptions, nil
}

func (m *ModelCatalogClientMock) GetCatalogLabels(client httpclient.HTTPClientInterface, pageValues url.Values) (*models.CatalogLabelList, error) {
	assetType := pageValues.Get("assetType")

	var labels models.CatalogLabelList
	switch assetType {
	case "mcp_servers":
		labels = GetMcpServerCatalogLabelListMock()
	case "agents":
		labels = GetAgentCatalogLabelListMock()
	case "serving_runtimes":
		labels = GetServingRuntimeCatalogLabelListMock()
	default:
		labels = GetCatalogLabelListMock()
	}
	return &labels, nil
}

func (m *ModelCatalogClientMock) CreateCatalogSourcePreview(client httpclient.HTTPClientInterface, sourcePreviewPayload models.CatalogSourcePreviewRequest, pageValues url.Values) (*models.CatalogSourcePreviewResult, error) {
	if sourcePreviewPayload.Type == "hf" {
		if org, ok := sourcePreviewPayload.Properties["allowedOrganization"]; ok {
			if orgStr, isStr := org.(string); isStr && orgStr == "qwen" {
				return nil, &httpclient.HTTPError{
					StatusCode: http.StatusUnauthorized,
					ErrorResponse: httpclient.ErrorResponse{
						Code:    "UNAUTHORIZED",
						Message: "Invalid credentials: the organization 'qwen' could not be validated with the provided access token",
					},
				}
			}
		}
	}

	filterStatus := pageValues.Get("filterStatus")
	if filterStatus == "" {
		filterStatus = "all"
	}

	pageSize := 20
	if ps := pageValues.Get("pageSize"); ps != "" {
		_, _ = fmt.Sscanf(ps, "%d", &pageSize)
	}

	nextPageToken := pageValues.Get("nextPageToken")
	assetType := pageValues.Get("assetType")

	var catalogSourcePreview models.CatalogSourcePreviewResult
	if assetType == "mcp_servers" {
		catalogSourcePreview = CreateMcpCatalogSourcePreviewMockWithFilter(filterStatus, pageSize, nextPageToken)
	} else if sourcePreviewPayload.Id == "hugging_face_public_source" {
		catalogSourcePreview = CreateCatalogSourcePreviewMockWithoutGatedWithFilter(filterStatus, pageSize, nextPageToken)
	} else {
		catalogSourcePreview = CreateCatalogSourcePreviewMockWithFilter(filterStatus, pageSize, nextPageToken)
	}

	return &catalogSourcePreview, nil
}

const mcpSourceLabelOther = "null"

func (m *ModelCatalogClientMock) GetAllMcpServers(client httpclient.HTTPClientInterface, pageValues url.Values) (*models.McpServerList, error) {
	full := GetMcpServerListMock()
	sourceLabel := pageValues.Get("sourceLabel")

	var items []models.McpServer
	if sourceLabel != "" {
		sources := GetMcpServerCatalogSourceMocks()
		var matchingSourceIDs []string
		if sourceLabel == mcpSourceLabelOther {
			for _, source := range sources {
				if source.Enabled != nil && !*source.Enabled {
					continue
				}
				if len(source.Labels) == 0 {
					matchingSourceIDs = append(matchingSourceIDs, source.Id)
				}
			}
		} else {
			for _, source := range sources {
				for _, label := range source.Labels {
					if label == sourceLabel {
						matchingSourceIDs = append(matchingSourceIDs, source.Id)
						break
					}
				}
			}
		}
		for _, s := range full.Items {
			if s.SourceID == nil {
				if sourceLabel == mcpSourceLabelOther {
					items = append(items, s)
				}
				continue
			}
			for _, sid := range matchingSourceIDs {
				if *s.SourceID == sid {
					items = append(items, s)
					break
				}
			}
		}
	} else {
		items = full.Items
	}

	pagedItems, nextPageToken, pageSize, err := pageCatalogMockItems(items, pageValues, permissiveCatalogMockQuery)
	if err != nil {
		return nil, err
	}
	size := min(len(pagedItems), math.MaxInt32)

	return &models.McpServerList{
		Items:         pagedItems,
		Size:          int32(size),
		PageSize:      pageSize,
		NextPageToken: nextPageToken,
	}, nil
}

func (m *ModelCatalogClientMock) GetMcpServersFilter(client httpclient.HTTPClientInterface) (*models.FilterOptionsList, error) {
	mcpFilterOptions := GetMcpFilterOptionsListMock()

	return &mcpFilterOptions, nil
}

func (m *ModelCatalogClientMock) GetMcpServer(client httpclient.HTTPClientInterface, serverId string, pageValues url.Values) (*models.McpServer, error) {
	allMocks := GetMcpServerMocks()
	for i := range allMocks {
		if allMocks[i].ID == serverId {
			return &allMocks[i], nil
		}
	}
	return nil, fmt.Errorf("server id doesn't exist: %s", serverId)
}

func (m *ModelCatalogClientMock) GetMcpServersTools(client httpclient.HTTPClientInterface, serverId string, _ url.Values) (*models.McpToolList, error) {
	mcpServerTools := GetMcpToolListMock()

	return &mcpServerTools, nil
}

func (m *ModelCatalogClientMock) GetMcpServerLogo(client httpclient.HTTPClientInterface, serverId string) (*httpclient.RawResponse, error) {
	// Simulate an upstream failure so tests can verify the BFF translates a raw
	// non-2xx response into a structured JSON error rather than forwarding the
	// catalog's plaintext body verbatim. GETRaw surfaces such responses without erroring.
	if serverId == "missing" {
		return &httpclient.RawResponse{
			StatusCode: http.StatusNotFound,
			Header:     http.Header{},
			Body:       []byte("404 page not found"),
		}, nil
	}

	svg := []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>`)
	// Mirror the catalog logo handler's protective headers for SVG so tests can
	// verify they survive the BFF passthrough.
	header := http.Header{}
	header.Set("Content-Type", "image/svg+xml")
	header.Set("Content-Disposition", "inline")
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")

	return &httpclient.RawResponse{
		StatusCode: http.StatusOK,
		Header:     header,
		Body:       svg,
	}, nil
}

// Agent mocks retain their permissive handling of unsupported filter expressions.
func filterAgentsByQuery(agents []models.Agent, query string) []models.Agent {
	result, _ := filterCatalogMockItems(agents, query, permissiveCatalogMockQuery, nil, agentMatchesFilter)
	return result
}

func agentMatchesFilter(agent models.Agent, key string, values []string) bool {
	switch key {
	case "framework":
		if agent.Framework == nil {
			return false
		}
		for _, v := range values {
			if strings.EqualFold(*agent.Framework, v) {
				return true
			}
		}
	case "communicationProtocol":
		if agent.CustomProperties != nil {
			if cp, ok := (*agent.CustomProperties)["communicationProtocol"]; ok && cp.MetadataStringValue != nil {
				for _, v := range values {
					if strings.EqualFold(cp.MetadataStringValue.StringValue, v) {
						return true
					}
				}
			}
		}
	case "testedModels":
		if agent.CustomProperties != nil {
			if tm, ok := (*agent.CustomProperties)["testedModels"]; ok && tm.MetadataStringValue != nil {
				for _, v := range values {
					if strings.EqualFold(tm.MetadataStringValue.StringValue, v) {
						return true
					}
				}
			}
		}
	}
	return false
}

func (m *ModelCatalogClientMock) GetAllAgents(client httpclient.HTTPClientInterface, pageValues url.Values) (*models.AgentList, error) {
	full := GetAgentListMock()
	sourceLabel := pageValues.Get("sourceLabel")

	var items []models.Agent
	if sourceLabel != "" {
		sources := GetAgentCatalogSourceMocks()
		var matchingSourceIDs []string
		if sourceLabel == "null" {
			for _, source := range sources {
				if source.Enabled != nil && !*source.Enabled {
					continue
				}
				if len(source.Labels) == 0 {
					matchingSourceIDs = append(matchingSourceIDs, source.Id)
				}
			}
		} else {
			for _, source := range sources {
				for _, label := range source.Labels {
					if label == sourceLabel {
						matchingSourceIDs = append(matchingSourceIDs, source.Id)
						break
					}
				}
			}
		}
		for _, agent := range full.Items {
			if agent.SourceID == nil {
				if sourceLabel == "null" {
					items = append(items, agent)
				}
				continue
			}
			for _, sid := range matchingSourceIDs {
				if *agent.SourceID == sid {
					items = append(items, agent)
					break
				}
			}
		}
	} else {
		items = full.Items
	}

	if filterQuery := pageValues.Get("filterQuery"); filterQuery != "" {
		items = filterAgentsByQuery(items, filterQuery)
	}

	query := pageValues.Get("q")
	if query != "" {
		queryLower := strings.ToLower(query)
		var filtered []models.Agent
		for _, agent := range items {
			if strings.Contains(strings.ToLower(agent.Name), queryLower) {
				filtered = append(filtered, agent)
			} else if agent.Description != nil && strings.Contains(strings.ToLower(*agent.Description), queryLower) {
				filtered = append(filtered, agent)
			}
		}
		items = filtered
	}

	pagedItems, nextPageToken, pageSize, err := pageCatalogMockItems(items, pageValues, permissiveCatalogMockQuery)
	if err != nil {
		return nil, err
	}
	size := min(len(pagedItems), math.MaxInt32)

	return &models.AgentList{
		Items:         pagedItems,
		Size:          int32(size),
		PageSize:      pageSize,
		NextPageToken: nextPageToken,
	}, nil
}

func (m *ModelCatalogClientMock) GetAgentsFilter(client httpclient.HTTPClientInterface) (*models.FilterOptionsList, error) {
	agentFilterOptions := GetAgentFilterOptionsListMock()
	return &agentFilterOptions, nil
}

func (m *ModelCatalogClientMock) GetAgent(client httpclient.HTTPClientInterface, agentId string) (*models.Agent, error) {
	allMocks := GetAgentMocks()
	for i := range allMocks {
		if allMocks[i].ID == agentId {
			return &allMocks[i], nil
		}
	}
	return nil, &httpclient.HTTPError{
		StatusCode: 404,
		ErrorResponse: httpclient.ErrorResponse{
			Code:    "404",
			Message: fmt.Sprintf("agent not found: %s", agentId),
		},
	}
}

func (m *ModelCatalogClientMock) GetAgentArtifacts(client httpclient.HTTPClientInterface, agentId string, _ url.Values) (*models.AgentArtifactList, error) {
	allMocks := GetAgentMocks()
	found := false
	for i := range allMocks {
		if allMocks[i].ID == agentId {
			found = true
			break
		}
	}
	if !found {
		return nil, &httpclient.HTTPError{
			StatusCode: 404,
			ErrorResponse: httpclient.ErrorResponse{
				Code:    "404",
				Message: fmt.Sprintf("agent not found: %s", agentId),
			},
		}
	}

	return GetAgentArtifactListMock(agentId), nil
}

func (m *ModelCatalogClientMock) GetAllServingRuntimes(_ httpclient.HTTPClientInterface, query url.Values) (*models.ServingRuntimeList, error) {
	items := []models.ServingRuntime{}
	q := strings.ToLower(query.Get("q"))
	var namePattern *regexp.Regexp
	if name := query.Get("name"); name != "" {
		expression := "(?i)^" + strings.ReplaceAll(strings.ReplaceAll(regexp.QuoteMeta(name), "%", ".*"), "_", ".") + "$"
		namePattern = regexp.MustCompile(expression)
	}
	var matchingSourceIDs map[string]bool
	if labels := query["sourceLabel"]; len(labels) > 0 {
		matchingSourceIDs = make(map[string]bool)
		for _, source := range GetServingRuntimeCatalogSourceListMock().Items {
			if len(source.Labels) == 0 {
				matchingSourceIDs[source.Id] = runtimeMockContains(labels, "null")
				continue
			}
			for _, label := range source.Labels {
				if runtimeMockContains(labels, label) {
					matchingSourceIDs[source.Id] = true
					break
				}
			}
		}
	}
	for _, runtime := range GetServingRuntimeMocks() {
		if !runtimeMockMatchesSearch(runtime, q) {
			continue
		}
		if namePattern != nil && (runtime.Name == nil || !namePattern.MatchString(*runtime.Name)) {
			continue
		}
		sourceID := ""
		if runtime.SourceID != nil {
			sourceID = *runtime.SourceID
		}
		if !runtimeMockContains(query["source"], sourceID) {
			continue
		}
		if matchingSourceIDs != nil && !matchingSourceIDs[sourceID] {
			continue
		}
		items = append(items, runtime)
	}
	var err error
	items, err = filterRuntimeMockItems(items, query.Get("filterQuery"), func(item models.ServingRuntime, key string) ([]string, bool) {
		switch key {
		case "hardware":
			return servingRuntimeMockHardware(item), true
		case "modelFormat":
			formats := make([]string, 0, len(item.SupportedModelFormats))
			for _, format := range item.SupportedModelFormats {
				formats = append(formats, format.Name)
			}
			return formats, true
		default:
			return nil, false
		}
	}, []string{"hardware", "modelFormat"})
	if err != nil {
		return nil, err
	}
	items, token, pageSize, err := pageRuntimeMockItems(items, query, func(item models.ServingRuntime, key string) string {
		return runtimeMockSortValue(key, item.ID, item.Name, item.CreateTimeSinceEpoch, item.LastUpdateTimeSinceEpoch)
	})
	if err != nil {
		return nil, err
	}
	return &models.ServingRuntimeList{Items: items, Size: int32(len(items)), PageSize: pageSize, NextPageToken: token}, nil
}

func (m *ModelCatalogClientMock) GetServingRuntimesFilter(_ httpclient.HTTPClientInterface) (*models.FilterOptionsList, error) {
	filters := GetServingRuntimeFilterOptionsListMock()
	return &filters, nil
}

func (m *ModelCatalogClientMock) GetServingRuntime(_ httpclient.HTTPClientInterface, id string) (*models.ServingRuntime, error) {
	for _, runtime := range GetServingRuntimeMocks() {
		if *runtime.ID == id {
			return &runtime, nil
		}
	}
	return nil, catalogMockError(http.StatusNotFound, "serving runtime not found: "+id)
}

func (m *ModelCatalogClientMock) GetServingRuntimeVersions(client httpclient.HTTPClientInterface, id string, query url.Values) (*models.ServingRuntimeVersionList, error) {
	if _, err := m.GetServingRuntime(client, id); err != nil {
		return nil, err
	}
	items, err := filterRuntimeMockItems(GetServingRuntimeVersionMocks(id), query.Get("filterQuery"), func(item models.ServingRuntimeVersion, key string) ([]string, bool) {
		switch key {
		case "version":
			return []string{item.Version}, true
		case "supportLevel":
			return []string{string(*item.SupportLevel)}, true
		default:
			return nil, false
		}
	}, []string{"version", "supportLevel"})
	if err != nil {
		return nil, err
	}
	items, token, pageSize, err := pageRuntimeMockItems(items, query, func(item models.ServingRuntimeVersion, key string) string {
		return runtimeMockSortValue(key, item.ID, item.Name, item.CreateTimeSinceEpoch, item.LastUpdateTimeSinceEpoch)
	})
	if err != nil {
		return nil, err
	}
	return &models.ServingRuntimeVersionList{Items: items, Size: int32(len(items)), PageSize: pageSize, NextPageToken: token}, nil
}

func runtimeMockMatchesSearch(runtime models.ServingRuntime, query string) bool {
	if query == "" {
		return true
	}
	fields := make([]string, 3)
	for i, field := range []*string{runtime.Name, runtime.DisplayName, runtime.Description} {
		if field != nil {
			fields[i] = *field
		}
	}
	return strings.Contains(strings.ToLower(strings.Join(fields, " ")), query)
}

func runtimeMockContains(values []string, value string) bool {
	if len(values) == 0 {
		return true
	}
	for _, entry := range values {
		for _, part := range strings.Split(entry, ",") {
			if strings.EqualFold(strings.TrimSpace(part), value) {
				return true
			}
		}
	}
	return false
}

// Runtime mocks reject malformed expressions and unsupported filter fields.
func filterRuntimeMockItems[T any](items []T, query string, field func(T, string) ([]string, bool), keys []string) ([]T, error) {
	return filterCatalogMockItems(items, query, strictCatalogMockQuery, keys, func(item T, key string, values []string) bool {
		actual, _ := field(item, key)
		for _, candidate := range actual {
			if runtimeMockContains(values, candidate) {
				return true
			}
		}
		return false
	})
}

// Runtime fixtures have no recommendation ranking, so RECOMMENDED preserves fixture order.
func runtimeMockSortValue(key string, id, name, created, updated *string) string {
	var value *string
	switch key {
	case "NAME":
		value = name
	case "ID":
		value = id
	case "CREATE_TIME":
		value = created
	case "LAST_UPDATE_TIME":
		value = updated
	case "RECOMMENDED":
		return ""
	}
	if key == "NAME" {
		if value == nil {
			return ""
		}
		return *value
	}
	var number int64
	if value != nil {
		number, _ = strconv.ParseInt(*value, 10, 64)
	}
	return fmt.Sprintf("%020d", number)
}

func pageRuntimeMockItems[T any](items []T, query url.Values, field func(T, string) string) ([]T, string, int32, error) {
	orderBy := strings.ToUpper(query.Get("orderBy"))
	if orderBy == "" {
		orderBy = "ID"
	}
	if !slices.Contains([]string{"ID", "NAME", "CREATE_TIME", "LAST_UPDATE_TIME", "RECOMMENDED"}, orderBy) {
		return nil, "", 0, catalogMockError(http.StatusBadRequest, "unsupported orderBy field")
	}
	order := strings.ToUpper(query.Get("sortOrder"))
	if order != "" && order != "ASC" && order != "DESC" {
		return nil, "", 0, catalogMockError(http.StatusBadRequest, "invalid sortOrder")
	}
	sort.SliceStable(items, func(i, j int) bool {
		left, right := field(items[i], orderBy), field(items[j], orderBy)
		if order == "DESC" {
			return left > right
		}
		return left < right
	})
	return pageCatalogMockItems(items, query, strictCatalogMockQuery)
}
