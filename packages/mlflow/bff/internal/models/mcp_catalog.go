package models

// McpToolParameter mirrors the model-registry catalog tool parameter shape.
type McpToolParameter struct {
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Description *string `json:"description,omitempty"`
	Required    bool    `json:"required"`
}

// McpTool mirrors the model-registry catalog tool shape needed for registration.
type McpTool struct {
	Name          string             `json:"name"`
	Description   *string            `json:"description,omitempty"`
	AccessType    string             `json:"accessType"`
	Parameters    []McpToolParameter `json:"parameters,omitempty"`
	Revoked       *bool              `json:"revoked,omitempty"`
	RevokedReason *string            `json:"revokedReason,omitempty"`
}

// McpToolWithServer pairs a catalog tool with its owning server ID.
type McpToolWithServer struct {
	ServerID string  `json:"serverId"`
	Tool     McpTool `json:"tool"`
}

// McpToolList is the paginated list of tools for an MCP catalog server.
type McpToolList struct {
	NextPageToken string              `json:"nextPageToken"`
	PageSize      int32               `json:"pageSize"`
	Size          int32               `json:"size"`
	Items         []McpToolWithServer `json:"items"`
}

// CatalogToolsToRegistryTools drops revoked catalog tools and converts the rest
// into the MCP Registry tool shape (flat parameters → JSON Schema input_schema).
func CatalogToolsToRegistryTools(tools []McpTool) []MCPTool {
	if len(tools) == 0 {
		return nil
	}
	out := make([]MCPTool, 0, len(tools))
	for _, tool := range tools {
		if tool.Revoked != nil && *tool.Revoked {
			continue
		}
		out = append(out, catalogToolToRegistryTool(tool))
	}
	return out
}

func catalogToolToRegistryTool(tool McpTool) MCPTool {
	properties := map[string]any{}
	var required []string
	for _, param := range tool.Parameters {
		prop := map[string]any{"type": param.Type}
		if param.Description != nil && *param.Description != "" {
			prop["description"] = *param.Description
		}
		properties[param.Name] = prop
		if param.Required {
			required = append(required, param.Name)
		}
	}

	inputSchema := map[string]any{
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		inputSchema["required"] = required
	}

	converted := MCPTool{
		Name:        tool.Name,
		InputSchema: inputSchema,
	}
	if tool.Description != nil && *tool.Description != "" {
		converted.Description = *tool.Description
	}
	return converted
}
