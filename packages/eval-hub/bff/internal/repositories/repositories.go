package repositories

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck   *HealthCheckRepository
	User          *UserRepository
	Namespace     *NamespaceRepository
	EvalHubStatus *EvalHubStatusRepository
}

func NewRepositories() *Repositories {
	return &Repositories{
		HealthCheck:   NewHealthCheckRepository(),
		User:          NewUserRepository(),
		Namespace:     NewNamespaceRepository(),
		EvalHubStatus: NewEvalHubStatusRepository(),
	}
}
