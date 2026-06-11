package api

import (
	agentsmock "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/mock"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/repositories"
)

func testRepositoriesWithAgents() *repositories.Repositories {
	return repositories.NewRepositories(testAgentsFactory())
}

func testAgentsFactory() *agentsmock.Factory {
	return &agentsmock.Factory{Client: agentsmock.NewDemoClient()}
}
