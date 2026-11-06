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
	if !validDNS1123Label(labels[0]) || !validDNS1123Label(labels[1]) || labels[2] != "svc" {
		return ServiceHostname{}, false
	}
	if len(labels) == 5 && (labels[3] != "cluster" || labels[4] != "local") {
		return ServiceHostname{}, false
	}
	return ServiceHostname{Service: labels[0], Namespace: labels[1], Full: len(labels) == 5}, true
}

func validDNS1123Label(label string) bool {
	if len(label) == 0 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
		return false
	}
	for _, r := range label {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '-' {
			return false
		}
	}
	return true
}
