package repositories

import (
	"context"
	"errors"
	"sort"
	"sync"
	"time"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const (
	// MaxRequestedNamespaces bounds the caller-supplied candidates per request.
	MaxRequestedNamespaces = 50
	// MaxDiscoveryCandidates bounds the namespaces evaluated per request when
	// they come from configured candidates or label discovery. A caller who may
	// list namespaces has every listed namespace evaluated instead, so the
	// result keeps the namespaces they could already list; that request is
	// bounded by the review concurrency, the client rate limit and the deadline.
	MaxDiscoveryCandidates = 200
	// DiscoveryTimeout bounds one discovery request, below the server's 60s
	// write timeout. Reviews still pending at the deadline count as failed.
	DiscoveryTimeout = 25 * time.Second
	// accessReviewConcurrency bounds in-flight SelfSubjectAccessReviews per request.
	accessReviewConcurrency = 16

	groupServing        = "serving.kserve.io"
	groupInfrastructure = "infrastructure.opendatahub.io"
	groupRBAC           = "rbac.authorization.k8s.io"
)

// ErrNamespaceDiscoveryUnavailable means discovery found nothing because every
// source or review failed. It is distinct from an empty, successful result.
var ErrNamespaceDiscoveryUnavailable = errors.New("namespace discovery unavailable")

// ErrNamespaceAccessReviewFailed means a single-namespace lookup could not be
// decided because its reviews failed. It is distinct from a denial.
var ErrNamespaceAccessReviewFailed = errors.New("namespace access review failed")

// ErrNamespaceNotFound means the caller may read the namespace and it does not exist.
var ErrNamespaceNotFound = errors.New("namespace not found")

// accessCheck is one entry of the per-namespace permission matrix.
type accessCheck struct {
	Group    string
	Resource string
	Verbs    []string
}

// actionPermissionMatrix holds the reviews the actions are derived from (see
// DeriveNamespaceActions). They run first: a namespace where none of them
// enables an action is not returned, so its remaining reviews are skipped.
var actionPermissionMatrix = []accessCheck{
	{Group: groupServing, Resource: "llminferenceservices", Verbs: []string{"get", "list", "watch", "create", "update", "patch", "delete"}},
	// Editing reads the deployment's namespace-local config (its baseRefs),
	// its token Secrets, and its Hugging Face token ServiceAccount and Secret;
	// saving without them would drop them. Saving also writes that config copy
	// back (update, or patch on overwrite).
	{Group: groupServing, Resource: "llminferenceserviceconfigs", Verbs: []string{"get", "list", "watch", "update", "patch"}},
	// Token authentication: the token Secrets (listed, created, replaced,
	// deleted), and the ServiceAccount, Role and RoleBinding the wizard gets
	// and creates if missing.
	{Group: "", Resource: "secrets", Verbs: []string{"create", "get", "list", "update", "delete"}},
	{Group: "", Resource: "serviceaccounts", Verbs: []string{"get", "create"}},
	{Group: groupRBAC, Resource: "roles", Verbs: []string{"get", "create"}},
	{Group: groupRBAC, Resource: "rolebindings", Verbs: []string{"get", "create"}},
}

// detailPermissionMatrix completes the matrix for namespaces that are
// returned: the optional reads behind deployment status.
var detailPermissionMatrix = []accessCheck{
	{Group: "", Resource: "pods", Verbs: []string{"get", "list"}},
}

// namespacePermissionMatrix is the exact set of reviews reported for every
// returned namespace, evaluated as the caller in that namespace. It is
// documented in docs/namespace-discovery-contract.md; keep the two in step.
var namespacePermissionMatrix = append(append([]accessCheck{}, actionPermissionMatrix...), detailPermissionMatrix...)

// sharedNamespacePermissionMatrix is evaluated once, in the dashboard namespace,
// for the shared resources the RHAII wizard reads from there.
var sharedNamespacePermissionMatrix = []accessCheck{
	{Group: groupInfrastructure, Resource: "hardwareprofiles", Verbs: []string{"get", "list"}},
	{Group: groupServing, Resource: "llminferenceserviceconfigs", Verbs: []string{"get", "list"}},
}

// PermissionKey is the wire key for a group/resource pair.
func PermissionKey(group, resource string) string {
	if group == "" {
		group = "core"
	}
	return group + "/" + resource
}

// NamespaceAccessRepository resolves the namespaces a caller can use on xKS and
// what they can do in each, without a cluster-wide namespace list permission.
//
// Every decision is made by a SelfSubjectAccessReview as the caller. Candidate
// sources only propose names; none of them grants anything.
type NamespaceAccessRepository struct {
	candidates        []string
	labelSelector     string
	saClientset       kubernetes.Interface
	sharedNamespace   string
	reviewConcurrency int
	timeout           time.Duration
}

// NewNamespaceAccessRepository builds the repository. saClientset is used only
// when labelSelector is non-empty.
func NewNamespaceAccessRepository(candidates []string, labelSelector string, saClientset kubernetes.Interface, sharedNamespace string) *NamespaceAccessRepository {
	return &NamespaceAccessRepository{
		candidates:        candidates,
		labelSelector:     labelSelector,
		saClientset:       saClientset,
		sharedNamespace:   sharedNamespace,
		reviewConcurrency: accessReviewConcurrency,
		timeout:           DiscoveryTimeout,
	}
}

type issueCounter map[string]int

func (c issueCounter) add(code string, n int) {
	if n > 0 {
		c[code] += n
	}
}

func (c issueCounter) list() []models.NamespaceDiscoveryIssue {
	out := make([]models.NamespaceDiscoveryIssue, 0, len(c))
	for code, n := range c {
		out = append(out, models.NamespaceDiscoveryIssue{Code: code, Count: n})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })
	return out
}

