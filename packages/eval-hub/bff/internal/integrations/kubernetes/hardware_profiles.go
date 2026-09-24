package kubernetes

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

const (
	hardwareProfileGroup    = "infrastructure.opendatahub.io"
	hardwareProfileVersion  = "v1"
	hardwareProfileResource = "hardwareprofiles"
)

var hardwareProfileGVR = schema.GroupVersionResource{
	Group:    hardwareProfileGroup,
	Version:  hardwareProfileVersion,
	Resource: hardwareProfileResource,
}

func listHardwareProfiles(
	ctx context.Context,
	client dynamic.Interface,
	evaluationNamespace string,
	hardwareProfilesNamespace string,
) (*models.HardwareProfilesResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	availability, err := getKueueAvailability(ctx, client, evaluationNamespace)
	if err != nil {
		return nil, err
	}
	return listHardwareProfilesForAvailability(
		ctx,
		client,
		evaluationNamespace,
		hardwareProfilesNamespace,
		availability,
	)
}

func listHardwareProfilesForAvailability(
	ctx context.Context,
	client dynamic.Interface,
	evaluationNamespace string,
	hardwareProfilesNamespace string,
	availability *models.KueueAvailability,
) (*models.HardwareProfilesResponse, error) {
	if !availability.SchedulingReady {
		warning := ""
		if availability.ClusterEnabled && availability.NamespaceManaged {
			warning = "No LocalQueues are configured for this namespace."
		}
		return &models.HardwareProfilesResponse{
			Items:   []models.HardwareProfile{},
			Warning: warning,
		}, nil
	}

	queues := make(map[string]struct{}, len(availability.LocalQueueNames))
	for _, name := range availability.LocalQueueNames {
		queues[name] = struct{}{}
	}
	// Availability is cached briefly for the form. Check LocalQueues again here so a
	// recently deleted queue cannot keep its HardwareProfile selectable at submit.
	localQueues, err := client.Resource(localQueueGVR).Namespace(evaluationNamespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			localQueues = &unstructured.UnstructuredList{}
		} else {
			return nil, fmt.Errorf("failed to list LocalQueues in namespace %q: %w", evaluationNamespace, err)
		}
	}
	clusterQueues := make(map[string]string, len(localQueues.Items))
	for _, localQueue := range localQueues.Items {
		name := localQueue.GetName()
		if _, cached := queues[name]; !cached {
			continue
		}
		clusterQueue, _, _ := unstructured.NestedString(localQueue.Object, "spec", "clusterQueue")
		clusterQueues[name] = clusterQueue
	}

	profiles, err := client.Resource(hardwareProfileGVR).Namespace(hardwareProfilesNamespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list HardwareProfiles in namespace %q: %w", hardwareProfilesNamespace, err)
	}

	items := make([]models.HardwareProfile, 0, len(profiles.Items))
	for _, profile := range profiles.Items {
		if profile.GetAnnotations()["opendatahub.io/disabled"] == "true" {
			continue
		}

		enabled, found, _ := unstructured.NestedBool(profile.Object, "spec", "enabled")
		if found && !enabled {
			continue
		}

		scheduling, _, _ := unstructured.NestedMap(profile.Object, "spec", "scheduling")
		schedulingType, _, _ := unstructured.NestedString(scheduling, "type")
		kueue, _, _ := unstructured.NestedMap(scheduling, "kueue")
		localQueueName, _, _ := unstructured.NestedString(kueue, "localQueueName")

		if schedulingType != "Queue" || localQueueName == "" {
			continue
		}
		if _, ok := clusterQueues[localQueueName]; !ok {
			continue
		}

		resources := make([]models.HardwareProfileResource, 0)
		identifiers, _, _ := unstructured.NestedSlice(profile.Object, "spec", "identifiers")
		for _, raw := range identifiers {
			identifier, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			resources = append(resources, models.HardwareProfileResource{
				DisplayName:  stringField(identifier, "displayName"),
				Identifier:   stringField(identifier, "identifier"),
				ResourceType: stringField(identifier, "resourceType"),
				Default:      stringFieldAny(identifier, "defaultCount"),
				Minimum:      stringFieldAny(identifier, "minCount"),
				Maximum:      stringFieldAny(identifier, "maxCount"),
			})
		}

		annotations := profile.GetAnnotations()
		items = append(items, models.HardwareProfile{
			Name:             profile.GetName(),
			DisplayName:      firstNonEmpty(annotations["opendatahub.io/display-name"], profile.GetName()),
			Description:      annotations["opendatahub.io/description"],
			Enabled:          true,
			SchedulingType:   schedulingType,
			LocalQueueName:   localQueueName,
			ClusterQueueName: clusterQueues[localQueueName],
			PriorityClass:    stringField(kueue, "priorityClass"),
			Resources:        resources,
		})
	}

	return &models.HardwareProfilesResponse{Items: items}, nil
}

// getMissingHardwareProfileLocalQueueName determines whether a selected Queue
// HardwareProfile still references an existing LocalQueue. HardwareProfiles are
// read from the platform namespace, while LocalQueues are read from the
// evaluation namespace. It is intentionally
// separate from listHardwareProfiles: callers only need this extra lookup after
// a previously selected profile is no longer in the compatible list.
func getMissingHardwareProfileLocalQueueName(
	ctx context.Context,
	client dynamic.Interface,
	evaluationNamespace, hardwareProfilesNamespace, profileName string,
) (string, bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	profile, err := client.Resource(hardwareProfileGVR).Namespace(hardwareProfilesNamespace).Get(ctx, profileName, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return "", false, nil
		}
		return "", false, fmt.Errorf("failed to read HardwareProfile %q in namespace %q: %w", profileName, hardwareProfilesNamespace, err)
	}

	scheduling, _, _ := unstructured.NestedMap(profile.Object, "spec", "scheduling")
	schedulingType, _, _ := unstructured.NestedString(scheduling, "type")
	kueue, _, _ := unstructured.NestedMap(scheduling, "kueue")
	localQueueName, _, _ := unstructured.NestedString(kueue, "localQueueName")
	if schedulingType != "Queue" || localQueueName == "" {
		return "", false, nil
	}

	queues, err := client.Resource(localQueueGVR).Namespace(evaluationNamespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return localQueueName, true, nil
		}
		return "", false, fmt.Errorf("failed to list LocalQueues in namespace %q: %w", evaluationNamespace, err)
	}
	for _, queue := range queues.Items {
		if queue.GetName() == localQueueName {
			return "", false, nil
		}
	}
	return localQueueName, true, nil
}

func stringField(values map[string]interface{}, key string) string {
	value, _ := values[key].(string)
	return value
}

func stringFieldAny(values map[string]interface{}, key string) string {
	value := values[key]
	if value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
