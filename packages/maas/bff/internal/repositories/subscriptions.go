package repositories

import (
	"context"
	"fmt"
	"log/slog"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// SubscriptionsRepository handles subscription operations via the Kubernetes API.
type SubscriptionsRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
}

// NewSubscriptionsRepository creates a new subscriptions repository.
func NewSubscriptionsRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory) *SubscriptionsRepository {
	return &SubscriptionsRepository{
		logger:     logger,
		k8sFactory: k8sFactory,
	}
}

// ListSubscriptions returns all MaaSSubscription resources across all namespaces.
func (r *SubscriptionsRepository) ListSubscriptions(ctx context.Context) ([]models.MaaSSubscription, error) {
	r.logger.Debug("Listing all subscriptions")

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()
	list, err := kubeClient.Resource(constants.MaaSSubscriptionGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSSubscriptions: %w", err)
	}

	subscriptions := make([]models.MaaSSubscription, 0, len(list.Items))
	for _, item := range list.Items {
		sub, err := convertUnstructuredToSubscription(&item)
		if err != nil {
			r.logger.Warn("Failed to convert MaaSSubscription", slog.String("name", item.GetName()), slog.Any("error", err))
			continue
		}
		subscriptions = append(subscriptions, *sub)
	}

	return subscriptions, nil
}

// GetSubscription returns a specific MaaSSubscription by name.
// Since subscriptions are namespace-scoped but the API uses name only,
// we list across all namespaces and find by name.
func (r *SubscriptionsRepository) GetSubscription(ctx context.Context, name string) (*models.MaaSSubscription, error) {
	r.logger.Debug("Getting subscription", slog.String("name", name))

	obj, err := r.findSubscriptionByName(ctx, name)
	if err != nil {
		return nil, err
	}
	if obj == nil {
		return nil, nil
	}

	return convertUnstructuredToSubscription(obj)
}

