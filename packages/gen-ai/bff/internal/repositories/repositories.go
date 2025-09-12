package repositories

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck            *HealthCheckRepository
	Models                 *ModelsRepository
	AAModels               *AAModelsRepository
	VectorStores           *VectorStoresRepository
	Files                  *FilesRepository
	Responses              *ResponsesRepository
	Template               *TemplateRepository
	Namespace              *NamespaceRepository
	LlamaStackDistribution *LlamaStackDistributionRepository
}

// NewRepositories creates domain-specific repositories.
func NewRepositories() *Repositories {
	return &Repositories{
		HealthCheck:            NewHealthCheckRepository(),
		Models:                 NewModelsRepository(),
		AAModels:               NewAAModelsRepository(),
		VectorStores:           NewVectorStoresRepository(),
		Files:                  NewFilesRepository(),
		Responses:              NewResponsesRepository(),
		Template:               NewTemplateRepository(),
		Namespace:              NewNamespaceRepository(),
		LlamaStackDistribution: NewLlamaStackDistributionRepository(),
	}
}
