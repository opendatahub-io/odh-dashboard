package pgvector

const (
	DefaultProviderID = "pgvector"
	ProviderType      = "remote::pgvector"

	DefaultPort           = 5432
	DefaultDB             = "vectordb"
	DefaultUser           = "vectoruser"
	DefaultPasswordKey    = "password"
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
	PasswordSecret *SecretRef // password is injected via SecretKeyRef
}

// SecretRef identifies a key inside a Kubernetes Secret.
type SecretRef struct {
	Name string
	Key  string
}

// IsConfigured returns true when at least the host is set, indicating
// that pgvector connection details have been provided.
func (c *Connection) IsConfigured() bool {
	return c.Host != ""
}
