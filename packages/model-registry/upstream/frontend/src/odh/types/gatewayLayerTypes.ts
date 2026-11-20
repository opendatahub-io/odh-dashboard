export type GatewayLayerComponentStatus =
  | 'not_installed'
  | 'installed'
  | 'healthy'
  | 'usable'
  | 'blocked'
  | 'not_implemented'
  | 'not_checked'
  | 'partial';

export type GatewayLayerComponent = {
  id: string;
  name: string;
  status: GatewayLayerComponentStatus;
  installed: boolean;
  healthy: boolean;
  usable: boolean;
  usabilityChecked: boolean;
  message?: string;
  evidence?: string;
};

export type GatewayLayerStatus = {
  layer: string;
  namespace: string;
  overallStatus: GatewayLayerComponentStatus;
  installed: boolean;
  healthy: boolean;
  usable: boolean;
  usabilityChecked: boolean;
  message?: string;
  components: GatewayLayerComponent[];
};

export type GatewayLayerUsability = {
  checked: boolean;
  usable: boolean;
  message?: string;
  checkedAt?: string;
};
