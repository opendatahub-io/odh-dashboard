package controller

import (
	"encoding/json"
	"sort"
)

// federationEntry is the normalized configuration consumed by the Dashboard
// runtime. Both Dashboard-managed modules and community plugins are converted
// to this shape before the generated ConfigMap is written.
type federationEntry struct {
	Name         string              `json:"name"`
	Backend      *federationBackend  `json:"backend,omitempty"`
	ProxyService []proxyServiceEntry `json:"proxyService,omitempty"`
}

type serviceRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Port      int32  `json:"port"`
}

// federationTarget describes the service-level connection policy shared by a
// remote frontend backend and an API proxy target. Pointers preserve whether a
// community source explicitly set an option or left it to the runtime default.
type federationTarget struct {
	Authorize *bool      `json:"authorize,omitempty"`
	TLS       *bool      `json:"tls,omitempty"`
	Service   serviceRef `json:"service"`
}

type federationBackend struct {
	RemoteEntry string `json:"remoteEntry"`
	federationTarget
}

type proxyServiceEntry struct {
	Path        string `json:"path"`
	PathRewrite string `json:"pathRewrite,omitempty"`
	federationTarget
}

func explicitFederationTarget(authorize, tls bool, service serviceRef) federationTarget {
	return federationTarget{Authorize: &authorize, TLS: &tls, Service: service}
}

func marshalFederationEntries(entries []federationEntry) ([]byte, error) {
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name < entries[j].Name
	})

	return json.MarshalIndent(entries, "    ", "  ")
}
