package models

import kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"

// User, NamespaceModel, and SecretListItem are type aliases for the canonical
// types in autox-core. They carry no autorag-specific fields or shape.
type User = kubernetes.UserInfo
type NamespaceModel = kubernetes.NamespaceInfo
type SecretListItem = kubernetes.SecretInfo
