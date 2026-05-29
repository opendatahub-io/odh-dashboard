package models

import (
	"encoding/json"
	"strings"
	"testing"
)

// These tests guard against accidentally re-adding omitempty to the groups field
// on OwnerSpec and SubjectSpec. If groups is omitted from JSON entirely, the
// frontend Array.isArray(v.groups) check fails and the page breaks.

func TestOwnerSpec_EmptyGroupsSerializesAsArray(t *testing.T) {
	b, err := json.Marshal(OwnerSpec{Groups: []GroupReference{}})
	if err != nil {
		t.Fatalf("unexpected marshal error: %v", err)
	}
	if !strings.Contains(string(b), `"groups":[]`) {
		t.Errorf(`"groups":[] must be present in JSON, got: %s`, string(b))
	}
}

func TestSubjectSpec_EmptyGroupsSerializesAsArray(t *testing.T) {
	b, err := json.Marshal(SubjectSpec{Groups: []GroupReference{}})
	if err != nil {
		t.Fatalf("unexpected marshal error: %v", err)
	}
	if !strings.Contains(string(b), `"groups":[]`) {
		t.Errorf(`"groups":[] must be present in JSON, got: %s`, string(b))
	}
}
