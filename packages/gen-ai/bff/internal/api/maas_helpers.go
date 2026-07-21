package api

import (
	"fmt"
)

func (app *App) resolveMaaSBaseURL() string {
	if app.config.MaaSURL != "" {
		return app.config.MaaSURL
	}
	if app.clusterDomain != "" {
		return fmt.Sprintf("https://maas.%s/maas-api", app.clusterDomain)
	}
	return ""
}
