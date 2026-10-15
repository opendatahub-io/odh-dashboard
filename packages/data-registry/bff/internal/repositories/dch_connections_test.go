package repositories

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"strings"
	"testing"

	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient/bffmocks"
	"github.com/stretchr/testify/require"
)

const dchConnectionsFixture = `{"data":[{"metadata":{"id":"550e8400-e29b-41d4-a716-446655440000","tenant_id":"project-a"},"resource":{"name":"Production data","data_connection_type_id":"s3","credentials_ref":{"secret":"must-not-be-relayed"},"properties":{"password":"must-not-be-relayed"}}}]}`
const dchConnectionsWithTwoUnresolvedTypesFixture = `{"data":[{"metadata":{"id":"550e8400-e29b-41d4-a716-446655440000","tenant_id":"project-a"},"resource":{"name":"Production data","data_connection_type_id":"missing-one"}},{"metadata":{"id":"550e8400-e29b-41d4-a716-446655440002","tenant_id":"project-a"},"resource":{"name":"Archive data","data_connection_type_id":"missing-two"}}]}`
const dchTypesFixture = `{"data":[{"metadata":{"id":"s3"},"resource":{"name":"Friendly type name","provider":"s3"}}]}`

func TestGetDCHConnections(t *testing.T) {
	for _, tt := range []struct {
		name, connections, types             string
		connectionErr, typeErr               error
		wantCount                            int
		wantWarning, wantError, wantFallback bool
	}{
		{name: "resolves opaque type ID to provider and excludes credentials", connections: dchConnectionsFixture, types: dchTypesFixture, wantCount: 1},
		{name: "empty is successful", connections: `{"data":[]}`, types: dchTypesFixture},
		{name: "unresolved type warns", connections: dchConnectionsFixture, types: `{"data":[]}`, wantWarning: true},
		{name: "multiple unresolved types produce one warning", connections: dchConnectionsWithTwoUnresolvedTypesFixture, types: `{"data":[]}`, wantWarning: true},
		{name: "partial result", connections: strings.Replace(dchConnectionsFixture, `}]}`, `},{"metadata":{"id":"550e8400-e29b-41d4-a716-446655440002","tenant_id":"project-a"},"resource":{"name":"Production data","data_connection_type_id":"550e8400-e29b-41d4-a716-446655440003"}}]}`, 1), types: dchTypesFixture, wantCount: 1, wantWarning: true},
		{name: "absent envelope", connections: `{}`, types: dchTypesFixture, wantError: true},
		{name: "null list", connections: `{"data":null}`, types: dchTypesFixture, wantError: true},
		{name: "malformed JSON", connections: `{`, types: dchTypesFixture, wantError: true},
		{name: "rejects connection IDs that cannot be persisted by Data Registry", connections: strings.ReplaceAll(dchConnectionsFixture, "550e8400-e29b-41d4-a716-446655440000", "connection-1"), types: dchTypesFixture, wantError: true},
		{name: "accepts connection without tenant ID", connections: strings.Replace(dchConnectionsFixture, `,"tenant_id":"project-a"`, "", 1), types: dchTypesFixture, wantCount: 1},
		{name: "rejects empty tenant ID", connections: strings.Replace(dchConnectionsFixture, `"tenant_id":"project-a"`, `"tenant_id":""`, 1), types: dchTypesFixture, wantError: true},
		{name: "wrong project", connections: strings.ReplaceAll(dchConnectionsFixture, "project-a", "project-b"), types: dchTypesFixture, wantError: true},
		{name: "missing provider", connections: dchConnectionsFixture, types: strings.ReplaceAll(dchTypesFixture, `"provider":"s3"`, `"provider":""`), wantError: true},
		{name: "missing type envelope", connections: dchConnectionsFixture, types: `{}`, wantError: true},
		{name: "type request unavailable", connections: dchConnectionsFixture, typeErr: bffclient.NewServerUnavailableError(bffclient.BFFTargetDCH), wantError: true, wantFallback: true},
		{name: "connection request timeout", connectionErr: bffclient.NewTimeoutError(bffclient.BFFTargetDCH), types: dchTypesFixture, wantError: true, wantFallback: true},
		{name: "denial wins over transient failure", connectionErr: bffclient.NewConnectionError(bffclient.BFFTargetDCH, "offline"), typeErr: bffclient.NewForbiddenError(bffclient.BFFTargetDCH, "denied"), wantError: true},
		{name: "contract error wins over transient failure", connectionErr: bffclient.NewConnectionError(bffclient.BFFTargetDCH, "offline"), types: `{}`, wantError: true},
		{name: "request error forbids fallback", connectionErr: bffclient.NewBadRequestError(bffclient.BFFTargetDCH, "bad request"), types: dchTypesFixture, wantError: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			client := bffmocks.NewMockBFFClient(bffclient.BFFTargetDCH)
			client.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
				require.Equal(t, "GET", method)
				require.True(t, strings.HasSuffix(path, "?namespace=project-a"))
				payload, err := tt.connections, tt.connectionErr
				if strings.HasPrefix(path, "/connection-types?") {
					payload, err = tt.types, tt.typeErr
				}
				if err != nil {
					return err
				}
				if err := json.Unmarshal([]byte(payload), response); err != nil {
					return invalidDCHResponse()
				}
				return nil
			}
			result, metadata, err := NewConnectionRepository().GetDCHConnections(context.Background(), client, "project-a", slog.New(slog.NewTextHandler(io.Discard, nil)))
			if tt.wantError {
				require.Error(t, err)
				require.Equal(t, tt.wantFallback, DCHFallbackAllowed(err))
				require.Nil(t, result)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, result)
			require.Len(t, result, tt.wantCount)
			require.Equal(t, tt.wantWarning, metadata != nil)
			if tt.wantWarning {
				require.Len(t, metadata.Warnings, 1)
				require.Equal(t, "UNRESOLVED_CONNECTION_TYPE", metadata.Warnings[0].Code)
			}
			if len(result) > 0 {
				require.Equal(t, "dch", result[0].Type)
				require.Equal(t, "s3", *result[0].ConnectionType)
				require.Equal(t, "Production data", result[0].Name)
				body, err := json.Marshal(result)
				require.NoError(t, err)
				require.NotContains(t, string(body), "must-not-be-relayed")
			}
		})
	}
}
