package repositories

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
)

// AllowedUsersRepository lists users with notebook access in a namespace.
type AllowedUsersRepository struct {
	saDynClient dynamic.Interface
}

// NewAllowedUsersRepository creates a new AllowedUsersRepository.
func NewAllowedUsersRepository(saDynClient dynamic.Interface) *AllowedUsersRepository {
	return &AllowedUsersRepository{saDynClient: saDynClient}
}

// GetAllowedUsers lists Notebook CRDs in the namespace and extracts user info.
// Returns empty slice when CRD is absent.
func (r *AllowedUsersRepository) GetAllowedUsers(ctx context.Context, namespace string) ([]models.AllowedUser, error) {
	if r.saDynClient == nil {
		return []models.AllowedUser{}, nil
	}

	list, err := r.saDynClient.Resource(models.NotebookGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) || isDiscoveryError(err) {
			return []models.AllowedUser{}, nil
		}
		return nil, fmt.Errorf("failed to list notebooks: %w", err)
	}

	users := make(map[string]*models.AllowedUser)
	for _, item := range list.Items {
		user := parseNotebookUser(item.Object)
		if user == nil {
			continue
		}
		if existing, ok := users[user.Username]; ok {
			if user.Privilege == "Admin" {
				existing.Privilege = "Admin"
			}
		} else {
			users[user.Username] = user
		}
	}

	result := make([]models.AllowedUser, 0, len(users))
	for _, u := range users {
		result = append(result, *u)
	}
	return result, nil
}

func parseNotebookUser(obj map[string]interface{}) *models.AllowedUser {
	metadata, ok := obj["metadata"].(map[string]interface{})
	if !ok {
		return nil
	}

	annotations, _ := metadata["annotations"].(map[string]interface{})
	labels, _ := metadata["labels"].(map[string]interface{})

	username := decodeNotebookUsername(annotations)
	if username == "" {
		return nil
	}

	return &models.AllowedUser{
		Username:     username,
		Privilege:    notebookPrivilege(labels),
		LastActivity: notebookLastActivity(annotations),
	}
}

func notebookPrivilege(labels map[string]interface{}) string {
	if userType, _ := labels["opendatahub.io/user-type"].(string); userType == "admin" {
		return "Admin"
	}
	return "User"
}

func notebookLastActivity(annotations map[string]interface{}) string {
	if la, ok := annotations["notebooks.kubeflow.org/last-activity"].(string); ok && la != "" {
		return la
	}
	if rs, ok := annotations["kubeflow-resource-stopped"].(string); ok && rs != "" {
		return rs
	}
	return "Now"
}

const kubeSafePrefix = "b64:"

func decodeNotebookUsername(annotations map[string]interface{}) string {
	raw, _ := annotations["opendatahub.io/username"].(string)
	if raw == "" {
		return ""
	}
	if after, ok := strings.CutPrefix(raw, kubeSafePrefix); ok {
		decoded, err := base64.StdEncoding.DecodeString(after)
		if err == nil {
			return string(decoded)
		}
	}
	return raw
}
