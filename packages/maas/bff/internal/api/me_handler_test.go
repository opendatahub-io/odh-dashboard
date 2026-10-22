package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
)

// The handler is intentionally hard-coded to the fixture in
// internal/integrations/maas/testdata/me-response.json for local development.
func TestGetMeHandlerReturnsHardcodedIdentity(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, constants.MePath, nil)

	GetMeHandler(&App{}, rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}

	var body MeEnvelope
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	me := body.Data
	if me == nil {
		t.Fatal("response data is nil")
	}
	if me.Sub != "00u7a1b2c3d4e5f6g7h8" {
		t.Errorf("sub = %q, want 00u7a1b2c3d4e5f6g7h8", me.Sub)
	}
	if me.Email != "alex@grid-tenant-1.com" {
		t.Errorf("email = %q, want alex@grid-tenant-1.com", me.Email)
	}
	if me.Name != "Alex Doe" {
		t.Errorf("name = %q, want Alex Doe", me.Name)
	}
	if len(me.Orgs) != 1 {
		t.Fatalf("orgs = %d, want 1", len(me.Orgs))
	}
	org := me.Orgs[0]
	if org.OrganizationID != "42c3e46f-2477-44d7-a85b-d3b43f6b31fa" {
		t.Errorf("organization_id = %q, want 42c3e46f-2477-44d7-a85b-d3b43f6b31fa", org.OrganizationID)
	}
	if org.OrganizationName != "coke" {
		t.Errorf("organization_name = %q, want coke", org.OrganizationName)
	}
	if org.Roles == nil {
		t.Error("roles is nil, want an empty array")
	}
	if len(org.Roles) != 0 {
		t.Errorf("roles = %v, want empty", org.Roles)
	}
}