// Discover returns the caller's authorized namespaces. requested are names the
// client already knows (manual entry, remembered selections); they are
// evaluated like any other candidate.
func (r *NamespaceAccessRepository) Discover(ctx context.Context, client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity, requested []string) (models.NamespaceAccessList, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	issues := issueCounter{}
	source := models.NamespaceSourceCandidates
	known := knownNamespaces{byCaller: map[string]*corev1.Namespace{}, bySA: map[string]*corev1.Namespace{}}
	// Requested names are evaluated first so truncation never drops them.
	var names []string
	seen := map[string]bool{}
	for _, name := range requested {
		if !seen[name] {
			seen[name] = true
			names = append(names, name)
		}
	}
	var others []string
	addName := func(name string) {
		if !seen[name] {
			seen[name] = true
			others = append(others, name)
		}
	}

	// A caller who may list namespaces cluster-wide gets the list they can see.
	// The cluster-scoped review has no namespace, so only cluster-wide grants allow it.
	listReview, err := client.ReviewAccess(ctx, identity, k8s.AccessReviewAttributes{Verb: "list", Resource: "namespaces"})
	switch decision := reviewDecision(listReview, err); decision {
	case models.AccessError:
		issues.add(models.IssueClusterListReviewFailed, 1)
	case models.AccessAllowed:
		listed, listErr := client.GetNamespaces(ctx, identity)
		if listErr != nil {
			issues.add(models.IssueClusterListFailed, 1)
			break
		}
		source = models.NamespaceSourceClusterList
		for i := range listed {
			known.byCaller[listed[i].Name] = &listed[i]
			addName(listed[i].Name)
		}
		// The caller's own list is authoritative for what exists: a requested
		// name absent from it is dropped rather than reported from cluster-wide
		// grants as if it existed.
		kept := names[:0]
		for _, name := range names {
			if known.byCaller[name] != nil {
				kept = append(kept, name)
			}
		}
		names = kept
	}

	if source == models.NamespaceSourceCandidates {
		for _, name := range r.candidates {
			addName(name)
		}
		if r.labelSelector != "" && r.saClientset != nil {
			// The one service-account exception: it proposes names only. The
			// namespaces it reads are returned to the caller solely after the
			// caller's own reviews below authorize them.
			list, listErr := r.saClientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{LabelSelector: r.labelSelector})
			if listErr != nil {
				issues.add(models.IssueLabelDiscoveryFailed, 1)
			} else {
				for i := range list.Items {
					known.bySA[list.Items[i].Name] = &list.Items[i]
					addName(list.Items[i].Name)
				}
			}
		}
	}
	sort.Strings(others)
	names = append(names, others...)
	if source == models.NamespaceSourceCandidates && len(names) > MaxDiscoveryCandidates {
		issues.add(models.IssueCandidatesTruncated, len(names)-MaxDiscoveryCandidates)
		names = names[:MaxDiscoveryCandidates]
	}

	lim := r.newLimiter()
	results := make([]evaluated, len(names))
	// A bounded pool keeps a caller's uncapped cluster list from starting a
	// goroutine per namespace. Once the request is cancelled or its deadline
	// passes, namespaces not yet started are reported as failed reviews, as
	// their reviews would have failed.
	forEachBounded(ctx, len(names), r.namespaceWorkers(), func(i int) {
		results[i] = r.evaluate(ctx, lim, client, identity, names[i], known)
	}, func(i int) {
		results[i] = evaluated{outcome: outcomeReviewFailed, failed: 1}
	})

	namespaces := make([]models.NamespaceAccess, 0, len(results))
	// decided counts candidates with a reliable answer, denials included: one
	// reliable denial makes an empty result partial, not unavailable.
	decided := 0
	for _, res := range results {
		switch res.outcome {
		case outcomeAuthorized:
			namespaces = append(namespaces, res.access)
			decided++
		case outcomeDenied, outcomeNotFound:
			decided++
		}
		// A returned namespace can still have failed reviews (its affected
		// actions are off), so failures are counted whatever the outcome.
		if res.failed > 0 {
			issues.add(models.IssueAccessReviewFailed, 1)
		}
		if res.readFailed {
			issues.add(models.IssueNamespaceReadFailed, 1)
		}
	}
	sort.Slice(namespaces, func(i, j int) bool { return namespaces[i].Name < namespaces[j].Name })

	// Unavailable means nothing could be decided at all. It is computed before
	// the shared reads: they are not a discovery source, so their failure alone
	// never turns a result into 503.
	unavailable := decided == 0 && len(issues) > 0 && !onlyTruncated(issues)

	sharedPerms, sharedFailed := r.runMatrix(ctx, lim, client, identity, r.sharedNamespace, sharedNamespacePermissionMatrix)
	issues.add(models.IssueSharedAccessReviewFailed, sharedFailed)
	if ctx.Err() != nil {
		issues.add(models.IssueDiscoveryDeadlineExceeded, 1)
	}
	shared := models.SharedNamespaceAccess{Namespace: r.sharedNamespace, Permissions: sharedPerms}
	out := models.NamespaceAccessList{
		Source:     source,
		Complete:   len(issues) == 0,
		Issues:     issues.list(),
		Namespaces: namespaces,
		Shared:     shared,
	}
	if unavailable {
		return out, ErrNamespaceDiscoveryUnavailable
	}
	return out, nil
}

