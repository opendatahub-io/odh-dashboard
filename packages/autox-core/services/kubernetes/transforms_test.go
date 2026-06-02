package kubernetes

import (
	"errors"
	"strings"
	"testing"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

func TestBuildKeysMap(t *testing.T) {
	t.Run("Data only", func(t *testing.T) {
		secret := v1.Secret{
			Data: map[string][]byte{
				"key1": []byte("val1"),
				"key2": []byte("val2"),
			},
		}
		result := buildKeysMap(secret)
		if result["key1"] != "val1" || result["key2"] != "val2" {
			t.Errorf("unexpected result: %v", result)
		}
	})

	t.Run("StringData only", func(t *testing.T) {
		secret := v1.Secret{
			StringData: map[string]string{
				"key1": "val1",
			},
		}
		result := buildKeysMap(secret)
		if result["key1"] != "val1" {
			t.Errorf("unexpected result: %v", result)
		}
	})

	t.Run("Data takes precedence over StringData for same key", func(t *testing.T) {
		secret := v1.Secret{
			Data: map[string][]byte{
				"key1": []byte("from-data"),
			},
			StringData: map[string]string{
				"key1": "from-stringdata",
			},
		}
		result := buildKeysMap(secret)
		if result["key1"] != "from-data" {
			t.Errorf("expected Data to win, got %q", result["key1"])
		}
	})

	t.Run("empty secret", func(t *testing.T) {
		result := buildKeysMap(v1.Secret{})
		if len(result) != 0 {
			t.Errorf("expected empty map, got %v", result)
		}
	})
}

func TestExtractServiceAccountName(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"system:serviceaccount:my-ns:my-sa", "my-sa"},
		{"system:serviceaccount:kube-system:default", "default"},
		{"alice", "alice"},
		{"system:serviceaccount:", "system:serviceaccount:"},
		{"system:serviceaccount:ns-only", "system:serviceaccount:ns-only"},
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			if got := extractServiceAccountName(tt.input); got != tt.want {
				t.Errorf("extractServiceAccountName(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestMapNamespacesToInfos(t *testing.T) {
	t.Run("with display name annotation", func(t *testing.T) {
		namespaces := []v1.Namespace{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "my-ns",
					Annotations: map[string]string{"openshift.io/display-name": "My Namespace"},
				},
			},
		}
		infos := mapNamespacesToInfos(namespaces)
		if len(infos) != 1 {
			t.Fatalf("expected 1 info, got %d", len(infos))
		}
		if infos[0].Name != "my-ns" || infos[0].DisplayName != "My Namespace" {
			t.Errorf("unexpected info: %+v", infos[0])
		}
	})

	t.Run("without display name falls back to name", func(t *testing.T) {
		namespaces := []v1.Namespace{
			{ObjectMeta: metav1.ObjectMeta{Name: "plain-ns"}},
		}
		infos := mapNamespacesToInfos(namespaces)
		if infos[0].DisplayName != "plain-ns" {
			t.Errorf("expected DisplayName to be %q, got %q", "plain-ns", infos[0].DisplayName)
		}
	})

	t.Run("empty input", func(t *testing.T) {
		infos := mapNamespacesToInfos(nil)
		if len(infos) != 0 {
			t.Errorf("expected 0 infos, got %d", len(infos))
		}
	})
}

func TestLookupSecretValue(t *testing.T) {
	data := map[string][]byte{
		"AccessKey":   []byte("exact-val"),
		"secret_key":  []byte("lower-val"),
		"SECRET_KEY":  []byte("upper-val"),
		"unique_key":  []byte("unique-val"),
	}

	t.Run("exact match", func(t *testing.T) {
		val, err := LookupSecretValue(data, "AccessKey")
		if err != nil {
			t.Fatal(err)
		}
		if val != "exact-val" {
			t.Errorf("got %q, want %q", val, "exact-val")
		}
	})

	t.Run("case-insensitive single match", func(t *testing.T) {
		val, err := LookupSecretValue(data, "UNIQUE_KEY")
		if err != nil {
			t.Fatal(err)
		}
		if val != "unique-val" {
			t.Errorf("got %q, want %q", val, "unique-val")
		}
	})

	t.Run("ambiguous case-insensitive match", func(t *testing.T) {
		_, err := LookupSecretValue(data, "Secret_Key")
		if err == nil {
			t.Fatal("expected error for ambiguous key")
		}
		if !errors.Is(err, ErrAmbiguousSecretKey) {
			t.Errorf("expected ErrAmbiguousSecretKey, got %v", err)
		}
	})

	t.Run("key not found returns empty string and nil error", func(t *testing.T) {
		val, err := LookupSecretValue(data, "nonexistent")
		if err != nil {
			t.Fatal(err)
		}
		if val != "" {
			t.Errorf("got %q, want empty string", val)
		}
	})

	t.Run("multiple candidate keys tries in order", func(t *testing.T) {
		val, err := LookupSecretValue(data, "nonexistent", "AccessKey")
		if err != nil {
			t.Fatal(err)
		}
		if val != "exact-val" {
			t.Errorf("got %q, want %q", val, "exact-val")
		}
	})

	t.Run("empty data", func(t *testing.T) {
		val, err := LookupSecretValue(nil, "key")
		if err != nil {
			t.Fatal(err)
		}
		if val != "" {
			t.Errorf("got %q, want empty string", val)
		}
	})

	t.Run("exact match preferred over case-variants", func(t *testing.T) {
		d := map[string][]byte{
			"AWS_ACCESS_KEY_ID": []byte("exact"),
			"aws_access_key_id": []byte("lower"),
		}
		val, err := LookupSecretValue(d, "AWS_ACCESS_KEY_ID")
		if err != nil {
			t.Fatal(err)
		}
		if val != "exact" {
			t.Errorf("got %q, want exact match", val)
		}
	})

	t.Run("ambiguous error includes variant names", func(t *testing.T) {
		d := map[string][]byte{
			"aws_s3_endpoint": []byte("v1"),
			"AWS_s3_endpoint": []byte("v2"),
		}
		_, err := LookupSecretValue(d, "AWS_S3_ENDPOINT")
		if err == nil {
			t.Fatal("expected error")
		}
		msg := err.Error()
		if !strings.Contains(msg, "aws_s3_endpoint") || !strings.Contains(msg, "AWS_s3_endpoint") {
			t.Errorf("error should list variant names, got: %s", msg)
		}
	})

	t.Run("single case-variant fallback", func(t *testing.T) {
		d := map[string][]byte{
			"aws_access_key_id": []byte("lower-value"),
		}
		val, err := LookupSecretValue(d, "AWS_ACCESS_KEY_ID")
		if err != nil {
			t.Fatal(err)
		}
		if val != "lower-value" {
			t.Errorf("got %q, want case-insensitive fallback", val)
		}
	})
}

