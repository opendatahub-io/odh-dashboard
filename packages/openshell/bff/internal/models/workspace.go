package models

// ObjectMeta matches openshell-dashboard upstream API shapes.
type ObjectMeta struct {
	ID                  string            `json:"id"`
	Name                string            `json:"name"`
	Workspace           string            `json:"workspace,omitempty"`
	Labels              map[string]string `json:"labels,omitempty"`
	Annotations         map[string]string `json:"annotations,omitempty"`
	CreatedAtMs         int64             `json:"createdAtMs"`
	ResourceVersion     int64             `json:"resourceVersion"`
	DeletionTimestampMs *int64            `json:"deletionTimestampMs,omitempty"`
}

type WorkspacePhase string

const (
	WorkspacePhaseActive      WorkspacePhase = "ACTIVE"
	WorkspacePhaseTerminating WorkspacePhase = "TERMINATING"
	WorkspacePhaseUnspecified WorkspacePhase = "UNSPECIFIED"
)

type Workspace struct {
	Metadata ObjectMeta     `json:"metadata"`
	Phase    WorkspacePhase `json:"phase"`
}

type WorkspaceRole string

const (
	WorkspaceRoleUser        WorkspaceRole = "USER"
	WorkspaceRoleAdmin       WorkspaceRole = "ADMIN"
	WorkspaceRoleUnspecified WorkspaceRole = "UNSPECIFIED"
)

type WorkspaceMember struct {
	Metadata         ObjectMeta    `json:"metadata"`
	PrincipalSubject string        `json:"principalSubject"`
	Role             WorkspaceRole `json:"role"`
}
