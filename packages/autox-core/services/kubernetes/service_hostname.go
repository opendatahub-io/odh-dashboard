package kubernetes

import "strings"

// ServiceHostname describes a suffix-qualified Kubernetes Service hostname.
type ServiceHostname struct {
	Service   string
	Namespace string
	Full      bool
}

// ParseServiceHostname parses service.namespace.svc and
// service.namespace.svc.cluster.local hostnames. DNS case and a trailing root dot
// are normalized before classification.
func ParseServiceHostname(hostname string) (ServiceHostname, bool) {
	labels := strings.Split(strings.ToLower(strings.TrimSuffix(hostname, ".")), ".")
	if len(labels) != 3 && len(labels) != 5 {
		return ServiceHostname{}, false
	}
	if labels[0] == "" || labels[1] == "" || labels[2] != "svc" {
		return ServiceHostname{}, false
	}
	if len(labels) == 5 && (labels[3] != "cluster" || labels[4] != "local") {
		return ServiceHostname{}, false
	}
	return ServiceHostname{Service: labels[0], Namespace: labels[1], Full: len(labels) == 5}, true
}
