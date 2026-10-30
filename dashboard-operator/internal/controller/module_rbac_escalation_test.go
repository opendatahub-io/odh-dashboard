package controller

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	rbacv1 "k8s.io/api/rbac/v1"
	"sigs.k8s.io/yaml"
)

// TestOperatorRoleCoversDeployedClusterRoles mirrors the API server's RBAC escalation
// check: the operator SA holds neither escalate nor bind, so every rule in a ClusterRole
// it applies must be covered by its own role, or the apply is rejected and the Dashboard
// never becomes ready. resourceNames matter: holding get on apiservers/cluster does not
// cover an unscoped get on apiservers (RHOAIENG-102323).
func TestOperatorRoleCoversDeployedClusterRoles(t *testing.T) {
	operatorRole := readClusterRole(t, filepath.Join("..", "..", "config", "rbac", "role.yaml"))

	manifests := filepath.Join("..", "..", "..", "manifests")
	paths, err := filepath.Glob(filepath.Join(manifests, "modules", "*", "cluster-role.yaml"))
	require.NoError(t, err)
	distributionPaths, err := filepath.Glob(filepath.Join(manifests, "distributions", "*", "cluster-role.yaml"))
	require.NoError(t, err)
	paths = append(paths, distributionPaths...)
	paths = append(paths, filepath.Join(manifests, "base", "sa-rbac", "cluster-role.yaml"))
	require.NotEmpty(t, paths)

	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			role := readClusterRole(t, path)
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
