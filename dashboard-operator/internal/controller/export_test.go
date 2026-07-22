package controller

func SetOperatorDeploymentName(name string) (restore func()) {
	old := operatorDeploymentName
	operatorDeploymentName = name
	return func() { operatorDeploymentName = old }
}
