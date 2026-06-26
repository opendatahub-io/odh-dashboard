package agents

type DeployAgentParams struct {
	Name              string
	Namespace         string
	ContainerImage    string
	ImageTag          string
	ImagePullSecret   string
	Protocol          string
	Framework         string
	EnvVars           []AgentEnvVar
	ServicePorts      []AgentServicePortSpec
	CreateRoute       bool
	AuthBridgeEnabled bool
	AuthBridgeMode    string
	MTLSMode          string
}

type DeployAgentResult struct {
	Name      string
	Namespace string
}

type AgentEnvVar struct {
	Name  string
	Value string
}

type AgentServicePortSpec struct {
	Name       string
	Port       int32
	TargetPort int32
	Protocol   string
}