// CreateSubscription creates a MaaSSubscription and MaaSAuthPolicy.
func (r *SubscriptionsRepository) CreateSubscription(ctx context.Context, request models.CreateSubscriptionRequest) (*models.CreateSubscriptionResponse, error) {
	r.logger.Debug("Creating subscription", slog.String("name", request.Name), slog.String("namespace", request.Namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	// Build and create the MaaSSubscription CR
	subObj := buildSubscriptionUnstructured(request.Name, request.Namespace, request.Owner, request.ModelRefs, request.TokenMetadata, request.Priority)
	createdSub, err := kubeClient.Resource(constants.MaaSSubscriptionGvr).Namespace(request.Namespace).Create(ctx, subObj, metav1.CreateOptions{})
	if err != nil {
		if k8sErrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("MaaSSubscription '%s' already exists", request.Name)
		}
		return nil, fmt.Errorf("failed to create MaaSSubscription: %w", err)
	}

	// Build and create the MaaSAuthPolicy CR with owner reference to the subscription
	modelRefs := make([]models.ModelRef, len(request.ModelRefs))
	for i, mr := range request.ModelRefs {
		modelRefs[i] = models.ModelRef{Name: mr.Name, Namespace: mr.Namespace}
	}

	policyObj := buildAuthPolicyUnstructured(
		request.Name+"-policy",
		request.Namespace,
		modelRefs,
		request.Owner.Groups,
		request.TokenMetadata,
		createdSub.GetUID(),
		createdSub.GetName(),
	)
	createdPolicy, err := kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(request.Namespace).Create(ctx, policyObj, metav1.CreateOptions{})
	if err != nil {
		// Clean up the subscription if policy creation fails
		_ = kubeClient.Resource(constants.MaaSSubscriptionGvr).Namespace(request.Namespace).Delete(ctx, request.Name, metav1.DeleteOptions{})
		return nil, fmt.Errorf("failed to create MaaSAuthPolicy: %w", err)
	}

	subscription, err := convertUnstructuredToSubscription(createdSub)
	if err != nil {
		return nil, err
	}

	authPolicy, err := convertUnstructuredToAuthPolicy(createdPolicy)
	if err != nil {
		return nil, err
	}

	return &models.CreateSubscriptionResponse{
		Subscription: *subscription,
		AuthPolicy:   *authPolicy,
	}, nil
}

// UpdateSubscription updates a MaaSSubscription and MaaSAuthPolicy.
func (r *SubscriptionsRepository) UpdateSubscription(ctx context.Context, name string, request models.UpdateSubscriptionRequest) (*models.CreateSubscriptionResponse, error) {
	r.logger.Debug("Updating subscription", slog.String("name", name))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	// Find the existing subscription
	existingObj, err := r.findSubscriptionByName(ctx, name)
	if err != nil {
		return nil, err
	}
	if existingObj == nil {
		return nil, nil
	}

	namespace := existingObj.GetNamespace()

	// Update the subscription spec
	updateSubscriptionSpec(existingObj, request.Owner, request.ModelRefs, request.TokenMetadata, request.Priority)
	updatedSub, err := kubeClient.Resource(constants.MaaSSubscriptionGvr).Namespace(namespace).Update(ctx, existingObj, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update MaaSSubscription: %w", err)
	}

	// Update the associated auth policy
	policyName := name + "-policy"
	existingPolicy, err := kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(namespace).Get(ctx, policyName, metav1.GetOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			r.logger.Warn("Associated MaaSAuthPolicy not found, skipping update", slog.String("policy", policyName))
		} else {
			return nil, fmt.Errorf("failed to get MaaSAuthPolicy for update: %w", err)
		}
	}

	var authPolicy *models.MaaSAuthPolicy
	if existingPolicy != nil {
		modelRefs := make([]models.ModelRef, len(request.ModelRefs))
		for i, mr := range request.ModelRefs {
			modelRefs[i] = models.ModelRef{Name: mr.Name, Namespace: mr.Namespace}
		}
		updateAuthPolicySpec(existingPolicy, modelRefs, request.Owner.Groups, request.TokenMetadata)

		updatedPolicy, updateErr := kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(namespace).Update(ctx, existingPolicy, metav1.UpdateOptions{})
		if updateErr != nil {
			return nil, fmt.Errorf("failed to update MaaSAuthPolicy: %w", updateErr)
		}
		authPolicy, err = convertUnstructuredToAuthPolicy(updatedPolicy)
		if err != nil {
			return nil, err
		}
	}

	subscription, err := convertUnstructuredToSubscription(updatedSub)
	if err != nil {
		return nil, err
	}

	if authPolicy == nil {
		authPolicy = &models.MaaSAuthPolicy{
			Name:      policyName,
			Namespace: namespace,
		}
	}

	return &models.CreateSubscriptionResponse{
		Subscription: *subscription,
		AuthPolicy:   *authPolicy,
	}, nil
}

// DeleteSubscription deletes a MaaSSubscription by name.
// The associated MaaSAuthPolicy is expected to be garbage-collected via owner references.
func (r *SubscriptionsRepository) DeleteSubscription(ctx context.Context, name string) error {
	r.logger.Debug("Deleting subscription", slog.String("name", name))

	existingObj, err := r.findSubscriptionByName(ctx, name)
	if err != nil {
		return err
	}
	if existingObj == nil {
		return fmt.Errorf("MaaSSubscription '%s' not found", name)
	}

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	kubeClient := client.GetDynamicClient()
	err = kubeClient.Resource(constants.MaaSSubscriptionGvr).Namespace(existingObj.GetNamespace()).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return fmt.Errorf("MaaSSubscription '%s' not found", name)
		}
		return fmt.Errorf("failed to delete MaaSSubscription: %w", err)
	}

	return nil
}

