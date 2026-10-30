package controller

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	rbacv1 "k8s.io/api/rbac/v1"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"
)

var clusterRoleKind = regexp.MustCompile(`(?m)^kind: ClusterRole$`)

// TestOperatorRoleCoversDeployedClusterRoles mirrors the API server's RBAC escalation
// check: the operator SA holds neither escalate nor bind, so every rule in a ClusterRole
// it applies must be covered by its own role, or the apply is rejected and the Dashboard
// never becomes ready. resourceNames matter: holding get on apiservers/cluster does not
// cover an unscoped get on apiservers (RHOAIENG-102323).
func TestOperatorRoleCoversDeployedClusterRoles(t *testing.T) {
	operatorRole := readClusterRole(t, filepath.Join("..", "..", "config", "rbac", "role.yaml"))

	roles := readManifestClusterRoles(t, filepath.Join("..", "..", "..", "manifests"))
	require.Contains(t, roles, "odh-dashboard-notebooks")

	for name, role := range roles {
		t.Run(name, func(t *testing.T) {
			assert.Empty(t, uncoveredPermissions(role.Rules, operatorRole.Rules),
				"operator role must hold these permissions to apply this ClusterRole")
		})
	}
}

func TestUncoveredPermissions(t *testing.T) {
	apiServers := func(verbs, names []string) rbacv1.PolicyRule {
		return rbacv1.PolicyRule{
			APIGroups: []string{"config.openshift.io"}, Resources: []string{"apiservers"},
			Verbs: verbs, ResourceNames: names,
		}
	}
	scopedGet := apiServers([]string{"get"}, []string{"cluster"})
	unscopedGet := apiServers([]string{"get"}, nil)

	tests := []struct {
		name  string
		grant rbacv1.PolicyRule
		held  []rbacv1.PolicyRule
		want  []string
	}{
		{name: "identical scoped grant", grant: scopedGet, held: []rbacv1.PolicyRule{scopedGet}},
		{name: "scoped grant from unscoped hold", grant: scopedGet, held: []rbacv1.PolicyRule{unscopedGet}},
		{
			name: "unscoped grant from scoped hold", grant: unscopedGet, held: []rbacv1.PolicyRule{scopedGet},
			want: []string{"get config.openshift.io/apiservers"},
		},
		{
			name: "other resource name", grant: apiServers([]string{"get"}, []string{"other"}), held: []rbacv1.PolicyRule{scopedGet},
			want: []string{"get config.openshift.io/apiservers/other"},
		},
		{
			name: "missing verb", grant: apiServers([]string{"list"}, nil), held: []rbacv1.PolicyRule{unscopedGet},
			want: []string{"list config.openshift.io/apiservers"},
		},
		{
			name: "wildcard hold", grant: unscopedGet,
			held: []rbacv1.PolicyRule{{APIGroups: []string{"*"}, Resources: []string{"*"}, Verbs: []string{"*"}}},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, uncoveredPermissions([]rbacv1.PolicyRule{tt.grant}, tt.held))
		})
	}
}

func readClusterRole(t *testing.T, path string) *rbacv1.ClusterRole {
	t.Helper()
	data, err := os.ReadFile(path)
	require.NoError(t, err)
	role := &rbacv1.ClusterRole{}
	require.NoError(t, yaml.Unmarshal(data, role))
	require.NotEmpty(t, role.Rules, "%s has no rules", path)
	return role
}

// readManifestClusterRoles returns every ClusterRole under dir by name, including those in
// multi-document files. Kustomize patches have no kind line, so they are skipped.
func readManifestClusterRoles(t *testing.T, dir string) map[string]*rbacv1.ClusterRole {
	t.Helper()
	roles := map[string]*rbacv1.ClusterRole{}
	err := filepath.WalkDir(dir, func(path string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() || filepath.Ext(path) != ".yaml" {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		reader := utilyaml.NewYAMLReader(bufio.NewReader(bytes.NewReader(data)))
		for {
			doc, err := reader.Read()
			if errors.Is(err, io.EOF) {
				return nil
			}
			if err != nil {
				return fmt.Errorf("reading %s: %w", path, err)
			}
			if !clusterRoleKind.Match(doc) {
				continue
			}
			role := &rbacv1.ClusterRole{}
			if err := yaml.Unmarshal(doc, role); err != nil {
				return fmt.Errorf("parsing %s: %w", path, err)
			}
			roles[role.Name] = role
		}
	})
	require.NoError(t, err)
	return roles
}

// uncoveredPermissions returns each permission in grants that held does not cover, one
// entry per verb/group/resource/resourceName so a failure names exactly what is missing.
func uncoveredPermissions(grants, held []rbacv1.PolicyRule) []string {
	var uncovered []string
	for _, grant := range grants {
		names := grant.ResourceNames
		if len(names) == 0 {
			names = []string{""}
		}
		for _, verb := range grant.Verbs {
			for _, group := range grant.APIGroups {
				for _, resource := range grant.Resources {
					for _, name := range names {
						covered := slices.ContainsFunc(held, func(rule rbacv1.PolicyRule) bool {
							return ruleCovers(rule, verb, group, resource, name)
						})
						if covered {
							continue
						}
						permission := fmt.Sprintf("%s %s/%s", verb, group, resource)
						if name != "" {
							permission += "/" + name
						}
						uncovered = append(uncovered, permission)
					}
				}
			}
		}
	}
	return uncovered
}

// ruleCovers reports whether rule allows the permission. An empty name is a grant with no
// resourceNames, which only a rule that also has no resourceNames can cover.
func ruleCovers(rule rbacv1.PolicyRule, verb, group, resource, name string) bool {
	matches := func(values []string, value string) bool {
		return slices.Contains(values, "*") || slices.Contains(values, value)
	}
	if !matches(rule.Verbs, verb) || !matches(rule.APIGroups, group) || !matches(rule.Resources, resource) {
		return false
	}
	return len(rule.ResourceNames) == 0 || (name != "" && slices.Contains(rule.ResourceNames, name))
}