func onlyTruncated(issues issueCounter) bool {
	_, truncated := issues[models.IssueCandidatesTruncated]
	return truncated && len(issues) == 1
}

// Get evaluates one namespace for the manual-entry fallback. A namespace the
// caller cannot use returns ErrNamespaceAccessDenied whether or not it exists.
func (r *NamespaceAccessRepository) Get(ctx context.Context, client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity, name string) (models.NamespaceAccess, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()
	lim := r.newLimiter()
	res := r.evaluate(ctx, lim, client, identity, name, knownNamespaces{})
	if ctx.Err() != nil {
		// Reviews left pending at the deadline were not decided; a lookup
		// does not report a half-evaluated namespace as a success.
		return models.NamespaceAccess{}, ErrNamespaceAccessReviewFailed
	}
	switch res.outcome {
	case outcomeAuthorized:
		return res.access, nil
	case outcomeReviewFailed:
		return models.NamespaceAccess{}, ErrNamespaceAccessReviewFailed
	case outcomeNotFound:
		return models.NamespaceAccess{}, ErrNamespaceNotFound
	default:
		return models.NamespaceAccess{}, ErrNamespaceAccessDenied
	}
}

type outcome int

const (
	outcomeDenied outcome = iota
	outcomeAuthorized
	outcomeReviewFailed
	outcomeNotFound
)

type evaluated struct {
	outcome outcome
	access  models.NamespaceAccess
	// failed counts the reviews that could not be decided.
	failed int
	// readFailed: the caller may read the namespace, but reading it failed.
	readFailed bool
}

// knownNamespaces holds Namespace objects discovery already read. byCaller came
// from the caller's own list; bySA from the service-account label enumeration
// and is used only when the caller may read the namespace itself.
type knownNamespaces struct {
	byCaller map[string]*corev1.Namespace
	bySA     map[string]*corev1.Namespace
}