// GetFormData returns groups and model refs for the subscription creation form.
func (r *SubscriptionsRepository) GetFormData(ctx context.Context) (*models.SubscriptionFormDataResponse, error) {
	r.logger.Debug("Getting subscription form data")

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	// Fetch groups from OpenShift
	groups, err := r.listGroups(ctx, kubeClient)
	if err != nil {
		r.logger.Warn("Failed to list groups, returning empty list", slog.Any("error", err))
		groups = []string{}
	}

	// Fetch model refs
	modelRefs, err := r.listAllModelRefSummaries(ctx, kubeClient)
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSModelRefs: %w", err)
	}

	return &models.SubscriptionFormDataResponse{
		Groups:    groups,
		ModelRefs: modelRefs,
	}, nil
}

// GetAuthPoliciesForSubscription returns MaaSAuthPolicy resources associated with a subscription.
func (r *SubscriptionsRepository) GetAuthPoliciesForSubscription(ctx context.Context, subscriptionName string) ([]models.MaaSAuthPolicy, error) {
	r.logger.Debug("Getting auth policies for subscription", slog.String("subscription", subscriptionName))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	list, err := kubeClient.Resource(constants.MaaSAuthPolicyGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSAuthPolicies: %w", err)
	}

	var result []models.MaaSAuthPolicy
	expectedPolicyName := subscriptionName + "-policy"
	for _, item := range list.Items {
		if item.GetName() == expectedPolicyName {
			policy, err := convertUnstructuredToAuthPolicy(&item)
			if err != nil {
				r.logger.Warn("Failed to convert MaaSAuthPolicy", slog.String("name", item.GetName()), slog.Any("error", err))
				continue
			}
			result = append(result, *policy)
		}
	}

	return result, nil
}

// GetModelRefSummaries returns MaaSModelRef summaries for the given model refs.
func (r *SubscriptionsRepository) GetModelRefSummaries(ctx context.Context, refs []models.ModelSubscriptionRef) ([]models.MaaSModelRefSummary, error) {
	r.logger.Debug("Getting model ref summaries")

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	allRefs, err := r.listAllModelRefSummaries(ctx, kubeClient)
	if err != nil {
		return nil, err
	}

	// Filter to only the refs referenced by the subscription
	refSet := make(map[string]bool, len(refs))
	for _, ref := range refs {
		refSet[ref.Namespace+"/"+ref.Name] = true
	}

	var result []models.MaaSModelRefSummary
	for _, ref := range allRefs {
		if refSet[ref.Namespace+"/"+ref.Name] {
			result = append(result, ref)
		}
	}

	return result, nil
}

// --- K8s helpers ---

func (r *SubscriptionsRepository) findSubscriptionByName(ctx context.Context, name string) (*unstructured.Unstructured, error) {
	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()
	list, err := kubeClient.Resource(constants.MaaSSubscriptionGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSSubscriptions: %w", err)
	}

	for _, item := range list.Items {
		if item.GetName() == name {
			return item.DeepCopy(), nil
		}
	}

	return nil, nil
}

