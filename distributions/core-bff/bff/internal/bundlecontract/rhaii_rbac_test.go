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

	// The BFF parses flags with the standard flag package: the last occurrence
	// wins, and a separate value ("--port 8443") cannot be told apart from a
	// positional argument without the flag's type. Keep every arg in the
	// unambiguous "--name=value" form so the reads below are exact.
	for _, a := range args {
		assert.Regexp(t, `^--[a-z0-9-]+=`, a, "write bundle args as --name=value")
	}
	assert.Equal(t, []string{"XKS"}, lastFlagValue(args, "platform-type"))
	assert.Equal(t, []string{"Authorization,x-forwarded-access-token"}, lastFlagValue(args, "auth-token-headers"))
	// The production profile: caller credentials, no DEV_MODE fallback to the
	// service account, no mocked clients.
	assert.Equal(t, []string{"user_token"}, lastFlagValue(args, "auth-method"))
	for _, name := range []string{"auth-token-header", "auth-token-prefix", "admission-mode", "dev-mode", "mock-k8s-client", "insecure-skip-verify"} {
		assert.Nil(t, lastFlagValue(args, name), "--%s must not be set in the bundle", name)
	}
	for _, e := range c.Env {
		assert.NotContains(t, []string{"ODH_PLATFORM_TYPE", "AUTH_METHOD", "AUTH_TOKEN_HEADERS", "AUTH_TOKEN_HEADER", "AUTH_TOKEN_PREFIX",
			"ADMISSION_MODE", "DEV_MODE", "MOCK_K8S_CLIENT", "INSECURE_SKIP_VERIFY"},
			e.Name, "%s must not come from the environment: the reviewed flags are the contract", e.Name)
	}
	assert.Empty(t, c.EnvFrom, "envFrom could set any of the settings above")
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

// lastFlagValue returns the value the flag package would settle on for name,
// as a one-element slice, or nil when the flag is absent. Like flag.Parse it
// stops at "--" and at the first argument that is not a flag.
func lastFlagValue(args []string, name string) []string {
	var value []string
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--" || a == "-" || !strings.HasPrefix(a, "-") {
			break
		}
		flag := strings.TrimPrefix(strings.TrimPrefix(a, "-"), "-")
		switch {
		case strings.HasPrefix(flag, name+"="):
			value = []string{strings.TrimPrefix(flag, name+"=")}
		case flag == name && i+1 < len(args):
			value = []string{args[i+1]}
			i++
		case flag == name:
			value = []string{""}
		}
	}
	return value
}

func TestLastFlagValue(t *testing.T) {
	assert.Equal(t, []string{"OpenShift"}, lastFlagValue([]string{"--platform-type=XKS", "-platform-type", "OpenShift"}, "platform-type"))
	assert.Equal(t, []string{"XKS"}, lastFlagValue([]string{"--platform-type", "XKS"}, "platform-type"))
	assert.Nil(t, lastFlagValue([]string{"--auth-token-headers=a"}, "auth-token-header"))
	assert.Equal(t, []string{"XKS"}, lastFlagValue([]string{"--platform-type=XKS", "--", "--platform-type=OpenShift"}, "platform-type"))
	assert.Equal(t, []string{"XKS"}, lastFlagValue([]string{"--platform-type=XKS", "extra", "--platform-type=OpenShift"}, "platform-type"))
}

// contractGrants parses the first table under contractSection. Each row is
// "| `resource` (`group`) or (core)[, scope note] | `verb`, `verb` | why |". A
// scope note of exactly "cluster-wide" right after the group makes the row a
// cluster-scoped grant; every other row is namespaced to the dashboard
// namespace.
func contractGrants(t *testing.T) []grant {
	t.Helper()
	raw, err := os.ReadFile(filepath.Clean(bootstrapContract))
	require.NoError(t, err)
	return parseContract(t, raw)
}

