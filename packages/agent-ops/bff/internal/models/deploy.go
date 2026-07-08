package models

type EnvVar struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ServicePort struct {
	Name       string `json:"name"`
	Port       int32  `json:"port"`
	TargetPort int32  `json:"targetPort"`
	Protocol   string `json:"protocol,omitempty"`
}

type DeployAgentRequest struct {
	Name            string        `json:"name"`
	Namespace       string        `json:"namespace"`
	ContainerImage  string        `json:"containerImage"`
	ImageTag        string        `json:"imageTag"`
	ImagePullSecret string        `json:"imagePullSecret,omitempty"`
	Protocol        string        `json:"protocol,omitempty"`
	Framework       string        `json:"framework,omitempty"`
	Description     string        `json:"description,omitempty"`
	EnvVars         []EnvVar      `json:"envVars,omitempty"`
	ServicePorts    []ServicePort `json:"servicePorts,omitempty"`
	CreateRoute     bool          `json:"createRoute,omitempty"`
}

type DeployAgentResponse struct {
	Success   bool   `json:"success"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Message   string `json:"message"`
}
