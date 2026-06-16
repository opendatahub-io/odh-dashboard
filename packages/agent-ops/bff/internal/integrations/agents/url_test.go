package agents

import "testing"

func TestBuildSanitizedHTTPURLRejectsPathTraversal(t *testing.T) {
	if got := BuildSanitizedHTTPURL("https", "agent.apps.example.com", "/agents/../secrets/.well-known/agent-card.json"); got != "" {
		t.Fatalf("expected empty URL for traversal path, got %q", got)
	}
}

func TestBuildSanitizedHTTPURLNormalizesPath(t *testing.T) {
	got := BuildSanitizedHTTPURL("https", "agent.apps.example.com", "agents/support/.well-known/agent-card.json")
	if got != "https://agent.apps.example.com/agents/support/.well-known/agent-card.json" {
		t.Fatalf("unexpected normalized URL: %q", got)
	}
}
