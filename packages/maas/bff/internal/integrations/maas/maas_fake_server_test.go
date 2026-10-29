package maas

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func TestFakeAPIKeySearchAppliesCallerScopeBeforeRequestFilters(t *testing.T) {
	tests := []struct {
		name               string
		scope              string
		user               string
		adminSubscriptions string
		request            models.APIKeySearchRequest
		wantUsers          map[string]struct{}
		wantSubscriptions  map[string]struct{}
		wantCount          int
	}{
		{
			name:      "non-admin cannot search another user's keys",
			scope:     "user",
			user:      "alice",
			request:   models.APIKeySearchRequest{Filters: &models.APIKeySearchFilters{Username: "bob"}},
			wantCount: 0,
		},
		{
			name:      "non-admin sees their own keys",
			scope:     "user",
			user:      "alice",
			request:   models.APIKeySearchRequest{},
			wantCount: -1,
			wantUsers: map[string]struct{}{
				"alice": {},
			},
		},
		{
			name:               "admin sees users in administered subscriptions only",
			scope:              "admin",
			adminSubscriptions: "premium-team-sub",
			request:            models.APIKeySearchRequest{},
			wantCount:          -1,
			wantUsers: map[string]struct{}{
				"alice": {}, "bob": {}, "carol": {}, "dave": {}, "ci-bot": {}, "frank": {},
			},
			wantSubscriptions: map[string]struct{}{"premium-team-sub": {}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("MAAS_MOCK_API_KEYS_SCOPE", tt.scope)
			t.Setenv("MAAS_MOCK_API_KEYS_USER", tt.user)
			t.Setenv("MAAS_MOCK_API_KEYS_ADMIN_SUBSCRIPTIONS", tt.adminSubscriptions)

			server := CreateMaasFakeServer()
			defer server.Close()

			body, err := json.Marshal(tt.request)
			if err != nil {
				t.Fatal(err)
			}
			response, err := http.Post(server.URL+"/v1/api-keys/search", "application/json", bytes.NewReader(body))
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()

			var actual models.APIKeyListResponse
			if err := json.NewDecoder(response.Body).Decode(&actual); err != nil {
				t.Fatal(err)
			}

			if tt.wantCount >= 0 && len(actual.Data) != tt.wantCount {
				t.Errorf("got %d keys, want %d", len(actual.Data), tt.wantCount)
			}

			seenUsers := make(map[string]struct{})
			seenSubscriptions := make(map[string]struct{})
			for _, key := range actual.Data {
				seenUsers[key.Username] = struct{}{}
				seenSubscriptions[key.SubscriptionName] = struct{}{}
				if len(tt.wantUsers) > 0 {
					if _, expected := tt.wantUsers[key.Username]; !expected {
						t.Errorf("unexpected user %q", key.Username)
					}
				}
				if len(tt.wantSubscriptions) > 0 {
					if _, expected := tt.wantSubscriptions[key.SubscriptionName]; !expected {
						t.Errorf("unexpected subscription %q", key.SubscriptionName)
					}
				}
			}
			for user := range tt.wantUsers {
				if _, present := seenUsers[user]; !present {
					t.Errorf("expected keys for user %q", user)
				}
			}
			for subscription := range tt.wantSubscriptions {
				if _, present := seenSubscriptions[subscription]; !present {
					t.Errorf("expected keys in subscription %q", subscription)
				}
			}
		})
	}
}