// evaluate reviews one namespace as the caller. Every review names the
// namespace: authorizers such as webhooks may decide per namespace, so a
// cluster-wide answer is never reused for it.
func (r *NamespaceAccessRepository) evaluate(ctx context.Context, lim limiter, client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity, name string, known knownNamespaces) evaluated {
	perms, failed := r.runMatrix(ctx, lim, client, identity, name, actionPermissionMatrix)
	actions := DeriveNamespaceActions(perms)
	if !actions.Any() {
		// The failed reviews matter only if one of them could have enabled an
		// action. When no action is possible even with every failed review
		// allowed, the denial is definitive and the failures are just reported.
		if failed > 0 && optimisticActions(perms).Any() {
			return evaluated{outcome: outcomeReviewFailed, failed: failed}
		}
		return evaluated{outcome: outcomeDenied, failed: failed}
	}
	detail, detailFailed := r.runMatrix(ctx, lim, client, identity, name, detailPermissionMatrix)
	failed += detailFailed
	for key, verbs := range detail {
		if perms[key] == nil {
			perms[key] = models.ResourcePermissions{}
		}
		for verb, d := range verbs {
			perms[key][verb] = d
		}
	}

	access := models.NamespaceAccess{Name: name, Actions: actions, Permissions: perms}
	readFailed := false

	ns := known.byCaller[name]
	nsKey := PermissionKey("", "namespaces")
	// The caller's own named get, with the namespace attribute the API server
	// sets for GET /api/v1/namespaces/<name>. Service-account metadata is used
	// only when this review allows it.
	var getReview k8s.AccessReviewResult
	var err error
	lim.do(func() {
		getReview, err = client.ReviewAccess(ctx, identity, k8s.AccessReviewAttributes{Verb: "get", Resource: "namespaces", Namespace: name, Name: name})
	})
	switch reviewDecision(getReview, err) {
	case models.AccessError:
		perms[nsKey] = models.ResourcePermissions{"get": models.AccessError}
		failed++
	case models.AccessAllowed:
		perms[nsKey] = models.ResourcePermissions{"get": models.AccessAllowed}
		if ns == nil {
			ns = known.bySA[name]
		}
		if ns != nil {
			break
		}
		var got *corev1.Namespace
		var getErr error
		lim.do(func() { got, getErr = client.GetNamespace(ctx, identity, name) })
		if k8serrors.IsNotFound(getErr) {
			return evaluated{outcome: outcomeNotFound, failed: failed}
		}
		switch {
		case getErr == nil && got != nil:
			ns = got
		case getErr != nil:
			// The caller may read it, so an Unknown phase here is a failed read,
			// not a missing permission; report it.
			readFailed = true
		}
	default:
		perms[nsKey] = models.ResourcePermissions{"get": models.AccessDenied}
	}
	access.Phase = models.NamespacePhaseUnknown
	if ns != nil {
		m := models.NewNamespaceModelFromNamespace(*ns)
		access.DisplayName = m.DisplayName
		isAi := m.IsAiProject
		access.IsAiProject = &isAi
		if m.Phase != "" {
			access.Phase = m.Phase
		}
	}
	return evaluated{outcome: outcomeAuthorized, access: access, failed: failed, readFailed: readFailed}
}

// optimisticActions derives the actions as if every failed review had been
// allowed: the most a retry could enable.
func optimisticActions(perms map[string]models.ResourcePermissions) models.NamespaceActions {
	optimistic := make(map[string]models.ResourcePermissions, len(perms))
	for key, verbs := range perms {
		p := make(models.ResourcePermissions, len(verbs))
		for verb, d := range verbs {
			if d == models.AccessError {
				d = models.AccessAllowed
			}
			p[verb] = d
		}
		optimistic[key] = p
	}
	return DeriveNamespaceActions(optimistic)
}

// DeriveNamespaceActions maps the permission matrix to UI actions. An action is
// enabled only when every review it needs was allowed: errors fail closed.
func DeriveNamespaceActions(perms map[string]models.ResourcePermissions) models.NamespaceActions {
	allowed := func(group, resource string, verbs ...string) bool {
		p := perms[PermissionKey(group, resource)]
		for _, v := range verbs {
			if p[v] != models.AccessAllowed {
				return false
			}
		}
		return true
	}
	// View lists and gets the models; the page's watch falls back to polling
	// the list when watch is denied, so watch is reported but not required.
	// Edit saves with update, or patch when overwriting. The edit wizard first
	// reads the deployment's config, its token Secrets and its Hugging Face
	// token ServiceAccount and Secret: without them it cannot load the
	// deployment, and saving would drop its config reference or its tokens.
	// Saving writes the deployment's config copy too. As with the models, the
	// page's config watch falls back to polling the list, so watch on configs
	// is reported but not required.
	// Start and Stop only patch an annotation.
	// Token authentication on a new deployment gets or creates the
	// ServiceAccount, Role and RoleBinding and creates the token Secrets, whose
	// owner reference is set in the object itself. Creating that Role is
	// subject to RBAC escalation prevention: it grants get on the model, which
	// the caller must hold. Managing the tokens of an existing deployment also
	// lists them, replaces them (update) and deletes removed ones.
	createTokens := allowed(groupServing, "llminferenceservices", "get") &&
		allowed("", "secrets", "create") &&
		allowed("", "serviceaccounts", "get", "create") &&
		allowed(groupRBAC, "roles", "get", "create") &&
		allowed(groupRBAC, "rolebindings", "get", "create")
	return models.NamespaceActions{
		View:   allowed(groupServing, "llminferenceservices", "list", "get"),
		Deploy: allowed(groupServing, "llminferenceservices", "create"),
		Edit: allowed(groupServing, "llminferenceservices", "patch", "update") &&
			allowed(groupServing, "llminferenceserviceconfigs", "get", "list", "update", "patch") &&
			allowed("", "secrets", "get", "list") &&
			allowed("", "serviceaccounts", "get"),
		StartStop:       allowed(groupServing, "llminferenceservices", "patch"),
		Delete:          allowed(groupServing, "llminferenceservices", "delete"),
		CreateTokenAuth: createTokens,
		ManageTokenAuth: createTokens && allowed("", "secrets", "list", "update", "delete"),
	}
}

