package bundlecontract

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/yaml"
)

// Paths relative to this package.
const (
	bundleDir         = "../../../../../manifests/distributions/rhaii"
	bootstrapContract = "../../../docs/bootstrap-contract.md"
	// The section of the bootstrap contract whose first table lists every
	// service-account operation the BFF may perform on xKS.
	contractSection = "## Service-account permissions"
	dashboardName   = "rhaii-dashboard"
)

// grant is one verb on one resource, at the scope a binding gives it.
type grant struct {
	cluster  bool
	group    string
	resource string
	verb     string
}

func (g grant) String() string {
	scope := "namespaced"
	if g.cluster {
		scope = "cluster-wide"
	}
	group := g.group
	if group == "" {
		group = "core"
	}
	return fmt.Sprintf("%s %s.%s (%s)", g.verb, g.resource, group, scope)
}

// RHAI-50761: the RHAII bundle grants its service account exactly the
// operations the bootstrap contract lists, verb for verb. Anything extra fails
// here (the bundle must not grant more than the contract allows), and so does
// anything missing (the contract would then promise a read the install
// cannot perform). Change the contract table first, then the bundle.
func TestRHAIIBundle_ServiceAccountRBACMatchesTheContract(t *testing.T) {
	want := contractGrants(t)
	b := loadBundle(t)

	got, violations := serviceAccountGrants(b)
	require.Empty(t, violations, "the RHAII bundle's service-account RBAC breaks the guard rules")

	assert.Empty(t, difference(got, want),
		"the RHAII bundle grants its service account more than %s allows", bootstrapContract)
	assert.Empty(t, difference(want, got),
		"%s lists service-account operations the RHAII bundle does not grant", bootstrapContract)
}

// The contract table above holds only with the platform set explicitly: an
// auto-detected or unconfirmed xKS platform probes ClusterVersion and can read
// auths/auth with the service account (bootstrap contract, "The platform
// default requires a confirmed platform"). The bundle must also send the
// agreed ordered credential headers (runtime contract, "Caller credentials").
func TestRHAIIBundle_DeploymentKeepsTheContractPreconditions(t *testing.T) {
	b := loadBundle(t)
	d := b.deployment(t)
	c := dashboardContainer(t, d)
	args := c.Args

	assert.Contains(t, args, "--platform-type=XKS")
	assert.Contains(t, args, "--auth-token-headers=Authorization,x-forwarded-access-token")
	for _, a := range args {
		assert.False(t, strings.HasPrefix(a, "--auth-token-header="), "single-header mode %q replaces the ordered list", a)
		assert.False(t, strings.HasPrefix(a, "--auth-token-prefix="), "%q is ambiguous with an ordered list", a)
	}
	for _, e := range c.Env {
		assert.NotContains(t, []string{"ODH_PLATFORM_TYPE", "AUTH_TOKEN_HEADERS", "AUTH_TOKEN_HEADER", "AUTH_TOKEN_PREFIX", "ADMISSION_MODE"},
			e.Name, "set %s through the reviewed flag, not the environment", e.Name)
	}
	assert.NotContains(t, strings.Join(args, " "), "--admission-mode",
		"the xKS default (authenticated) is what keeps auths out of the contract")
	assert.Equal(t, dashboardName, d.Spec.Template.Spec.ServiceAccountName)
}

