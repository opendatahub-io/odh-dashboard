package repositories

import (
	"encoding/json"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// The upstream field name is the whole contract here: if maas-api renames owner_groups, the
// decoder yields nil and every subscription would silently report no groups. Keep this test
// pinned to the name we ask maas-api for.
func TestSubscriptionListItem_UnmarshalsOwnerGroups(t *testing.T) {
	payload := []byte(`[
		{
			"subscription_id_header": "premium-team-sub",
			"subscription_description": "Premium Team Subscription",
			"model_refs": [],
			"owner_groups": ["premium-users", "data-science"]
		},
		{
			"subscription_id_header": "basic-team-sub",
			"subscription_description": "Basic Team Subscription",
			"model_refs": [],
			"owner_groups": []
		},
		{
			"subscription_id_header": "legacy-team-sub",
			"subscription_description": "Subscription from an older maas-api",
			"model_refs": []
		}
	]`)

	var items []models.SubscriptionListItem
	if err := json.Unmarshal(payload, &items); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("len(items) = %d, want 3", len(items))
	}

	if items[0].OwnerGroups == nil {
		t.Fatal("premium OwnerGroups is nil, want the owner_groups payload decoded")
	}
	if got := *items[0].OwnerGroups; len(got) != 2 || got[0] != "premium-users" || got[1] != "data-science" {
		t.Errorf("premium OwnerGroups = %v, want [premium-users data-science]", got)
	}

	if items[1].OwnerGroups == nil {
		t.Fatal("basic OwnerGroups is nil, want an explicit empty list to stay distinguishable from absent")
	}
	if got := *items[1].OwnerGroups; len(got) != 0 {
		t.Errorf("basic OwnerGroups = %v, want empty", got)
	}

	if items[2].OwnerGroups != nil {
		t.Errorf("legacy OwnerGroups = %v, want nil when maas-api omits the field", *items[2].OwnerGroups)
	}
}

func TestConvertSubscriptionListItemsToSubscriptions_OwnerGroups(t *testing.T) {
	withGroups := []string{"premium-users", "data-science"}
	emptyGroups := []string{}
	withBlankEntry := []string{"premium-users", "", "data-science"}

	items := []models.SubscriptionListItem{
		{SubscriptionIDHeader: "with-groups", OwnerGroups: &withGroups},
		{SubscriptionIDHeader: "explicitly-empty", OwnerGroups: &emptyGroups},
		{SubscriptionIDHeader: "field-absent"},
		{SubscriptionIDHeader: "blank-entry", OwnerGroups: &withBlankEntry},
	}

	subs := ConvertSubscriptionListItemsToSubscriptions(items, "maas-system")
	if len(subs) != 4 {
		t.Fatalf("len(subs) = %d, want 4", len(subs))
	}
	// Sorted by name: blank-entry, explicitly-empty, field-absent, with-groups.
	byName := map[string]models.MaaSSubscription{}
	for _, sub := range subs {
		byName[sub.Name] = sub
	}

	if got := byName["with-groups"].Owner.Groups; len(got) != 2 || got[0].Name != "premium-users" || got[1].Name != "data-science" {
		t.Errorf("with-groups groups = %v, want [premium-users data-science]", got)
	}
	if got := byName["explicitly-empty"].Owner.Groups; got == nil || len(got) != 0 {
		t.Errorf("explicitly-empty groups = %v, want non-nil empty slice", got)
	}
	if got := byName["field-absent"].Owner.Groups; got == nil || len(got) != 0 {
		t.Errorf("field-absent groups = %v, want non-nil empty slice", got)
	}
	if got := byName["blank-entry"].Owner.Groups; len(got) != 2 {
		t.Errorf("blank-entry groups = %v, want blank names skipped", got)
	}
}

// Guard the wire shape of the BFF response itself: owner.groups must always serialize, so
// clients never have to distinguish null from [].
func TestMaaSSubscription_SerializesOwnerGroupsAsArray(t *testing.T) {
	groups := []string{}
	subs := ConvertSubscriptionListItemsToSubscriptions(
		[]models.SubscriptionListItem{{SubscriptionIDHeader: "sub", OwnerGroups: &groups}},
		"maas-system",
	)

	encoded, err := json.Marshal(subs[0])
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded struct {
		Owner struct {
			Groups *[]models.GroupReference `json:"groups"`
		} `json:"owner"`
	}
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded.Owner.Groups == nil {
		t.Fatalf("owner.groups missing from payload: %s", encoded)
	}
	if len(*decoded.Owner.Groups) != 0 {
		t.Errorf("owner.groups = %v, want empty array", *decoded.Owner.Groups)
	}
}