func (r *SubscriptionsRepository) listGroups(ctx context.Context, kubeClient dynamic.Interface) ([]string, error) {
	list, err := kubeClient.Resource(constants.GroupGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	groups := make([]string, 0, len(list.Items))
	for _, item := range list.Items {
		groups = append(groups, item.GetName())
	}

	return groups, nil
}

func (r *SubscriptionsRepository) listAllModelRefSummaries(ctx context.Context, kubeClient dynamic.Interface) ([]models.MaaSModelRefSummary, error) {
	list, err := kubeClient.Resource(constants.MaaSModelRefGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSModelRefs: %w", err)
	}

	summaries := make([]models.MaaSModelRefSummary, 0, len(list.Items))
	for _, item := range list.Items {
		summary, err := convertUnstructuredToModelRefSummary(&item)
		if err != nil {
			r.logger.Warn("Failed to convert MaaSModelRef", slog.String("name", item.GetName()), slog.Any("error", err))
			continue
		}
		summaries = append(summaries, *summary)
	}

	return summaries, nil
}

// --- Conversion helpers: Unstructured -> Go models ---

func convertUnstructuredToSubscription(obj *unstructured.Unstructured) (*models.MaaSSubscription, error) {
	content := obj.UnstructuredContent()

	sub := &models.MaaSSubscription{
		Name:      obj.GetName(),
		Namespace: obj.GetNamespace(),
	}

	phase, _, _ := unstructured.NestedString(content, "status", "phase")
	sub.Phase = phase

	priority, _, _ := unstructured.NestedFieldNoCopy(content, "spec", "priority")
	if priority != nil {
		switch v := priority.(type) {
		case int64:
			sub.Priority = int32(v)
		case float64:
			sub.Priority = int32(v)
		}
	}

	ownerGroups, _, _ := unstructured.NestedSlice(content, "spec", "owner", "groups")
	for _, g := range ownerGroups {
		if gMap, ok := g.(map[string]interface{}); ok {
			if name, ok := gMap["name"].(string); ok {
				sub.Owner.Groups = append(sub.Owner.Groups, models.GroupReference{Name: name})
			}
		}
	}

	modelRefs, _, _ := unstructured.NestedSlice(content, "spec", "modelRefs")
	for _, mr := range modelRefs {
		if mrMap, ok := mr.(map[string]interface{}); ok {
			ref := models.ModelSubscriptionRef{}
			if name, ok := mrMap["name"].(string); ok {
				ref.Name = name
			}
			if ns, ok := mrMap["namespace"].(string); ok {
				ref.Namespace = ns
			}
			if trl, ok := mrMap["tokenRateLimits"].([]interface{}); ok {
				for _, t := range trl {
					if tMap, ok := t.(map[string]interface{}); ok {
						limit := models.TokenRateLimit{}
						switch v := tMap["limit"].(type) {
						case int64:
							limit.Limit = v
						case float64:
							limit.Limit = int64(v)
						}
						if w, ok := tMap["window"].(string); ok {
							limit.Window = w
						}
						ref.TokenRateLimits = append(ref.TokenRateLimits, limit)
					}
				}
			}
			if trlRef, ok := mrMap["tokenRateLimitRef"].(string); ok {
				ref.TokenRateLimitRef = &trlRef
			}
			if br, ok := mrMap["billingRate"].(map[string]interface{}); ok {
				if perToken, ok := br["perToken"].(string); ok {
					ref.BillingRate = &models.BillingRate{PerToken: perToken}
				}
			}
			sub.ModelRefs = append(sub.ModelRefs, ref)
		}
	}

	tm, tmExists, _ := unstructured.NestedMap(content, "spec", "tokenMetadata")
	if tmExists && tm != nil {
		tokenMeta := &models.TokenMetadata{}
		if orgID, ok := tm["organizationId"].(string); ok {
			tokenMeta.OrganizationID = orgID
		}
		if cc, ok := tm["costCenter"].(string); ok {
			tokenMeta.CostCenter = cc
		}
		if labels, ok := tm["labels"].(map[string]interface{}); ok {
			tokenMeta.Labels = make(map[string]string, len(labels))
			for k, v := range labels {
				if s, ok := v.(string); ok {
					tokenMeta.Labels[k] = s
				}
			}
		}
		sub.TokenMetadata = tokenMeta
	}

	ct := obj.GetCreationTimestamp()
	if !ct.IsZero() {
		t := ct.Time
		sub.CreationTimestamp = &t
	}

	return sub, nil
}

func convertUnstructuredToAuthPolicy(obj *unstructured.Unstructured) (*models.MaaSAuthPolicy, error) {
	content := obj.UnstructuredContent()

	policy := &models.MaaSAuthPolicy{
		Name:      obj.GetName(),
		Namespace: obj.GetNamespace(),
	}

	phase, _, _ := unstructured.NestedString(content, "status", "phase")
	policy.Phase = phase

	modelRefs, _, _ := unstructured.NestedSlice(content, "spec", "modelRefs")
	for _, mr := range modelRefs {
		if mrMap, ok := mr.(map[string]interface{}); ok {
			ref := models.ModelRef{}
			if name, ok := mrMap["name"].(string); ok {
				ref.Name = name
			}
			if ns, ok := mrMap["namespace"].(string); ok {
				ref.Namespace = ns
			}
			policy.ModelRefs = append(policy.ModelRefs, ref)
		}
	}

	subjectGroups, _, _ := unstructured.NestedSlice(content, "spec", "subjects", "groups")
	for _, g := range subjectGroups {
		if gMap, ok := g.(map[string]interface{}); ok {
			if name, ok := gMap["name"].(string); ok {
				policy.Subjects.Groups = append(policy.Subjects.Groups, models.GroupReference{Name: name})
			}
		}
	}

	mm, mmExists, _ := unstructured.NestedMap(content, "spec", "meteringMetadata")
	if mmExists && mm != nil {
		meta := &models.TokenMetadata{}
		if orgID, ok := mm["organizationId"].(string); ok {
			meta.OrganizationID = orgID
		}
		if cc, ok := mm["costCenter"].(string); ok {
			meta.CostCenter = cc
		}
		if labels, ok := mm["labels"].(map[string]interface{}); ok {
			meta.Labels = make(map[string]string, len(labels))
			for k, v := range labels {
				if s, ok := v.(string); ok {
					meta.Labels[k] = s
				}
			}
		}
		policy.MeteringMetadata = meta
	}

	return policy, nil
}

func convertUnstructuredToModelRefSummary(obj *unstructured.Unstructured) (*models.MaaSModelRefSummary, error) {
	content := obj.UnstructuredContent()

	summary := &models.MaaSModelRefSummary{
		Name:      obj.GetName(),
		Namespace: obj.GetNamespace(),
	}

	kind, _, _ := unstructured.NestedString(content, "spec", "modelRef", "kind")
	name, _, _ := unstructured.NestedString(content, "spec", "modelRef", "name")
	summary.ModelRef = models.ModelReference{Kind: kind, Name: name}

	phase, _, _ := unstructured.NestedString(content, "status", "phase")
	summary.Phase = phase

	endpoint, _, _ := unstructured.NestedString(content, "status", "endpoint")
	summary.Endpoint = endpoint

	return summary, nil
}

// --- Builder helpers: Go models -> Unstructured ---

func buildSubscriptionUnstructured(name, namespace string, owner models.OwnerSpec, modelRefs []models.ModelSubscriptionRef, tokenMetadata *models.TokenMetadata, priority int32) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion("maas.opendatahub.io/v1alpha1")
	obj.SetKind("MaaSSubscription")
	obj.SetName(name)
	obj.SetNamespace(namespace)

	spec := map[string]interface{}{
		"priority":  int64(priority),
		"owner":     buildOwnerSpec(owner),
		"modelRefs": buildModelSubscriptionRefs(modelRefs),
	}

	if tokenMetadata != nil {
		spec["tokenMetadata"] = buildTokenMetadata(tokenMetadata)
	}

	obj.Object["spec"] = spec
	return obj
}

