export interface AIModel {
  id: string;
  name: string;
  description: string;
  internalEndpoint?: string;
  externalEndpoint?: string;
  useCase: string;
  playgroundStatus: 'available' | 'not-available';
  deploymentName: string;
  // Fields from BFF API response
  modelName: string;
  apiProtocol: string;
  version: string;
  servingRuntime: string;
  endpoints: string[];
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
