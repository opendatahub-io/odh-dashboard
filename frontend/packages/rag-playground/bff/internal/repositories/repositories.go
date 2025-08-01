package repositories

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck      *HealthCheckRepository
	LlamaStackClient LlamaStackClientInterface
}

func NewRepositories(llamaStackClient LlamaStackClientInterface) *Repositories {
	return &Repositories{
		HealthCheck:      NewHealthCheckRepository(),
		LlamaStackClient: llamaStackClient,
	}
}
