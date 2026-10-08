package repositories

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/data-registry/bff/internal/models"
)

// Decode only fields needed for display. Credentials and arbitrary properties are never relayed.
type dchConnection struct {
	Metadata struct {
		ID       string `json:"id"`
		TenantID string `json:"tenant_id"`
	} `json:"metadata"`
	Resource struct {
		Name   string `json:"name"`
		TypeID string `json:"data_connection_type_id"`
	} `json:"resource"`
}

type dchConnectionType struct {
	Metadata struct {
		ID string `json:"id"`
	} `json:"metadata"`
	Resource struct {
		Provider string `json:"provider"`
	} `json:"resource"`
}

// DCHFallbackAllowed deliberately uses error codes, not HTTP status alone: a locally
// detected malformed response has status 502 but must not trigger Secret fallback.
func DCHFallbackAllowed(err error) bool {
	var upstream *bffclient.BFFClientError
	if !errors.As(err, &upstream) {
		return false
	}
	switch upstream.Code {
	case bffclient.ErrCodeConnectionFailed, bffclient.ErrCodeTimeout, bffclient.ErrCodeServerUnavailable:
		return true
	default:
		return false
	}
}

func dchErrorPriority(err error) int {
	if err == nil {
		return 0
	}
	var upstream *bffclient.BFFClientError
	if errors.As(err, &upstream) && (upstream.StatusCode == http.StatusUnauthorized || upstream.StatusCode == http.StatusForbidden) {
		return 3
	}
	if DCHFallbackAllowed(err) {
		return 1
	}
	return 2
}

func invalidDCHResponse() error {
	return bffclient.NewInvalidResponseError(bffclient.BFFTargetDCH, "invalid DCH connection lookup response")
}

// DCH connection IDs are stored as UUID references by the Data Registry API.
func validDCHConnectionID(id string) bool {
	return len(id) == 36 && uuid.Validate(id) == nil
}

// DCH connector type IDs are opaque strings (for example, "s3" or "postgresql").
func validDCHTypeID(id string) bool {
	return strings.TrimSpace(id) != ""
}

func (r *ConnectionRepository) GetDCHConnections(ctx context.Context, client bffclient.BFFClientInterface, namespace string, logger *slog.Logger) ([]models.ConnectionModel, *models.ConnectionsMetadata, error) {
	var connections struct {
		Data []dchConnection `json:"data"`
	}
	var types struct {
		Data []dchConnectionType `json:"data"`
	}
	var connectionErr, typeErr error
	query := "?" + url.Values{"namespace": {namespace}}.Encode()
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		connectionErr = client.Call(ctx, http.MethodGet, "/connections"+query, nil, &connections)
		if connectionErr != nil {
			return
		}
		if connections.Data == nil {
			connectionErr = invalidDCHResponse()
			return
		}
		seen := make(map[string]bool, len(connections.Data))
		for _, connection := range connections.Data {
			if !validDCHConnectionID(connection.Metadata.ID) || seen[connection.Metadata.ID] ||
				!validDCHTypeID(connection.Resource.TypeID) || strings.TrimSpace(connection.Resource.Name) == "" ||
				connection.Metadata.TenantID != namespace {
				connectionErr = invalidDCHResponse()
				return
			}
			seen[connection.Metadata.ID] = true
		}
	}()
	go func() {
		defer wg.Done()
		typeErr = client.Call(ctx, http.MethodGet, "/connection-types"+query, nil, &types)
		if typeErr != nil {
			return
		}
		if types.Data == nil {
			typeErr = invalidDCHResponse()
			return
		}
		seen := make(map[string]bool, len(types.Data))
		for _, connectionType := range types.Data {
			if !validDCHTypeID(connectionType.Metadata.ID) || seen[connectionType.Metadata.ID] || strings.TrimSpace(connectionType.Resource.Provider) == "" {
				typeErr = invalidDCHResponse()
				return
			}
			seen[connectionType.Metadata.ID] = true
		}
	}()
	wg.Wait()
	// Inspect both results: a transient error must never mask a denial or contract error.
	if dchErrorPriority(typeErr) > dchErrorPriority(connectionErr) {
		connectionErr = typeErr
	}
	if connectionErr != nil {
		return nil, nil, connectionErr
	}
	providers := make(map[string]string, len(types.Data))
	for _, connectionType := range types.Data {
		providers[connectionType.Metadata.ID] = connectionType.Resource.Provider
	}
	result := make([]models.ConnectionModel, 0, len(connections.Data))
	var metadata *models.ConnectionsMetadata
	for _, connection := range connections.Data {
		provider, ok := providers[connection.Resource.TypeID]
		if !ok {
			logger.Warn("DCH connection type could not be resolved", "namespace", namespace, "connection_id", connection.Metadata.ID, "type_id", connection.Resource.TypeID)
			metadata = &models.ConnectionsMetadata{Warnings: []models.ConnectionWarning{{
				Code: "UNRESOLVED_CONNECTION_TYPE", Message: "Some connections could not be loaded because their connector types are unavailable.",
			}}}
			continue
		}
		result = append(result, models.ConnectionModel{Type: "dch", ID: connection.Metadata.ID, Name: connection.Resource.Name, ConnectionType: &provider})
	}
	return result, metadata, nil
}
