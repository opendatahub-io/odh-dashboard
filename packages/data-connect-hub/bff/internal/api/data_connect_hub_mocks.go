package api

import (
	"context"
	"fmt"
	"math/rand/v2"
	"strings"

	httpclient "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/httpclient"
)

type mockDataConnectHubRepository struct{ namespace string }

func (m mockDataConnectHubRepository) ListConnections(context.Context) ([]Connection, error) {
	return mockConnections(m.namespace), nil
}
func (m mockDataConnectHubRepository) GetConnection(_ context.Context, id string) (Connection, error) {
	connection, found := mockConnection(m.namespace, id)
	if !found {
		return Connection{}, mockDCHNotFound()
	}
	return connection, nil
}
func (m mockDataConnectHubRepository) ListConnectionTypes(context.Context) ([]ConnectionType, error) {
	return mockConnectionTypes(m.namespace), nil
}
func (m mockDataConnectHubRepository) GetConnectionType(_ context.Context, id string) (ConnectionType, error) {
	connectionType, found := mockConnectionType(m.namespace, strings.ToLower(id))
	if !found {
		return ConnectionType{}, mockDCHNotFound()
	}
	return connectionType, nil
}
func mockDCHNotFound() error {
	return &httpclient.HTTPError{StatusCode: 404, ErrorResponse: httpclient.ErrorResponse{Code: "404", Message: "the requested resource could not be found"}}
}

func mockConnection(namespace, connectionID string) (Connection, bool) {
	for _, connection := range mockConnections(namespace) {
		if connection.Metadata.ID == connectionID {
			return connection, true
		}
	}
	return Connection{}, false
}

func mockConnections(namespace string) []Connection {
	connections := make([]Connection, 2)
	connections[0].Metadata.ID = "550e8400-e29b-41d4-a716-446655440001"
	connections[0].Metadata.TenantID = namespace
	connections[0].Metadata.CreatedAt = "2026-09-07T16:00:00Z"
	connections[0].Metadata.UpdatedAt = "2026-09-08T16:00:00Z"
	connections[0].Resource.Name = "warehouse"
	connections[0].Resource.DataConnectionTypeID = "550e8400-e29b-41d4-a716-446655440003"
	connections[0].Resource.Format = "tabular"
	connections[0].Resource.CredentialsRef.Secret = "warehouse"
	connections[0].Resource.Properties = map[string]string{}
	connections[0].Status.State = "ready"
	connections[0].Status.UpdatedAt = "2026-09-08T16:00:00Z"
	connections[1].Metadata.ID = "550e8400-e29b-41d4-a716-446655440002"
	connections[1].Metadata.TenantID = namespace
	connections[1].Metadata.CreatedAt = "2026-09-07T16:00:00Z"
	connections[1].Metadata.UpdatedAt = "2026-09-08T16:00:00Z"
	connections[1].Resource.Name = "object-store"
	connections[1].Resource.DataConnectionTypeID = "550e8400-e29b-41d4-a716-446655440004"
	connections[1].Resource.Format = "binary"
	connections[1].Resource.CredentialsRef.Secret = "object-store"
	connections[1].Resource.Properties = map[string]string{}
	connections[1].Status.State = "not_ready"
	connections[1].Status.UpdatedAt = "2026-09-08T16:00:00Z"
	return connections
}

func mockConnectionType(namespace, connectionTypeID string) (ConnectionType, bool) {
	for _, connectionType := range mockConnectionTypes(namespace) {
		if connectionType.Metadata.ID == connectionTypeID {
			return connectionType, true
		}
	}
	return ConnectionType{}, false
}

