package models

type Gateway struct {
	Name          string `json:"name"`
	Namespace     string `json:"namespace"`
	Endpoint      string `json:"endpoint"`
	Status        string `json:"status"`
	ProviderCount int    `json:"providerCount"`
	SandboxCount  int    `json:"sandboxCount"`
	IsGlobal      bool   `json:"isGlobal"`
}

type GatewayDetail struct {
	Gateway
	Version string `json:"version,omitempty"`
}

type GatewayListResponse struct {
	Gateways []Gateway `json:"gateways"`
}

type CreateGatewayRequest struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
	Endpoint  string `json:"endpoint"`
	IsGlobal  bool   `json:"isGlobal"`
}
