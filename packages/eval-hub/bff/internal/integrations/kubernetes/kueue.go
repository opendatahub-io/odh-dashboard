package kubernetes

import (
	"context"
	"crypto/sha256"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

const (
	kueueManagedLabel       = "kueue.x-k8s.io/managed"
	legacyKueueManagedLabel = "kueue.openshift.io/managed"
	dscGroup                = "datasciencecluster.opendatahub.io"
	dscVersion              = "v2"
	dscResource             = "datascienceclusters"
	kueueOperatorGroup      = "kueue.openshift.io"
	kueueOperatorVersion    = "v1"
	kueueOperatorResource   = "kueues"
	kueueGroup              = "kueue.x-k8s.io"
	kueueVersion            = "v1beta2"
	localQueueResource      = "localqueues"
	workloadResource        = "workloads"
	kueueAvailabilityTTL    = 15 * time.Second
	evalHubJobIDAnnotation  = "eval-hub.github.io/job_id"
	evalHubJobIDLabel       = "job_id"
)

var (
	dscGVR           = schema.GroupVersionResource{Group: dscGroup, Version: dscVersion, Resource: dscResource}
	kueueOperatorGVR = schema.GroupVersionResource{
		Group:    kueueOperatorGroup,
		Version:  kueueOperatorVersion,
		Resource: kueueOperatorResource,
	}
	localQueueGVR = schema.GroupVersionResource{Group: kueueGroup, Version: kueueVersion, Resource: localQueueResource}
	workloadGVR   = schema.GroupVersionResource{Group: kueueGroup, Version: kueueVersion, Resource: workloadResource}
	kueueCache    = newKueueAvailabilityCache(kueueAvailabilityTTL)
)

// kueueAvailabilityCache keeps the availability result briefly so the form's
// availability and HardwareProfile requests share one Kubernetes lookup. Cache
// keys contain a hash of the caller token, never the token itself, to preserve
// user-scoped authorization semantics.
type kueueAvailabilityCache struct {
	mu      sync.Mutex
	ttl     time.Duration
	entries map[string]*kueueAvailabilityCacheEntry
}

type kueueAvailabilityCacheEntry struct {
	availability *models.KueueAvailability
	err          error
	expiresAt    time.Time
	done         chan struct{}
}

func newKueueAvailabilityCache(ttl time.Duration) *kueueAvailabilityCache {
	return &kueueAvailabilityCache{
		ttl:     ttl,
		entries: make(map[string]*kueueAvailabilityCacheEntry),
	}
}

func (c *kueueAvailabilityCache) get(
	ctx context.Context,
	key string,
	load func() (*models.KueueAvailability, error),
) (*models.KueueAvailability, error) {
	now := time.Now()
	c.mu.Lock()
	if entry, found := c.entries[key]; found {
		if entry.done != nil {
			done := entry.done
			c.mu.Unlock()
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-done:
			}
			if entry.err != nil {
				return nil, entry.err
			}
			return cloneKueueAvailability(entry.availability), nil
		}
		if now.Before(entry.expiresAt) {
			availability := cloneKueueAvailability(entry.availability)
			c.mu.Unlock()
			return availability, nil
		}
		delete(c.entries, key)
	}

	entry := &kueueAvailabilityCacheEntry{done: make(chan struct{})}
	c.entries[key] = entry
	c.mu.Unlock()

	availability, err := load()

	c.mu.Lock()
	entry.availability = availability
	entry.err = err
	if err == nil {
		entry.expiresAt = time.Now().Add(c.ttl)
	}
	close(entry.done)
	entry.done = nil
	c.mu.Unlock()

	if err != nil {
		return nil, err
	}
	return cloneKueueAvailability(availability), nil
}

func cloneKueueAvailability(availability *models.KueueAvailability) *models.KueueAvailability {
	if availability == nil {
		return nil
	}
	clone := *availability
	clone.LocalQueueNames = append([]string(nil), availability.LocalQueueNames...)
	return &clone
}

func kueueAvailabilityCacheKey(namespace, token string) string {
	tokenHash := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x:%s", tokenHash, namespace)
}

func getCachedKueueAvailability(
	ctx context.Context,
	client dynamic.Interface,
	namespace, cacheKey string,
) (*models.KueueAvailability, error) {
	return kueueCache.get(ctx, cacheKey, func() (*models.KueueAvailability, error) {
		return getKueueAvailability(ctx, client, namespace)
	})
}

func newKueueAvailability(clusterEnabled, namespaceManaged bool, queueNames []string) *models.KueueAvailability {
	enabled := clusterEnabled && namespaceManaged
	return &models.KueueAvailability{
		Enabled:              enabled,
		SchedulingReady:      enabled && len(queueNames) > 0,
		ClusterEnabled:       clusterEnabled,
		NamespaceManaged:     namespaceManaged,
		LocalQueuesAvailable: len(queueNames) > 0,
		LocalQueueNames:      queueNames,
	}
}

