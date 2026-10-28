package repositories

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func TestSubscriptionOwnerGroups(t *testing.T) {
	const group = "42c3e46f-2477-44d7-a85b-d3b43f6b31fa/ai-grid-users"
	for _, tc := range []struct {
		name    string
		payload string
		want    []models.GroupReference
	}{
		{"nested references", `{"owner":{"groups":[{"name":"` + group + `"},{"name":"42c3e46f-2477-44d7-a85b-d3b43f6b31fa/data-science"}]}}`, []models.GroupReference{{Name: group}, {Name: "42c3e46f-2477-44d7-a85b-d3b43f6b31fa/data-science"}}},
		{"empty", `{"owner":{"groups":[]}}`, []models.GroupReference{}},
		{"absent owner", `{}`, []models.GroupReference{}},
		{"null owner", `{"owner":null}`, []models.GroupReference{}},
		{"absent groups", `{"owner":{}}`, []models.GroupReference{}},
		{"null groups", `{"owner":{"groups":null}}`, []models.GroupReference{}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var item models.SubscriptionListItem
			if err := json.Unmarshal([]byte(tc.payload), &item); err != nil {
				t.Fatal(err)
			}
			subs := ConvertSubscriptionListItemsToSubscriptions([]models.SubscriptionListItem{item}, "maas-system")
			if !reflect.DeepEqual(subs[0].Owner.Groups, tc.want) {
				t.Fatalf("groups = %#v, want %#v", subs[0].Owner.Groups, tc.want)
			}
			encoded, err := json.Marshal(subs[0])
			if err != nil {
				t.Fatal(err)
			}
			var decoded models.MaaSSubscription
			if err := json.Unmarshal(encoded, &decoded); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(decoded.Owner.Groups, tc.want) {
				t.Fatalf("wire groups = %#v, want %#v", decoded.Owner.Groups, tc.want)
			}
		})
	}
}

func TestSubscriptionRejectsStringGroups(t *testing.T) {
	var item models.SubscriptionListItem
	if err := json.Unmarshal([]byte(`{"owner":{"groups":["not-a-group-reference"]}}`), &item); err == nil {
		t.Fatal("expected decoding error for string group entries")
	}
}
