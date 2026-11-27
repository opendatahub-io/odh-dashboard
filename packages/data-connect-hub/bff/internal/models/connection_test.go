package models

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateConnectionState(t *testing.T) {
	for _, tc := range []struct {
		state   string
		wantErr bool
	}{
		{state: "ready"},
		{state: "ingestion_not_ready"},
		{state: "not_ready"},
		{state: "pending", wantErr: true},
		{state: "READY", wantErr: true},
		{state: "", wantErr: true},
	} {
		t.Run(tc.state, func(t *testing.T) {
			var connection Connection
			connection.Metadata.ID = "550e8400-e29b-41d4-a716-446655440001"
			connection.Resource.Name = "warehouse"
			connection.Resource.DataConnectionTypeID = "550e8400-e29b-41d4-a716-446655440003"
			connection.Resource.Format = "tabular"
			connection.Status.State = tc.state
			err := ValidateConnection(connection)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