func getKueueAvailability(ctx context.Context, client dynamic.Interface, namespace string) (*models.KueueAvailability, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	ns, err := client.Resource(schema.GroupVersionResource{Version: "v1", Resource: "namespaces"}).Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to read namespace %q: %w", namespace, err)
	}

	labels := ns.GetLabels()
	namespaceManaged := labels[kueueManagedLabel] == "true" || labels[legacyKueueManagedLabel] == "true"
	clusterEnabled, externalKueueFound, err := externalKueueAvailable(ctx, client)
	if err != nil {
		return nil, err
	}

	var queues *unstructured.UnstructuredList
	if !clusterEnabled && !externalKueueFound && namespaceManaged {
		// The Kueue operator's cluster-scoped resource may not be readable by
		// a user token. A successful namespace-scoped LocalQueue lookup still
		// proves that the Kueue API is installed, including the no-queue case.
		queues, err = client.Resource(localQueueGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
		if err != nil && !k8serrors.IsNotFound(err) {
			return nil, fmt.Errorf("failed to list LocalQueues in namespace %q: %w", namespace, err)
		}
		if err == nil {
			clusterEnabled = true
		}
	}

	if !clusterEnabled && !externalKueueFound {
		clusterEnabled, err = dataScienceClusterKueueManaged(ctx, client)
		if err != nil {
			return nil, err
		}
	}
	if !clusterEnabled || !namespaceManaged {
		return newKueueAvailability(clusterEnabled, namespaceManaged, []string{}), nil
	}

	if queues == nil {
		queues, err = client.Resource(localQueueGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return newKueueAvailability(clusterEnabled, namespaceManaged, []string{}), nil
		}
		return nil, fmt.Errorf("failed to list LocalQueues in namespace %q: %w", namespace, err)
	}
	queueNames := make([]string, 0, len(queues.Items))
	for _, queue := range queues.Items {
		queueNames = append(queueNames, queue.GetName())
	}

	return newKueueAvailability(clusterEnabled, namespaceManaged, queueNames), nil
}

// externalKueueAvailable checks the Red Hat Kueue Operator's cluster-scoped
// resource. The result is marked as found only when a Kueue resource exists;
// this lets older RHOAI-managed installations fall back to the DataScienceCluster
// management state. Forbidden and missing-resource responses are also allowed to
// use the namespace-scoped LocalQueue fallback.
func externalKueueAvailable(ctx context.Context, client dynamic.Interface) (available, found bool, err error) {
	kueues, err := client.Resource(kueueOperatorGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) || k8serrors.IsForbidden(err) {
			return false, false, nil
		}
		return false, false, fmt.Errorf("failed to list Kueue operator resources: %w", err)
	}
	if len(kueues.Items) == 0 {
		return false, false, nil
	}

	for _, kueue := range kueues.Items {
		managementState, _, _ := unstructured.NestedString(kueue.Object, "spec", "managementState")
		if managementState != "Managed" {
			continue
		}
		conditions, _, _ := unstructured.NestedSlice(kueue.Object, "status", "conditions")
		for _, rawCondition := range conditions {
			condition, ok := rawCondition.(map[string]interface{})
			if !ok {
				continue
			}
			conditionType, _ := condition["type"].(string)
			conditionStatus, _ := condition["status"].(string)
			if conditionType == "Available" && conditionStatus == "True" {
				return true, true, nil
			}
		}
	}

	return false, true, nil
}

func dataScienceClusterKueueManaged(ctx context.Context, client dynamic.Interface) (bool, error) {
	dscList, err := client.Resource(dscGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to list DataScienceClusters: %w", err)
	}

	for _, dsc := range dscList.Items {
		components, _, _ := unstructured.NestedMap(dsc.Object, "spec", "components")
		kueue, _, _ := unstructured.NestedMap(components, "kueue")
		managementState, _, _ := unstructured.NestedString(kueue, "managementState")
		if managementState == "Managed" {
			return true, nil
		}
	}
	return false, nil
}