func buildAuthPolicyUnstructured(name, namespace string, modelRefs []models.ModelRef, groups []models.GroupReference, tokenMetadata *models.TokenMetadata, ownerUID types.UID, ownerName string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion("maas.opendatahub.io/v1alpha1")
	obj.SetKind("MaaSAuthPolicy")
	obj.SetName(name)
	obj.SetNamespace(namespace)

	if ownerUID != "" {
		obj.SetOwnerReferences([]metav1.OwnerReference{
			{
				APIVersion: "maas.opendatahub.io/v1alpha1",
				Kind:       "MaaSSubscription",
				Name:       ownerName,
				UID:        ownerUID,
			},
		})
	}

	mrList := make([]interface{}, len(modelRefs))
	for i, mr := range modelRefs {
		mrList[i] = map[string]interface{}{
			"name":      mr.Name,
			"namespace": mr.Namespace,
		}
	}

	groupList := make([]interface{}, len(groups))
	for i, g := range groups {
		groupList[i] = map[string]interface{}{
			"name": g.Name,
		}
	}

	spec := map[string]interface{}{
		"modelRefs": mrList,
		"subjects": map[string]interface{}{
			"groups": groupList,
		},
	}

	if tokenMetadata != nil {
		spec["meteringMetadata"] = buildTokenMetadata(tokenMetadata)
	}

	obj.Object["spec"] = spec
	return obj
}

