package pgvector

import "fmt"

const (
	DefaultProviderID = "pgvector"
	ProviderType      = "remote::pgvector"

	DefaultPort           = 5432
	DefaultDB             = "vectordb"
	DefaultUser           = "vectoruser"
	DefaultDistanceMetric = "COSINE"

	HostEnvVar     = "PGVECTOR_HOST"
	PortEnvVar     = "PGVECTOR_PORT"
	DBEnvVar       = "PGVECTOR_DB"
	UserEnvVar     = "PGVECTOR_USER"
	PasswordEnvVar = "PGVECTOR_PASSWORD"
)

// Connection holds the details needed to connect an OGXServer to a
// pgvector-enabled PostgreSQL instance.
type Connection struct {
	Host           string
	Port           int
	DB             string
	User           string
	Password       string
	PasswordSecret *SecretRef // when set, password is injected via SecretKeyRef
}

// SecretRef identifies a key inside a Kubernetes Secret.
type SecretRef struct {
	Name string
	Key  string
}

// DSN returns a PostgreSQL connection string.
func (c *Connection) DSN() string {
	return fmt.Sprintf("postgresql://%s:%s@%s:%d/%s", c.User, c.Password, c.Host, c.Port, c.DB)
}

// IsConfigured returns true when at least the host is set, indicating
// that pgvector connection details have been provided.
func (c *Connection) IsConfigured() bool {
	return c.Host != ""
}