func TestSecretInfoHasAllKeys(t *testing.T) {
	secret := SecretInfo{
		Data: map[string]string{"a": "1", "b": "2", "c": "3"},
	}

	t.Run("all keys present", func(t *testing.T) {
		if !SecretInfoHasAllKeys(secret, []string{"a", "b"}) {
			t.Error("expected true")
		}
	})

	t.Run("missing key", func(t *testing.T) {
		if SecretInfoHasAllKeys(secret, []string{"a", "d"}) {
			t.Error("expected false")
		}
	})

	t.Run("empty keys always true", func(t *testing.T) {
		if !SecretInfoHasAllKeys(secret, nil) {
			t.Error("expected true for nil keys")
		}
	})
}

func TestFilterSecretInfos(t *testing.T) {
	secrets := []SecretInfo{
		{Name: "s3-creds", Data: map[string]string{"accessKey": "x", "secretKey": "y"}},
		{Name: "db-creds", Data: map[string]string{"host": "h", "port": "p"}},
		{Name: "empty", Data: map[string]string{}},
	}

	reqs := map[string][]string{
		"s3":       {"accessKey", "secretKey"},
		"database": {"host", "port"},
	}

	t.Run("matches correct secrets", func(t *testing.T) {
		filtered := FilterSecretInfos(secrets, reqs)
		if len(filtered) != 2 {
			t.Fatalf("expected 2, got %d", len(filtered))
		}
	})

	t.Run("no matches", func(t *testing.T) {
		filtered := FilterSecretInfos(secrets, map[string][]string{"x": {"missing"}})
		if len(filtered) != 0 {
			t.Errorf("expected 0, got %d", len(filtered))
		}
	})

	t.Run("empty requirements matches nothing", func(t *testing.T) {
		filtered := FilterSecretInfos(secrets, map[string][]string{})
		if len(filtered) != 0 {
			t.Errorf("expected 0, got %d", len(filtered))
		}
	})
}

func TestDetectSecretType(t *testing.T) {
	reqs := map[string][]string{
		"s3": {"accessKey", "secretKey"},
	}

	t.Run("annotation type takes precedence", func(t *testing.T) {
		secret := SecretInfo{Type: "custom-type", Data: map[string]string{"accessKey": "x", "secretKey": "y"}}
		if got := DetectSecretType(secret, reqs); got != "custom-type" {
			t.Errorf("got %q, want %q", got, "custom-type")
		}
	})

	t.Run("falls back to key-based detection", func(t *testing.T) {
		secret := SecretInfo{Data: map[string]string{"accessKey": "x", "secretKey": "y"}}
		if got := DetectSecretType(secret, reqs); got != "s3" {
			t.Errorf("got %q, want %q", got, "s3")
		}
	})

	t.Run("no match returns empty", func(t *testing.T) {
		secret := SecretInfo{Data: map[string]string{"unrelated": "x"}}
		if got := DetectSecretType(secret, reqs); got != "" {
			t.Errorf("got %q, want empty", got)
		}
	})
}

func TestRedactSecretData(t *testing.T) {
	data := map[string]string{
		"endpoint": "https://api.example.com",
		"password": "secret123",
		"token":    "abc",
	}
	allowed := map[string]bool{"endpoint": true}

	result := RedactSecretData(data, allowed)

	if result["endpoint"] != "https://api.example.com" {
		t.Errorf("allowed key was redacted: %q", result["endpoint"])
	}
	if result["password"] != "[REDACTED]" {
		t.Errorf("expected [REDACTED], got %q", result["password"])
	}
	if result["token"] != "[REDACTED]" {
		t.Errorf("expected [REDACTED], got %q", result["token"])
	}

	t.Run("empty data", func(t *testing.T) {
		result := RedactSecretData(map[string]string{}, nil)
		if len(result) != 0 {
			t.Errorf("expected empty, got %v", result)
		}
	})
}

func makeSecret(name string, data map[string][]byte, annotations map[string]string) v1.Secret {
	return v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:        name,
			UID:         types.UID("uid-" + name),
			Annotations: annotations,
		},
		Data: data,
	}
}