// The guard itself must catch the shapes that widen access without adding a
// plain rule. Each case starts from a compliant bundle and changes one thing.
func TestServiceAccountGrants_FlagsWideningShapes(t *testing.T) {
	role := func(rules ...rbacv1.PolicyRule) rbacv1.Role {
		r := rbacv1.Role{Rules: rules}
		r.Name = dashboardName
		return r
	}
	saSubject := []rbacv1.Subject{{Kind: rbacv1.ServiceAccountKind, Name: dashboardName}}
	binding := func(kind, name string, subjects []rbacv1.Subject) rbacv1.RoleBinding {
		rb := rbacv1.RoleBinding{RoleRef: rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: kind, Name: name}, Subjects: subjects}
		rb.Name = dashboardName
		return rb
	}
	read := rbacv1.PolicyRule{APIGroups: []string{""}, Resources: []string{"configmaps"}, Verbs: []string{"get"}}

	tests := []struct {
		name string
		b    bundle
		want string
	}{
		{
			name: "wildcard verb",
			b: bundle{sa: dashboardName, roles: []rbacv1.Role{role(rbacv1.PolicyRule{APIGroups: []string{""}, Resources: []string{"configmaps"}, Verbs: []string{"*"}})},
				roleBindings: []rbacv1.RoleBinding{binding("Role", dashboardName, saSubject)}},
			want: "wildcard",
		},
		{
			name: "resourceNames",
			b: bundle{sa: dashboardName, roles: []rbacv1.Role{role(rbacv1.PolicyRule{APIGroups: []string{""}, Resources: []string{"configmaps"}, Verbs: []string{"get"}, ResourceNames: []string{"x"}})},
				roleBindings: []rbacv1.RoleBinding{binding("Role", dashboardName, saSubject)}},
			want: "resourceNames",
		},
		{
			name: "binding to a role the bundle does not ship",
			b:    bundle{sa: dashboardName, roleBindings: []rbacv1.RoleBinding{binding("ClusterRole", "edit", saSubject)}},
			want: "not defined in the bundle",
		},
		{
			name: "binding to another subject",
			b: bundle{sa: dashboardName, roles: []rbacv1.Role{role(read)},
				roleBindings: []rbacv1.RoleBinding{binding("Role", dashboardName, []rbacv1.Subject{{Kind: rbacv1.GroupKind, Name: "system:authenticated"}})}},
			want: "binds",
		},
		{
			name: "aggregated ClusterRole",
			b: bundle{sa: dashboardName, clusterRoles: []rbacv1.ClusterRole{{
				ObjectMeta:      roleMeta(dashboardName),
				AggregationRule: &rbacv1.AggregationRule{},
			}}, clusterRoleBindings: []rbacv1.ClusterRoleBinding{{
				ObjectMeta: roleMeta(dashboardName),
				RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: dashboardName},
				Subjects:   saSubject,
			}}},
			want: "aggregation",
		},
		{
			name: "non-resource URL",
			b: bundle{sa: dashboardName, clusterRoles: []rbacv1.ClusterRole{{
				ObjectMeta: roleMeta(dashboardName),
				Rules:      []rbacv1.PolicyRule{{NonResourceURLs: []string{"/metrics"}, Verbs: []string{"get"}}},
			}}, clusterRoleBindings: []rbacv1.ClusterRoleBinding{{
				ObjectMeta: roleMeta(dashboardName),
				RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: dashboardName},
				Subjects:   saSubject,
			}}},
			want: "non-resource",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, violations := serviceAccountGrants(tc.b)
			require.NotEmpty(t, violations)
			assert.Contains(t, strings.Join(violations, "\n"), tc.want)
		})
	}

	// A ClusterRoleBinding makes the same rule cluster-wide, which is a
	// different grant from the namespaced one the contract lists.
	cr := rbacv1.ClusterRole{ObjectMeta: roleMeta(dashboardName), Rules: []rbacv1.PolicyRule{read}}
	got, violations := serviceAccountGrants(bundle{sa: dashboardName, clusterRoles: []rbacv1.ClusterRole{cr},
		clusterRoleBindings: []rbacv1.ClusterRoleBinding{{ObjectMeta: roleMeta(dashboardName),
			RoleRef: rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: dashboardName}, Subjects: saSubject}}})
	require.Empty(t, violations)
	assert.Equal(t, []grant{{cluster: true, resource: "configmaps", verb: "get"}}, got)
}

// contractGrants parses the first table under contractSection. Each row is
// "| `resource` (`group`) or (core)[, scope note] | `verb`, `verb` | why |". A
// resource cell that says "cluster-wide" is a cluster-scoped grant; every
// other row is namespaced to the dashboard namespace.
func contractGrants(t *testing.T) []grant {
	t.Helper()
	raw, err := os.ReadFile(filepath.Clean(bootstrapContract))
	require.NoError(t, err)

	var (
		inSection, inTable bool
		rows               [][]string
	)
	sc := bufio.NewScanner(bytes.NewReader(raw))
scan:
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		switch {
		case !inSection:
			inSection = line == contractSection
		case strings.HasPrefix(line, "|"):
			inTable = true
			rows = append(rows, splitRow(line))
		case inTable, strings.HasPrefix(line, "## "):
			break scan // the first table ends the scan, and so does the next section
		}
	}
	require.NoError(t, sc.Err())
	require.True(t, inSection, "%s lost its %q section", bootstrapContract, contractSection)
	require.Greater(t, len(rows), 2, "the service-account table has no data rows")
	require.Equal(t, "Resource", rows[0][0])
	require.Equal(t, "Verbs", rows[0][1])

	code := regexp.MustCompile("`([^`]+)`")
	var out []grant
	for _, row := range rows[2:] {
		require.GreaterOrEqual(t, len(row), 2, "malformed row %q", row)
		names := code.FindAllStringSubmatch(row[0], -1)
		require.NotEmpty(t, names, "row %q names no resource", row[0])
		g := grant{resource: names[0][1], cluster: strings.Contains(row[0], "cluster-wide")}
		switch {
		case len(names) >= 2:
			g.group = names[1][1]
		case strings.Contains(row[0], "(core)"):
			g.group = ""
		default:
			require.Failf(t, "no API group", "row %q must give the API group as (`group`) or (core)", row[0])
		}
		verbs := code.FindAllStringSubmatch(row[1], -1)
		require.NotEmpty(t, verbs, "row %q lists no verbs", row[0])
		for _, v := range verbs {
			g.verb = v[1]
			out = append(out, g)
		}
	}
	return sortedUnique(out)
}

