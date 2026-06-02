package kubernetes

import (
	"net/http"
	"testing"
)

func TestKubeflowHeaderExtractor(t *testing.T) {
	extractor := &KubeflowHeaderExtractor{
		UserIDHeader:     "kubeflow-userid",
		UserGroupsHeader: "kubeflow-groups",
	}

	t.Run("valid with groups", func(t *testing.T) {
		headers := http.Header{}
		headers.Set("kubeflow-userid", "alice")
		headers.Set("kubeflow-groups", "devs,admins, ops")

		identity, err := extractor.Extract(headers)
		if err != nil {
			t.Fatal(err)
		}
		if identity.UserID != "alice" {
			t.Errorf("UserID = %q, want %q", identity.UserID, "alice")
		}
		if len(identity.Groups) != 3 {
			t.Fatalf("expected 3 groups, got %d: %v", len(identity.Groups), identity.Groups)
		}
		if identity.Groups[0] != "devs" || identity.Groups[1] != "admins" || identity.Groups[2] != "ops" {
			t.Errorf("Groups = %v, want [devs admins ops]", identity.Groups)
		}
	})

	t.Run("valid without groups", func(t *testing.T) {
		headers := http.Header{}
		headers.Set("kubeflow-userid", "bob")

		identity, err := extractor.Extract(headers)
		if err != nil {
			t.Fatal(err)
		}
		if identity.UserID != "bob" {
			t.Errorf("UserID = %q, want %q", identity.UserID, "bob")
		}
		if len(identity.Groups) != 0 {
			t.Errorf("expected empty groups, got %v", identity.Groups)
		}
	})

	t.Run("missing user ID header", func(t *testing.T) {
		headers := http.Header{}
		_, err := extractor.Extract(headers)
		if err == nil {
			t.Error("expected error for missing user ID header")
		}
	})
}

func TestTokenHeaderExtractor(t *testing.T) {
	t.Run("with Bearer prefix", func(t *testing.T) {
		extractor := &TokenHeaderExtractor{
			Header: "Authorization",
			Prefix: "Bearer ",
		}
		headers := http.Header{}
		headers.Set("Authorization", "Bearer my-token-123")

		identity, err := extractor.Extract(headers)
		if err != nil {
			t.Fatal(err)
		}
		if identity.Token != "my-token-123" {
			t.Errorf("Token = %q, want %q", identity.Token, "my-token-123")
		}
	})

	t.Run("without prefix", func(t *testing.T) {
		extractor := &TokenHeaderExtractor{
			Header: "X-Auth-Token",
		}
		headers := http.Header{}
		headers.Set("X-Auth-Token", "raw-token")

		identity, err := extractor.Extract(headers)
		if err != nil {
			t.Fatal(err)
		}
		if identity.Token != "raw-token" {
			t.Errorf("Token = %q, want %q", identity.Token, "raw-token")
		}
	})

	t.Run("missing header", func(t *testing.T) {
		extractor := &TokenHeaderExtractor{Header: "Authorization", Prefix: "Bearer "}
		_, err := extractor.Extract(http.Header{})
		if err == nil {
			t.Error("expected error for missing header")
		}
	})

	t.Run("wrong prefix", func(t *testing.T) {
		extractor := &TokenHeaderExtractor{Header: "Authorization", Prefix: "Bearer "}
		headers := http.Header{}
		headers.Set("Authorization", "Basic dXNlcjpwYXNz")

		_, err := extractor.Extract(headers)
		if err == nil {
			t.Error("expected error for wrong prefix")
		}
	})

	t.Run("trims whitespace from token", func(t *testing.T) {
		extractor := &TokenHeaderExtractor{Header: "Authorization", Prefix: "Bearer "}
		headers := http.Header{}
		headers.Set("Authorization", "Bearer  my-token  ")

		identity, err := extractor.Extract(headers)
		if err != nil {
			t.Fatal(err)
		}
		if identity.Token != "my-token" {
			t.Errorf("Token = %q, want %q", identity.Token, "my-token")
		}
	})
}
