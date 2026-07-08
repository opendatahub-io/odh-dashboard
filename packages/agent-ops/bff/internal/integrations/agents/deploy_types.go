package agents

type DeployAgentParams struct {
	Name            string
	Namespace       string
	ContainerImage  string
	ImageTag        string
	ImagePullSecret string
	Protocol        string
	Framework       string
	Description     string
	EnvVars      []AgentEnvVar
	ServicePorts []AgentServicePortSpec
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
