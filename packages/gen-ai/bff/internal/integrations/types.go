package integrations

type RequestIdentity struct {
	Token    string `json:"token"`     // Kubernetes authentication token
	MCPToken string `json:"mcp_token"` // MCP server authentication token (optional)
}

type BearerToken struct {
	raw string
}

func NewBearerToken(t string) BearerToken {
	return BearerToken{raw: t}
}

func (t BearerToken) String() string {
	return "[REDACTED]"
}

func (t BearerToken) Raw() string {
	return t.raw
}