// getKueueWorkloadStatuses lists the namespace's Kueue Workloads once, then
// matches them to the requested EvalHub evaluation IDs. EvalHub records its ID
// on the Workload's pod-template metadata; workload names are intentionally
// not used because they are generated and can be truncated.
func getKueueWorkloadStatuses(
	ctx context.Context,
	client dynamic.Interface,
	namespace string,
	evaluationIDs []string,
) (*models.KueueWorkloadStatusesResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	requested := make(map[string]struct{}, len(evaluationIDs))
	for _, evaluationID := range evaluationIDs {
		requested[evaluationID] = struct{}{}
	}

	workloads, err := client.Resource(workloadGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return &models.KueueWorkloadStatusesResponse{Items: []models.KueueWorkloadStatus{}}, nil
		}
		return nil, fmt.Errorf("failed to list Kueue Workloads in namespace %q: %w", namespace, err)
	}

	type workloadSummary struct {
		queueName        string
		count            int
		admitted         bool
		admittedMessage  string
		finished         int
		finishedMessage  string
		preempted        bool
		preemptedMessage string
		queuedMessage    string
	}
	summaries := make(map[string]*workloadSummary, len(evaluationIDs))

	for index := range workloads.Items {
		workload := &workloads.Items[index]
		evaluationID := workloadEvaluationID(workload)
		if _, found := requested[evaluationID]; !found {
			continue
		}

		summary, found := summaries[evaluationID]
		if !found {
			summary = &workloadSummary{}
			summaries[evaluationID] = summary
		}
		summary.count++
		if summary.queueName == "" {
			summary.queueName = workloadQueueName(workload)
		}

		workloadFinished := false
		workloadAdmitted := false
		for _, condition := range workloadConditions(workload) {
			if !condition.isTrue {
				continue
			}
			message := firstNonEmpty(condition.message, condition.reason)
			switch {
			case condition.conditionType == "Admitted":
				workloadAdmitted = true
				summary.admittedMessage = firstNonEmpty(summary.admittedMessage, message)
			case condition.conditionType == "Finished":
				workloadFinished = true
				summary.finishedMessage = firstNonEmpty(summary.finishedMessage, message)
			case condition.conditionType == "Evicted" || strings.Contains(strings.ToLower(condition.reason), "preempt"):
				summary.preempted = true
				summary.preemptedMessage = firstNonEmpty(summary.preemptedMessage, message)
			default:
				summary.queuedMessage = firstNonEmpty(summary.queuedMessage, message)
			}
		}
		if workloadFinished {
			summary.finished++
		} else if workloadAdmitted {
			summary.admitted = true
		}
	}

	items := make([]models.KueueWorkloadStatus, 0, len(summaries))
	for _, evaluationID := range evaluationIDs {
		summary, found := summaries[evaluationID]
		if !found {
			continue
		}

		state, message := models.KueueWorkloadStateQueued, summary.queuedMessage
		switch {
		case summary.preempted:
			state, message = models.KueueWorkloadStatePreempted, summary.preemptedMessage
		case summary.finished == summary.count:
			state, message = models.KueueWorkloadStateFinished, summary.finishedMessage
		case summary.admitted:
			state, message = models.KueueWorkloadStateAdmitted, summary.admittedMessage
		}

		items = append(items, models.KueueWorkloadStatus{
			EvaluationID: evaluationID,
			QueueName:    summary.queueName,
			State:        state,
			Message:      message,
		})
	}

	return &models.KueueWorkloadStatusesResponse{Items: items}, nil
}

type kueueWorkloadCondition struct {
	conditionType string
	isTrue        bool
	reason        string
	message       string
}

func workloadConditions(workload *unstructured.Unstructured) []kueueWorkloadCondition {
	rawConditions, found, err := unstructured.NestedSlice(workload.Object, "status", "conditions")
	if err != nil || !found {
		return nil
	}

	conditions := make([]kueueWorkloadCondition, 0, len(rawConditions))
	for _, rawCondition := range rawConditions {
		condition, ok := rawCondition.(map[string]interface{})
		if !ok {
			continue
		}
		conditions = append(conditions, kueueWorkloadCondition{
			conditionType: stringField(condition, "type"),
			isTrue:        stringField(condition, "status") == "True",
			reason:        stringField(condition, "reason"),
			message:       stringField(condition, "message"),
		})
	}
	return conditions
}

func workloadQueueName(workload *unstructured.Unstructured) string {
	queueName, _, _ := unstructured.NestedString(workload.Object, "spec", "queueName")
	return queueName
}

func workloadEvaluationID(workload *unstructured.Unstructured) string {
	podSets, found, err := unstructured.NestedSlice(workload.Object, "spec", "podSets")
	if err != nil || !found {
		return ""
	}

	for _, rawPodSet := range podSets {
		podSet, ok := rawPodSet.(map[string]interface{})
		if !ok {
			continue
		}
		template, _, _ := unstructured.NestedMap(podSet, "template")
		metadata, _, _ := unstructured.NestedMap(template, "metadata")
		annotations, _, _ := unstructured.NestedStringMap(metadata, "annotations")
		if evaluationID := strings.TrimSpace(annotations[evalHubJobIDAnnotation]); evaluationID != "" {
			return evaluationID
		}
		labels, _, _ := unstructured.NestedStringMap(metadata, "labels")
		if evaluationID := strings.TrimSpace(labels[evalHubJobIDLabel]); evaluationID != "" {
			return evaluationID
		}
	}

	return ""
}

func dynamicFromConfig(config *rest.Config) (dynamic.Interface, error) {
	if config == nil {
		return nil, fmt.Errorf("kubernetes REST config is unavailable")
	}
	return dynamic.NewForConfig(config)
}
