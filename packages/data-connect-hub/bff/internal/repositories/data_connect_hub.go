package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/models"
)

// DataConnectHubHTTPClient is the transport required by the DCH read operations.
type DataConnectHubHTTPClient interface {
	GETWithContext(context.Context, string) ([]byte, error)
}

// DataConnectHubRepository exposes typed DCH API operations. Construct one per
// request with the caller's identity and tenant headers on its HTTP client.
type DataConnectHubRepository struct {
	client DataConnectHubHTTPClient
}

func NewDataConnectHubRepository(client DataConnectHubHTTPClient) *DataConnectHubRepository {
	return &DataConnectHubRepository{client: client}
}

const dataConnectionsPath = "/api/v1alpha1/data/connections"
const dataConnectionTypesPath = "/api/v1alpha1/data/connection-types"

func (r *DataConnectHubRepository) ListConnections(ctx context.Context) ([]models.Connection, error) {
	var response struct {
		Items []models.Connection `json:"items"`
	}
	if err := r.get(ctx, dataConnectionsPath, &response); err != nil {
		return nil, fmt.Errorf("failed to list data connections: %w", err)
	}
	if response.Items == nil {
		response.Items = []models.Connection{}
	}
	for i := range response.Items {
		if err := models.ValidateConnection(response.Items[i]); err != nil {
			return nil, fmt.Errorf("invalid data connection at index %d: %w", i, err)
		}
		normalizeConnection(&response.Items[i])
	}
	return response.Items, nil
}

func (r *DataConnectHubRepository) GetConnection(ctx context.Context, id string) (models.Connection, error) {
	var connection models.Connection
	if err := r.get(ctx, dataConnectionsPath+"/"+url.PathEscape(id), &connection); err != nil {
		return connection, fmt.Errorf("failed to get data connection: %w", err)
	}
	if err := models.ValidateConnection(connection); err != nil {
		return connection, err
	}
	if !strings.EqualFold(connection.Metadata.ID, id) {
		return connection, fmt.Errorf("data connection response ID does not match the requested ID")
	}
	normalizeConnection(&connection)
	return connection, nil
}

func (r *DataConnectHubRepository) ListConnectionTypes(ctx context.Context) ([]models.ConnectionType, error) {
	var response struct {
		Items []models.ConnectionType `json:"items"`
	}
	if err := r.get(ctx, dataConnectionTypesPath, &response); err != nil {
		return nil, fmt.Errorf("failed to list connection types: %w", err)
	}
	if response.Items == nil {
		response.Items = []models.ConnectionType{}
	}
	return response.Items, nil
}

func (r *DataConnectHubRepository) GetConnectionType(ctx context.Context, id string) (models.ConnectionType, error) {
	var connectionType models.ConnectionType
	parsedID, err := uuid.Parse(id)
	if err != nil || !strings.EqualFold(parsedID.String(), id) {
		return connectionType, fmt.Errorf("connection type ID must be a valid UUID")
	}
	if err := r.get(ctx, dataConnectionTypesPath+"/"+url.PathEscape(id), &connectionType); err != nil {
		return connectionType, fmt.Errorf("failed to get connection type: %w", err)
	}
	return connectionType, nil
}

func (r *DataConnectHubRepository) get(ctx context.Context, path string, result any) error {
	body, err := r.client.GETWithContext(ctx, path)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(body, result); err != nil {
		return fmt.Errorf("failed to decode DCH response: %w", err)
	}
	return nil
}

func normalizeConnection(connection *models.Connection) {
	if connection.Resource.Properties == nil {
		connection.Resource.Properties = map[string]string{}
	}
	// Only BFF resolution may populate this field.
	connection.Resource.DataConnectionType = nil
}