func splitRow(line string) []string {
	cells := strings.Split(strings.Trim(line, "|"), "|")
	for i := range cells {
		cells[i] = strings.TrimSpace(cells[i])
	}
	return cells
}

type bundle struct {
	sa                  string
	deployments         []appsv1.Deployment
	roles               []rbacv1.Role
	clusterRoles        []rbacv1.ClusterRole
	roleBindings        []rbacv1.RoleBinding
	clusterRoleBindings []rbacv1.ClusterRoleBinding
}

func roleMeta(name string) metav1.ObjectMeta {
	return metav1.ObjectMeta{Name: name}
}

func (b bundle) deployment(t *testing.T) appsv1.Deployment {
	t.Helper()
	for _, d := range b.deployments {
		if d.Name == dashboardName {
			return d
		}
	}
	require.FailNow(t, "the bundle has no rhaii-dashboard Deployment")
	return appsv1.Deployment{}
}

func dashboardContainer(t *testing.T, d appsv1.Deployment) corev1.Container {
	t.Helper()
	for _, c := range d.Spec.Template.Spec.Containers {
		if c.Name == dashboardName {
			return c
		}
	}
	require.FailNow(t, "the Deployment has no rhaii-dashboard container")
	return corev1.Container{}
}

// serviceAccountGrants expands every rule the bundle binds to its service
// account into single grants. Violations are shapes the contract cannot
// express, so the guard rejects them outright instead of comparing them.
func serviceAccountGrants(b bundle) ([]grant, []string) {
	var (
		got        []grant
		violations []string
	)
	roles := map[string][]rbacv1.PolicyRule{}
	for _, r := range b.roles {
		roles["Role/"+r.Name] = r.Rules
	}
	clusterRoles := map[string]rbacv1.ClusterRole{}
	for _, r := range b.clusterRoles {
		clusterRoles[r.Name] = r
	}

	bind := func(binding string, cluster bool, ref rbacv1.RoleRef, subjects []rbacv1.Subject) {
		for _, s := range subjects {
			if s.Kind != rbacv1.ServiceAccountKind || s.Name != b.sa {
				violations = append(violations, fmt.Sprintf("%s binds %s %q; the bundle may bind only its ServiceAccount %q", binding, s.Kind, s.Name, b.sa))
			}
		}
		var rules []rbacv1.PolicyRule
		switch ref.Kind {
		case "Role":
			r, ok := roles["Role/"+ref.Name]
			if !ok {
				violations = append(violations, fmt.Sprintf("%s refers to Role %q, which is not defined in the bundle", binding, ref.Name))
				return
			}
			rules = r
		case "ClusterRole":
			r, ok := clusterRoles[ref.Name]
			if !ok {
				violations = append(violations, fmt.Sprintf("%s refers to ClusterRole %q, which is not defined in the bundle", binding, ref.Name))
				return
			}
			if r.AggregationRule != nil {
				violations = append(violations, fmt.Sprintf("%s refers to ClusterRole %q, whose aggregation rule adds rules the bundle does not list", binding, ref.Name))
			}
			rules = r.Rules
		default:
			violations = append(violations, fmt.Sprintf("%s has roleRef kind %q", binding, ref.Kind))
			return
		}
		for _, rule := range rules {
			if len(rule.NonResourceURLs) > 0 {
				violations = append(violations, fmt.Sprintf("%s grants non-resource URLs %v", binding, rule.NonResourceURLs))
			}
			if len(rule.ResourceNames) > 0 {
				violations = append(violations, fmt.Sprintf("%s narrows a rule with resourceNames %v, which the contract table cannot express", binding, rule.ResourceNames))
			}
			for _, field := range [][]string{rule.APIGroups, rule.Resources, rule.Verbs} {
				for _, v := range field {
					if strings.Contains(v, "*") {
						violations = append(violations, fmt.Sprintf("%s grants the wildcard %q", binding, v))
					}
				}
			}
			for _, group := range rule.APIGroups {
				for _, resource := range rule.Resources {
					for _, verb := range rule.Verbs {
						got = append(got, grant{cluster: cluster, group: group, resource: resource, verb: verb})
					}
				}
			}
		}
	}
	for _, rb := range b.roleBindings {
		bind("RoleBinding/"+rb.Name, false, rb.RoleRef, rb.Subjects)
	}
	for _, crb := range b.clusterRoleBindings {
		bind("ClusterRoleBinding/"+crb.Name, true, crb.RoleRef, crb.Subjects)
	}
	return sortedUnique(got), violations
}