func buildOwnerSpec(owner models.OwnerSpec) map[string]interface{} {
	groups := make([]interface{}, len(owner.Groups))
	for i, g := range owner.Groups {
		groups[i] = map[string]interface{}{
			"name": g.Name,
		}
	}
	return map[string]interface{}{
		"groups": groups,
	}
}

func buildModelSubscriptionRefs(refs []models.ModelSubscriptionRef) []interface{} {
	result := make([]interface{}, len(refs))
	for i, ref := range refs {
		mr := map[string]interface{}{
			"name":      ref.Name,
			"namespace": ref.Namespace,
		}
		if len(ref.TokenRateLimits) > 0 {
			trls := make([]interface{}, len(ref.TokenRateLimits))
			for j, trl := range ref.TokenRateLimits {
				trls[j] = map[string]interface{}{
					"limit":  trl.Limit,
					"window": trl.Window,
				}
			}
			mr["tokenRateLimits"] = trls
		}
		if ref.TokenRateLimitRef != nil {
			mr["tokenRateLimitRef"] = *ref.TokenRateLimitRef
		}
		if ref.BillingRate != nil {
			mr["billingRate"] = map[string]interface{}{
				"perToken": ref.BillingRate.PerToken,
			}
		}
		result[i] = mr
	}
	return result
}

func buildTokenMetadata(tm *models.TokenMetadata) map[string]interface{} {
	meta := map[string]interface{}{}
	if tm.OrganizationID != "" {
		meta["organizationId"] = tm.OrganizationID
	}
	if tm.CostCenter != "" {
		meta["costCenter"] = tm.CostCenter
	}
	if len(tm.Labels) > 0 {
		labels := make(map[string]interface{}, len(tm.Labels))
		for k, v := range tm.Labels {
			labels[k] = v
		}
		meta["labels"] = labels
	}
	return meta
}

func updateSubscriptionSpec(obj *unstructured.Unstructured, owner models.OwnerSpec, modelRefs []models.ModelSubscriptionRef, tokenMetadata *models.TokenMetadata, priority int32) {
	spec := map[string]interface{}{
		"priority":  int64(priority),
		"owner":     buildOwnerSpec(owner),
		"modelRefs": buildModelSubscriptionRefs(modelRefs),
	}

	if tokenMetadata != nil {
		spec["tokenMetadata"] = buildTokenMetadata(tokenMetadata)
	}

	obj.Object["spec"] = spec
}

func updateAuthPolicySpec(obj *unstructured.Unstructured, modelRefs []models.ModelRef, groups []models.GroupReference, tokenMetadata *models.TokenMetadata) {
	mrList := make([]interface{}, len(modelRefs))
	for i, mr := range modelRefs {
		mrList[i] = map[string]interface{}{
			"name":      mr.Name,
			"namespace": mr.Namespace,
		}
	}

	groupList := make([]interface{}, len(groups))
	for i, g := range groups {
		groupList[i] = map[string]interface{}{
			"name": g.Name,
		}
	}

	spec := map[string]interface{}{
		"modelRefs": mrList,
		"subjects": map[string]interface{}{
			"groups": groupList,
		},
	}

	if tokenMetadata != nil {
		spec["meteringMetadata"] = buildTokenMetadata(tokenMetadata)
	}

	obj.Object["spec"] = spec
}
