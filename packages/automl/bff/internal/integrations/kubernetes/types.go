package kubernetes

import (
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type ServiceDetails struct {
	Name                string
	DisplayName         string
	Description         string
	ClusterIP           string
	HTTPPort            int32
	IsHTTPS             bool
	ExternalAddressRest string
}

// RequestIdentity is an alias to autox-core's RequestIdentity type
// This allows the BFF's internal k8s package to use the same type as autox-core
type RequestIdentity = corek8s.RequestIdentity

type BearerToken struct {
	raw string
}

func NewBearerToken(t string) BearerToken {
	return BearerToken{raw: t}
}

func (t BearerToken) String() string {
	return "[REDACTED]"
}

func (t BearerToken) Raw() string {
	return t.raw
}