// difference returns the grants in a that b does not have, as strings so a
// failure reads as the list of offending verbs.
func difference(a, b []grant) []string {
	have := map[grant]bool{}
	for _, g := range b {
		have[g] = true
	}
	var out []string
	for _, g := range a {
		if !have[g] {
			out = append(out, g.String())
		}
	}
	return out
}

func sortedUnique(in []grant) []grant {
	seen := map[grant]bool{}
	out := make([]grant, 0, len(in))
	for _, g := range in {
		if !seen[g] {
			seen[g] = true
			out = append(out, g)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].String() < out[j].String() })
	return out
}

// loadBundle reads every resource the bundle's kustomization lists. The guard
// reads files rather than a rendered build, so it refuses kustomization
// features that could add or change RBAC without appearing in those files.
func loadBundle(t *testing.T) bundle {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(bundleDir, "kustomization.yaml"))
	require.NoError(t, err)
	var k map[string]any
	require.NoError(t, yaml.NewYAMLOrJSONDecoder(bytes.NewReader(raw), 4096).Decode(&k))
	for _, key := range []string{"patches", "patchesStrategicMerge", "patchesJson6902", "components", "bases", "transformers", "generators", "crds", "helmCharts"} {
		require.NotContains(t, k, key, "the RBAC guard reads the bundle's resource files; extend it before using %q", key)
	}
	resources, ok := k["resources"].([]any)
	require.True(t, ok, "kustomization.yaml lists no resources")

	b := bundle{}
	for _, r := range resources {
		name, ok := r.(string)
		require.True(t, ok)
		path := filepath.Join(bundleDir, name)
		info, err := os.Stat(path)
		require.NoError(t, err)
		require.False(t, info.IsDir(), "resource %q is a directory; extend the guard to follow it", name)
		decodeInto(t, path, &b)
	}
	require.Len(t, b.deployments, 1, "the bundle must ship exactly one Deployment")
	b.sa = b.deployments[0].Spec.Template.Spec.ServiceAccountName
	require.NotEmpty(t, b.sa)
	return b
}

func decodeInto(t *testing.T, path string, b *bundle) {
	t.Helper()
	f, err := os.Open(filepath.Clean(path))
	require.NoError(t, err)
	defer f.Close()
	dec := yaml.NewYAMLOrJSONDecoder(f, 4096)
	for {
		var doc map[string]any
		if err := dec.Decode(&doc); errors.Is(err, io.EOF) {
			return
		} else {
			require.NoError(t, err, path)
		}
		if doc == nil {
			continue
		}
		js, err := json.Marshal(doc)
		require.NoError(t, err)
		switch doc["kind"] {
		case "Deployment":
			var d appsv1.Deployment
			require.NoError(t, json.Unmarshal(js, &d))
			b.deployments = append(b.deployments, d)
		case "Role":
			var r rbacv1.Role
			require.NoError(t, json.Unmarshal(js, &r))
			b.roles = append(b.roles, r)
		case "ClusterRole":
			var r rbacv1.ClusterRole
			require.NoError(t, json.Unmarshal(js, &r))
			b.clusterRoles = append(b.clusterRoles, r)
		case "RoleBinding":
			var r rbacv1.RoleBinding
			require.NoError(t, json.Unmarshal(js, &r))
			b.roleBindings = append(b.roleBindings, r)
		case "ClusterRoleBinding":
			var r rbacv1.ClusterRoleBinding
			require.NoError(t, json.Unmarshal(js, &r))
			b.clusterRoleBindings = append(b.clusterRoleBindings, r)
		case "StatefulSet", "DaemonSet", "Job", "CronJob", "Pod", "ReplicaSet":
			require.Failf(t, "unexpected workload", "%s in %s runs with a service account the guard does not check", doc["kind"], path)
		}
	}
}
