export declare const MCP_FORM_LABELS: {
    readonly NAME: "Name";
    readonly YAML_CONTENT: "Upload a YAML file";
    readonly CATALOG_YAML_FILE: "Catalog YAML file";
    readonly MCP_SERVERS: "MCP servers";
    readonly SERVER_VISIBILITY: "Server visibility";
    readonly INCLUDED_SERVERS: "Included MCP servers";
    readonly EXCLUDED_SERVERS: "Excluded MCP servers";
    readonly ENABLE_SOURCE: "Enable source";
};
export declare const MCP_BUTTON_LABELS: {
    readonly ADD: "Add";
    readonly SAVE: "Save";
    readonly PREVIEW: "Preview";
    readonly CANCEL: "Cancel";
};
export declare const MCP_SOURCE_NAME_CHARACTER_LIMIT = 238;
export declare const MCP_VALIDATION_MESSAGES: {
    readonly NAME_REQUIRED: "Name is required";
    readonly YAML_CONTENT_REQUIRED: "YAML content is required";
};
export declare const MCP_DESCRIPTION_TEXT: {
    readonly ENABLE_SOURCE: "Enable users in your organization to view MCP servers from this source in the MCP catalog.";
    readonly FILTER_INFO: "Optionally filter which MCP servers from your source appear in the MCP catalog. If no filters are set, all servers from the source will be visible.";
    readonly INCLUDED_SERVERS: "Enter MCP server names to include from this source. Separate names with commas. Use an asterisk suffix for prefix matching (Example: Kubernetes*).";
    readonly EXCLUDED_SERVERS: "Enter MCP server names to exclude from this source. Separate names with commas. Use wildcards for pattern matching (Example: *experimental*).";
};
export declare const MCP_HELPER_TEXT: {
    readonly YAML: "Upload or paste a YAML string.";
};
export declare const MCP_PLACEHOLDERS: {
    readonly INCLUDED_SERVERS: "Example: Kubernetes, GitHub, PostgreSQL";
    readonly EXCLUDED_SERVERS: "Example: *preview*";
};
export declare const MCP_EXPECTED_YAML_FORMAT_LABEL = "View expected file format";
export declare const MCP_EXPECTED_FORMAT_DRAWER_TITLE = "Expected file format";
export declare const MCP_PAGE_TITLES: {
    readonly MCP_CATALOG_PREVIEW: "MCP catalog preview";
    readonly PREVIEW_SERVERS: "Preview servers";
};
export declare const MCP_ERROR_MESSAGES: {
    readonly PREVIEW_FAILED: "Preview failed";
    readonly SAVE_FAILED: "Failed to save source";
    readonly FILE_UPLOAD_FAILED: "File upload failed";
    readonly FILE_UPLOAD_FAILED_BODY: "The YAML file couldn't be uploaded. Check its syntax and structure, then try again.";
};
export declare const MCP_EMPTY_STATE_TEXT: {
    readonly NO_SERVERS_INCLUDED: "No MCP servers included";
    readonly NO_SERVERS_INCLUDED_BODY: "No MCP servers from this source are visible in the MCP catalog. To include servers, edit the server visibility settings of this source.";
    readonly NO_SERVERS_EXCLUDED: "No MCP servers excluded";
    readonly NO_SERVERS_EXCLUDED_BODY: "No MCP servers from this source are excluded by this filter.";
};
