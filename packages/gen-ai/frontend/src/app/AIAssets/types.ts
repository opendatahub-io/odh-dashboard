export interface AAModelResponse {
  model_name: string;
  serving_runtime: string;
  api_protocol: string;
  version: string;
  usecase: string;
  description: string;
  endpoints: string[];
}

export interface AIModel extends AAModelResponse {
  id: string;
  playgroundStatus: string;
  // Parse endpoints into usable format
  internalEndpoint?: string;
  externalEndpoint?: string;
}

export interface AIModelTableColumn {
  field: string;
  label: string;
  sortable: boolean;
  width?: number;
  info?: {
    popover: string;
    popoverProps?: {
      showClose?: boolean;
    };
  };
}
