export { SOURCE_NAME_CHARACTER_LIMIT } from '~/app/shared/catalogSettings/const';
export declare const MCP_FORM_LABELS: {
    readonly NAME: "Name";
    readonly YAML_CONTENT: "Upload a YAML file";
    readonly CATALOG_YAML_FILE: "Catalog YAML file";
    readonly MCP_SERVERS: "MCP servers";
    readonly SERVER_FILTERS: "Server filters";
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
export declare const MCP_VALIDATION_MESSAGES: {
    readonly NAME_REQUIRED: "Name is required";
    readonly YAML_CONTENT_REQUIRED: "YAML content is required";
};
export declare const MCP_DESCRIPTION_TEXT: {
    readonly ENABLE_SOURCE: "Enable users in your organization to view MCP servers from this source in the MCP catalog.";
    readonly FILTER_INFO: "Optionally filter which MCP servers from your source appear in the MCP catalog. If no filters are set, all servers from the source will be visible.";
    readonly INCLUDED_SERVERS: "Enter the names of servers to include, separated by commas. To match partial names, add an asterisk (*) suffix. For example, “Kube*” includes servers that contain \"Kube\" (Kubernetes, KubeFlow).";
    readonly EXCLUDED_SERVERS: "Enter the names of servers to exclude, separated by commas. To match partial names, add an asterisk (*) suffix. For example, \"Kube*\" excludes servers that contain \"Kube\" (Kubernetes, KubeFlow).";
};
export declare const MCP_HELPER_TEXT: {
    readonly YAML: "Upload or paste a YAML string.";
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
export declare const MCP_TABLE_COLUMN_LABELS: {
    readonly NAME: "Name";
    readonly SERVER_VISIBILITY: "Server visibility";
    readonly SOURCE_TYPE: "Source type";
    readonly ENABLE: "Enable";
    readonly VALIDATION_STATUS: "Validation status";
};
export declare const MCP_TABLE_COLUMN_POPOVERS: {
    readonly SERVER_VISIBILITY: "Indicates whether all servers from this source appear in the catalog, or if filters limit which servers are visible.";
    readonly ENABLE: "Enable a source to make its MCP servers available to users in your organization from the MCP catalog.";
};
