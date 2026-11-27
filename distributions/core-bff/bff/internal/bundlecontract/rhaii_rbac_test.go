package bundlecontract

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
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
	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/kyaml/filesys"
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
	require.Empty(t, namespaceViolations(b), "the RHAII bundle's bindings do not reach the installed ServiceAccount")

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

	// The service-account reads target the dashboard namespace, where the Role
	// is bound: NAMESPACE must be the pod's own namespace (bootstrap contract).
	assert.Nil(t, lastFlagValue(args, "namespace"), "--namespace would override the pod's own namespace")
	var namespaceFromPod bool
	for _, e := range c.Env {
		if e.Name == "NAMESPACE" {
			namespaceFromPod = e.ValueFrom != nil && e.ValueFrom.FieldRef != nil && e.ValueFrom.FieldRef.FieldPath == "metadata.namespace"
		}
	}
	assert.True(t, namespaceFromPod, "NAMESPACE must come from the Downward API metadata.namespace")
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
	namespaced          []string
	configMaps          []corev1.ConfigMap
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

// loadBundle renders the bundle with kustomize, in process, and returns the
// rendered objects. The guard checks what an installer applies, not the source
// files, so every kustomization feature (replacements, patches, generators,
// regex selectors, List expansion) is already applied.
func loadBundle(t *testing.T) bundle {
	t.Helper()
	return renderBundle(t, filesys.MakeFsOnDisk(), bundleDir)
}

func renderBundle(t *testing.T, fs filesys.FileSystem, dir string) bundle {
	t.Helper()
	resMap, err := krusty.MakeKustomizer(krusty.MakeDefaultOptions()).Run(fs, dir)
	require.NoError(t, err, "kustomize build %s", dir)

	b := bundle{}
	for _, res := range resMap.Resources() {
		js, err := res.MarshalJSON()
		require.NoError(t, err)
		decodeObject(t, res.GetKind(), js, &b)
		if ns := res.GetNamespace(); ns != "" {
			b.namespaced = append(b.namespaced, res.GetKind()+"/"+res.GetName()+" in "+ns)
		}
	}
	require.Len(t, b.deployments, 1, "the bundle must ship exactly one Deployment")
	b.sa = b.deployments[0].Spec.Template.Spec.ServiceAccountName
	require.NotEmpty(t, b.sa)
	return b
}

func decodeObject(t *testing.T, kind string, js []byte, b *bundle) {
	t.Helper()
	switch kind {
	case "Deployment":
		var d appsv1.Deployment
		require.NoError(t, json.Unmarshal(js, &d))
		b.deployments = append(b.deployments, d)
	case "ConfigMap":
		var cm corev1.ConfigMap
		require.NoError(t, json.Unmarshal(js, &cm))
		b.configMaps = append(b.configMaps, cm)
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
	case "StatefulSet", "DaemonSet", "Job", "CronJob", "Pod", "ReplicaSet", "ReplicationController":
		require.Failf(t, "unexpected workload", "%s runs with a service account the guard does not check", kind)
	}
}