func parseContract(t *testing.T, raw []byte) []grant {
	t.Helper()

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
	// The group is the parenthesis right after the leading `resource`.
	// A cluster-scoped row says so right after the group: "(`group`), cluster-wide".
	clusterWide := regexp.MustCompile("^`[^`]+`\\s*\\([^)]*\\),\\s*cluster-wide\\b")
	groupCell := regexp.MustCompile("^`[^`]+`\\s*(\\(core\\)|\\(`([^`]+)`\\))")
	var out []grant
	for _, row := range rows[2:] {
		require.GreaterOrEqual(t, len(row), 2, "malformed row %q", row)
		names := code.FindAllStringSubmatch(row[0], -1)
		require.NotEmpty(t, names, "row %q names no resource", row[0])
		g := grant{resource: names[0][1], cluster: clusterWide.MatchString(row[0])}
		switch m := groupCell.FindStringSubmatch(row[0]); {
		case m == nil:
			require.Failf(t, "no API group", "row %q must give the API group right after the resource, as (`group`) or (core)", row[0])
		case m[1] == "(core)":
			g.group = ""
		default:
			g.group = m[2]
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

func TestParseContract(t *testing.T) {
	doc := []byte(contractSection + `

| Resource | Verbs | Needed for |
| --- | --- | --- |
| ` + "`configmaps` (core), labelled `opendatahub.io/connection-type`" + ` | ` + "`get`, `list`" + ` | not cluster-wide |
| ` + "`tokenreviews` (`authentication.k8s.io`), cluster-wide" + ` | ` + "`create`" + ` | proxy |

## Next
| ` + "`secrets` (core)" + ` | ` + "`get`" + ` | outside the section |
`)
	assert.Equal(t, []grant{
		{cluster: true, group: "authentication.k8s.io", resource: "tokenreviews", verb: "create"},
		{resource: "configmaps", verb: "get"},
		{resource: "configmaps", verb: "list"},
	}, parseContract(t, doc))
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
	// Allowlist: any other kustomization feature (patches, components,
	// transformers, images, namespace, ...) could change what the files say.
	allowed := map[string]bool{"apiVersion": true, "kind": true, "resources": true, "configMapGenerator": true,
		"generatorOptions": true, "labels": true, "replacements": true}
	for key := range k {
		require.True(t, allowed[key], "the RBAC guard reads the bundle's resource files; extend it before using %q", key)
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

	var reps []replacement
	if raw, ok := k["replacements"]; ok {
		js, err := json.Marshal(raw)
		require.NoError(t, err)
		require.NoError(t, json.Unmarshal(js, &reps))
	}
	require.Empty(t, replacementViolations(b, reps), "the bundle's replacements break the guard rules")
	return b
}

// replacement is the part of a kustomize replacement the guard inspects.
type replacement struct {
	Source struct {
		Kind      string `json:"kind"`
		Name      string `json:"name"`
		FieldPath string `json:"fieldPath"`
	} `json:"source"`
	Targets []replacementTarget `json:"targets"`
}

type replacementTarget struct {
	Select struct {
		Kind string `json:"kind"`
		Name string `json:"name"`
	} `json:"select"`
	FieldPaths []string `json:"fieldPaths"`
}

var deploymentImagePath = regexp.MustCompile(`^spec\.template\.spec\.(init)?[cC]ontainers\.\[name=[a-z0-9-]+\]\.image$`)

// replacementViolations allows a replacement to touch RBAC objects only to
// fill in a binding's ServiceAccount subject namespace, and requires every
// binding subject to carry the placeholder such a replacement rewrites. A
// hard-coded subject namespace would bind a ServiceAccount the installer
// never creates, so the deployed one would get nothing.
func replacementViolations(b bundle, reps []replacement) []string {
	const placeholder = "rhaii-dashboard-namespace"
	subjectPath := "subjects.[name=" + b.sa + "].namespace"
	rbacKinds := map[string]bool{"Role": true, "ClusterRole": true, "RoleBinding": true, "ClusterRoleBinding": true}
	filled := map[string]bool{}
	var violations []string
	for _, r := range reps {
		for _, target := range r.Targets {
			kind := target.Select.Kind
			if kind == "" {
				violations = append(violations, fmt.Sprintf("a replacement from %s/%s selects targets without a kind", r.Source.Kind, r.Source.Name))
				continue
			}
			if kind == "Deployment" {
				// Only the image may come from params: anything else in the pod
				// template (serviceAccountName, automount, args, env) changes
				// who the pod runs as or which contract it follows.
				for _, fp := range target.FieldPaths {
					if !deploymentImagePath.MatchString(fp) {
						violations = append(violations, fmt.Sprintf("a replacement rewrites %s Deployment/%s; only container images may be replaced", fp, target.Select.Name))
					}
				}
				continue
			}
			if kind == "ServiceAccount" {
				violations = append(violations, fmt.Sprintf("a replacement rewrites ServiceAccount/%s", target.Select.Name))
				continue
			}
			if !rbacKinds[kind] {
				continue
			}
			for _, fp := range target.FieldPaths {
				if (kind == "RoleBinding" || kind == "ClusterRoleBinding") && fp == subjectPath &&
					r.Source.Kind == "ConfigMap" && r.Source.FieldPath == "data."+placeholder {
					filled[kind+"/"+target.Select.Name] = true
					continue
				}
				violations = append(violations, fmt.Sprintf("a replacement rewrites %s %s/%s", fp, kind, target.Select.Name))
			}
		}
	}
	check := func(kind, name string, subjects []rbacv1.Subject) {
		for _, s := range subjects {
			if s.Namespace != placeholder {
				violations = append(violations, fmt.Sprintf("%s/%s subject %q has namespace %q, not the %q placeholder", kind, name, s.Name, s.Namespace, placeholder))
			}
		}
		if !filled[kind+"/"+name] {
			violations = append(violations, fmt.Sprintf("no replacement fills %s in %s/%s from data.%s", subjectPath, kind, name, placeholder))
		}
	}
	for _, rb := range b.roleBindings {
		check("RoleBinding", rb.Name, rb.Subjects)
	}
	for _, crb := range b.clusterRoleBindings {
		check("ClusterRoleBinding", crb.Name, crb.Subjects)
	}
	return violations
}

func TestReplacementViolations(t *testing.T) {
	rb := rbacv1.RoleBinding{ObjectMeta: roleMeta(dashboardName), Subjects: []rbacv1.Subject{{Kind: rbacv1.ServiceAccountKind, Name: dashboardName, Namespace: "rhaii-dashboard-namespace"}}}
	b := bundle{sa: dashboardName, roleBindings: []rbacv1.RoleBinding{rb}}
	rep := func(kind, fieldPath string) replacement {
		var r replacement
		r.Source.Kind, r.Source.Name, r.Source.FieldPath = "ConfigMap", "rhaii-dashboard-params", "data.rhaii-dashboard-namespace"
		target := replacementTarget{FieldPaths: []string{fieldPath}}
		target.Select.Kind, target.Select.Name = kind, dashboardName
		r.Targets = []replacementTarget{target}
		return r
	}
	subject := rep("RoleBinding", "subjects.[name=rhaii-dashboard].namespace")

	assert.Empty(t, replacementViolations(b, []replacement{subject}))
	assert.NotEmpty(t, replacementViolations(b, nil), "an unfilled subject namespace is a violation")
	assert.NotEmpty(t, replacementViolations(b, []replacement{subject, rep("Role", "rules.0.verbs")}), "rewriting rules is a violation")
	assert.NotEmpty(t, replacementViolations(b, []replacement{subject, rep("", "metadata.name")}), "a kind-less selector is a violation")

	image := rep("Deployment", "spec.template.spec.containers.[name=rhaii-dashboard].image")
	assert.Empty(t, replacementViolations(b, []replacement{subject, image}))
	for _, fp := range []string{
		"spec.template.spec.serviceAccountName",
		"spec.template.spec.automountServiceAccountToken",
		"spec.template.spec.containers.[name=rhaii-dashboard].args.4",
		"spec.template.spec.containers.[name=rhaii-dashboard].env.0.value",
	} {
		assert.NotEmpty(t, replacementViolations(b, []replacement{subject, rep("Deployment", fp)}), fp)
	}
	assert.NotEmpty(t, replacementViolations(b, []replacement{subject, rep("ServiceAccount", "metadata.name")}))

	hardCoded := bundle{sa: dashboardName, roleBindings: []rbacv1.RoleBinding{rb}}
	hardCoded.roleBindings[0].Subjects = []rbacv1.Subject{{Kind: rbacv1.ServiceAccountKind, Name: dashboardName, Namespace: "opendatahub"}}
	assert.NotEmpty(t, replacementViolations(hardCoded, []replacement{subject}), "a hard-coded subject namespace is a violation")
}

func decodeInto(t *testing.T, path string, b *bundle) {
	t.Helper()
	f, err := os.Open(filepath.Clean(path))
	require.NoError(t, err)
	defer f.Close()
	dec := yaml.NewYAMLOrJSONDecoder(f, 4096)
	for {
		var doc map[string]any
		err := dec.Decode(&doc)
		if errors.Is(err, io.EOF) {
			return
		}
		require.NoError(t, err, path)
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
		case "List", "RoleList", "ClusterRoleList", "RoleBindingList", "ClusterRoleBindingList":
			require.Failf(t, "list document", "%s in %s hides its items from the guard; ship one object per document", doc["kind"], path)
		case "StatefulSet", "DaemonSet", "Job", "CronJob", "Pod", "ReplicaSet":
			require.Failf(t, "unexpected workload", "%s in %s runs with a service account the guard does not check", doc["kind"], path)
		}
	}
}