// reviewDecision maps a review to the wire decision. A failed request and an
// indeterminate review (an authorizer error with no decision) are both errors,
// never denials and never grants.
func reviewDecision(res k8s.AccessReviewResult, err error) models.AccessDecision {
	switch {
	case err != nil, res == k8s.AccessReviewIndeterminate:
		return models.AccessError
	case res == k8s.AccessReviewAllowed:
		return models.AccessAllowed
	default:
		return models.AccessDenied
	}
}

// runMatrix reviews matrix in namespace, as the caller.
func (r *NamespaceAccessRepository) runMatrix(ctx context.Context, lim limiter, client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity, namespace string, matrix []accessCheck) (map[string]models.ResourcePermissions, int) {
	type job struct{ group, resource, verb string }
	var jobs []job
	for _, c := range matrix {
		for _, v := range c.Verbs {
			jobs = append(jobs, job{c.Group, c.Resource, v})
		}
	}
	decisions := make([]models.AccessDecision, len(jobs))
	forEach(len(jobs), func(i int) {
		j := jobs[i]
		var res k8s.AccessReviewResult
		var err error
		lim.do(func() {
			res, err = client.ReviewAccess(ctx, identity, k8s.AccessReviewAttributes{Verb: j.verb, Group: j.group, Resource: j.resource, Namespace: namespace})
		})
		decisions[i] = reviewDecision(res, err)
	})

	perms := map[string]models.ResourcePermissions{}
	failed := 0
	for i, j := range jobs {
		key := PermissionKey(j.group, j.resource)
		if perms[key] == nil {
			perms[key] = models.ResourcePermissions{}
		}
		perms[key][j.verb] = decisions[i]
		if decisions[i] == models.AccessError {
			failed++
		}
	}
	return perms, failed
}

// limiter bounds the API calls one request has in flight, across every
// namespace it evaluates.
type limiter chan struct{}

func (r *NamespaceAccessRepository) newLimiter() limiter {
	n := r.reviewConcurrency
	if n < 1 {
		n = 1
	}
	return make(limiter, n)
}

func (l limiter) do(fn func()) {
	l <- struct{}{}
	defer func() { <-l }()
	fn()
}

// namespaceWorkers is how many namespaces one request evaluates at a time.
// Each runs its reviews concurrently through the shared limiter, so this only
// bounds goroutines, not API load.
func (r *NamespaceAccessRepository) namespaceWorkers() int {
	if r.reviewConcurrency < 1 {
		return 1
	}
	return r.reviewConcurrency
}

// forEachBounded runs fn for 0..n-1 on at most workers goroutines. Indices not
// started before ctx is done get skipped instead.
func forEachBounded(ctx context.Context, n, workers int, fn, skipped func(int)) {
	if workers > n {
		workers = n
	}
	next := make(chan int)
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range next {
				fn(i)
			}
		}()
	}
	for i := 0; i < n; i++ {
		if ctx.Err() != nil {
			skipped(i)
			continue
		}
		select {
		case next <- i:
		case <-ctx.Done():
			skipped(i)
		}
	}
	close(next)
	wg.Wait()
}

// forEach runs fn for 0..n-1 concurrently. API calls inside fn go through the
// request's limiter, which is what bounds the load on the API server.
func forEach(n int, fn func(int)) {
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			fn(i)
		}(i)
	}
	wg.Wait()
}