// namespaceViolations checks the binding wiring an installer relies on. The
// bundle is namespace-neutral, so an object that names its own namespace
// would be applied there instead of where the installer puts the bundle, and
// a binding subject must name the namespace the installer configures
// (rhaii-dashboard-params data.rhaii-dashboard-namespace); otherwise the Role
// binds a ServiceAccount that does not exist and the deployed one gets nothing.
func namespaceViolations(b bundle) []string {
	var violations []string
	for _, n := range b.namespaced {
		violations = append(violations, n+": the bundle must stay namespace-neutral")
	}
	want := ""
	for _, cm := range b.configMaps {
		if cm.Name == "rhaii-dashboard-params" {
			want = cm.Data["rhaii-dashboard-namespace"]
		}
	}
	if want == "" {
		return append(violations, "rhaii-dashboard-params has no rhaii-dashboard-namespace")
	}
	check := func(kind, name string, subjects []rbacv1.Subject) {
		for _, s := range subjects {
			if s.Namespace != want {
				violations = append(violations, fmt.Sprintf("%s/%s subject %q has namespace %q, not the configured %q", kind, name, s.Name, s.Namespace, want))
			}
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

// Kustomize applies replacements, regex selectors and external replacement
// files before anything is installed; a source-file reading of the bundle
// misses them. Each case overlays the real bundle with one such change and
// expects the rendered guard to see it.
func TestRenderedGuard_SeesKustomizeTransformations(t *testing.T) {
	overlay := func(t *testing.T, kustomization string, extra map[string]string) bundle {
		t.Helper()
		fs := filesys.MakeFsInMemory()
		require.NoError(t, copyDirInto(fs, bundleDir, "/bundle"))
		require.NoError(t, fs.WriteFile("/overlay/kustomization.yaml", []byte(kustomization)))
		for name, body := range extra {
			require.NoError(t, fs.WriteFile("/overlay/"+name, []byte(body)))
		}
		return renderBundle(t, fs, "/overlay")
	}
	const head = "apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources:\n  - ../bundle\n"

	t.Run("regex kind selector widens the Role", func(t *testing.T) {
		b := overlay(t, head+`configMapGenerator:
  - name: widen
    literals: [resource=secrets]
replacements:
  - source: {kind: ConfigMap, name: widen, fieldPath: data.resource}
    targets:
      - select: {kind: Rol., name: rhaii-dashboard}
        fieldPaths: [rules.0.resources.0]
`, nil)
		got, violations := serviceAccountGrants(b)
		require.Empty(t, violations)
		assert.Contains(t, difference(got, contractGrants(t)), "get secrets.core (namespaced)")
	})

	t.Run("external replacement file swaps the ServiceAccount", func(t *testing.T) {
		b := overlay(t, head+`configMapGenerator:
  - name: swap
    literals: [sa=default]
replacements:
  - path: swap.yaml
`, map[string]string{"swap.yaml": `source: {kind: ConfigMap, name: swap, fieldPath: data.sa}
targets:
  - select: {kind: Deploymen., name: rhaii-dashboard}
    fieldPaths: [spec.template.spec.serviceAccountName]
`})
		assert.Equal(t, "default", b.sa, "the rendered pod identity is what the guard compares")
	})

	t.Run("hard-coded subject namespace", func(t *testing.T) {
		b := overlay(t, head+`patches:
  - target: {kind: RoleBinding, name: rhaii-dashboard}
    patch: |
      - op: replace
        path: /subjects/0/namespace
        value: elsewhere
`, nil)
		assert.NotEmpty(t, namespaceViolations(b))
	})
}

// The guard claims to render the bundle the way the dashboard operator does,
// and kustomize semantics (regex selectors, for one) differ between versions.
// Keep the two modules on the same kustomize/api release.
func TestKustomizeMatchesTheOperator(t *testing.T) {
	version := func(path string) string {
		raw, err := os.ReadFile(filepath.Clean(path))
		require.NoError(t, err)
		m := regexp.MustCompile(`(?m)^\s*sigs\.k8s\.io/kustomize/api (v\S+)`).FindSubmatch(raw)
		require.NotNil(t, m, "%s does not require sigs.k8s.io/kustomize/api", path)
		return string(m[1])
	}
	assert.Equal(t, version("../../../../../dashboard-operator/go.mod"), version("../../go.mod"),
		"bump sigs.k8s.io/kustomize/api in distributions/core-bff/bff/go.mod to the operator's version")
}

func copyDirInto(fs filesys.FileSystem, src, dst string) error {
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(src, e.Name()))
		if err != nil {
			return err
		}
		if err := fs.WriteFile(filepath.Join(dst, e.Name()), raw); err != nil {
			return err
		}
	}
	return nil
}
