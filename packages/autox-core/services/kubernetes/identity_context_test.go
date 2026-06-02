package kubernetes

import (
	"context"
	"testing"
)

func TestContextWithIdentityRoundTrip(t *testing.T) {
	identity := &RequestIdentity{
		UserID: "alice",
		Groups: []string{"devs", "admins"},
		Token:  "tok-123",
	}

	ctx := ContextWithIdentity(context.Background(), identity)

	got, err := IdentityFromContext(ctx)
	if err != nil {
		t.Fatal(err)
	}

	if got.UserID != "alice" {
		t.Errorf("UserID = %q, want %q", got.UserID, "alice")
	}
	if len(got.Groups) != 2 || got.Groups[0] != "devs" {
		t.Errorf("Groups = %v, want [devs admins]", got.Groups)
	}
	if got.Token != "tok-123" {
		t.Errorf("Token = %q, want %q", got.Token, "tok-123")
	}
}

func TestIdentityFromContextMissing(t *testing.T) {
	_, err := IdentityFromContext(context.Background())
	if err == nil {
		t.Error("expected error for missing identity")
	}
}

func TestIdentityFromContextNil(t *testing.T) {
	ctx := context.WithValue(context.Background(), identityKey{}, (*RequestIdentity)(nil))
	_, err := IdentityFromContext(ctx)
	if err == nil {
		t.Error("expected error for nil identity")
	}
}

func TestIdentityFromContextWrongType(t *testing.T) {
	ctx := context.WithValue(context.Background(), identityKey{}, "not-an-identity")
	_, err := IdentityFromContext(ctx)
	if err == nil {
		t.Error("expected error for wrong type")
	}
}