func mockConnectionTypes(namespace string) []ConnectionType {
	rng := rand.New(rand.NewPCG(1, 2))

	var baseMockConnectionType ConnectionType
	baseMockConnectionType.Metadata.ID = "00000000-0000-0000-0000-000000000000"
	baseMockConnectionType.Metadata.TenantID = namespace
	baseMockConnectionType.Metadata.CreatedAt = "2026-01-01T00:00:00Z"
	baseMockConnectionType.Metadata.UpdatedAt = "2026-01-01T00:00:00Z"
	baseMockConnectionType.Resource.Provider = "base_provider"
	baseMockConnectionType.Resource.Description = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor."
	baseMockConnectionType.Resource.CredentialsFields = []ConnectionTypeCredentialField{}
	baseMockConnectionType.Status.FlightReady = true
	baseMockConnectionType.Status.FlightURL = "https://dch-default-dataconnectservice-flight.redhat-ods-applications.svc:8443"
	baseMockConnectionType.Status.UpdatedAt = "2026-01-01T00:00:00Z"

	postgresql := baseMockConnectionType
	postgresql.Metadata.ID = "550e8400-e29b-41d4-a716-446655440003"
	postgresql.Resource.Name = "PostgreSQL"
	postgresql.Resource.Provider = "postgres"
	postgresql.Resource.Tags = []string{"domain: database", "engine: postgresql", "access: sql"}
	postgresql.Resource.CredentialsFields = []ConnectionTypeCredentialField{
		{
			Name:        "url",
			Label:       "Connection URL",
			Description: "The URL used to connect to the PostgreSQL database.",
			Required:    true,
			Type:        "string",
			EnumValues: []struct {
				Value string `json:"value"`
				Label string `json:"label"`
			}{
				{Value: "us-east-1", Label: "US East"},
			},
			DefaultValue: "postgresql://localhost:5432/database",
		},
	}

	s3 := baseMockConnectionType
	s3.Metadata.ID = "550e8400-e29b-41d4-a716-446655440004"
	s3.Resource.Name = "S3"
	s3.Resource.Provider = "s3"
	s3.Resource.Tags = make([]string, 30)
	for i := range s3.Resource.Tags {
		s3.Resource.Tags[i] = fmt.Sprintf("tag: value-%d", i+1)
	}
	s3.Resource.CredentialsFields = []ConnectionTypeCredentialField{
		{
			Name:        "region",
			Label:       "Region",
			Description: "The AWS region containing the S3 bucket.",
			Required:    true,
			Type:        "string",
			EnumValues: []struct {
				Value string `json:"value"`
				Label string `json:"label"`
			}{
				{Value: "us-east-1", Label: "US East"},
			},
			DefaultValue: "us-east-1",
		},
	}

	names := []string{"Analytics", "Warehouse", "Data Lake", "Reporting", "Archive", "Metrics"}
	types := []ConnectionType{postgresql, s3}
	for i := range 30 {
		dummyConnectionType := baseMockConnectionType
		dummyConnectionType.Metadata.ID = fmt.Sprintf("00000000-0000-0000-0000-%012d", i+1)
		dummyConnectionType.Resource.Name = fmt.Sprintf("%s %d", names[rng.IntN(len(names))], i+1)
		dummyConnectionType.Resource.Description = dummyConnectionType.Resource.Description[:rng.IntN(len(dummyConnectionType.Resource.Description)+1)]
		dummyConnectionType.Status.FlightReady = rng.IntN(2) == 0
		types = append(types, addMockTags(dummyConnectionType, rng))
	}
	return types
}

func addMockTags(connectionType ConnectionType, rng *rand.Rand) ConnectionType {
	tags := []string{
		"database", "storage", "sql", "read-only", "dev", "production",
		"staging", "testing", "sandbox", "analytics", "reporting", "warehouse",
		"data-lake", "lakehouse", "archive", "backup", "streaming", "batch",
		"real-time", "structured", "semi-structured", "unstructured", "postgresql",
		"mysql", "mongodb", "redis", "s3", "azure-blob", "google-cloud-storage",
		"parquet", "csv", "json", "avro", "iceberg", "delta-lake",
		"read-write", "encrypted", "internal", "public", "restricted", "confidential",
		"finance", "marketing", "engineering", "research", "customer-data",
		"sales", "operations", "machine-learning", "training", "inference",
		"embeddings", "vector-search", "high-availability", "low-latency",
		"high-throughput", "daily-refresh", "hourly-refresh", "us-east", "us-west",
		"europe", "asia-pacific",
	}
	for _, j := range rng.Perm(len(tags))[:1+rng.IntN(len(tags))] {
		connectionType.Resource.Tags = append(connectionType.Resource.Tags, tags[j])
	}
	return connectionType
}
