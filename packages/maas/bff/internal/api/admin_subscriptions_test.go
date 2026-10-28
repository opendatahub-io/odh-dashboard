package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

func TestAdminSubscriptionsRoleFiltering(t *testing.T) {
	for _, tc := range []struct {
		name  string
		roles []string
		want  int
	}{
		{"admin", []string{"admin"}, 1},
		{"multiple roles", []string{"user", "admin"}, 1},
		{"non-admin", []string{"user"}, 0},
		{"absent roles", nil, 0},
		{"empty roles", []string{}, 0},
		{"exact match required", []string{"Admin", "superadmin"}, 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/v1/subscriptions" {
					t.Errorf("unexpected upstream path: %s", r.URL.Path)
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode([]models.SubscriptionListItem{{SubscriptionIDHeader: "sub", Roles: tc.roles}})
			}))
			defer upstream.Close()
			logger := slog.New(slog.NewTextHandler(io.Discard, nil))
			repo, err := repositories.NewAPIKeysRepository(logger, upstream.URL)
			if err != nil {
				t.Fatal(err)
			}
			app := &App{logger: logger, repositories: &repositories.Repositories{APIKeys: repo}}
			rr := httptest.NewRecorder()
			ListAdminSubscriptionsHandler(app, rr, httptest.NewRequest(http.MethodGet, "/api/v1/admin-subscriptions", nil), nil)
			if rr.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", rr.Code, rr.Body.String())
			}
			var result Envelope[[]models.MaaSSubscription, None]
			if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if result.Data == nil || len(result.Data) != tc.want {
				t.Fatalf("data = %#v, want non-nil array of length %d", result.Data, tc.want)
			}
		})
	}
}
