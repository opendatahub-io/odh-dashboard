export type Gateway = {
  name: string;
  namespace: string;
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  providerCount: number;
  sandboxCount: number;
  isGlobal: boolean;
};

export type GatewayList = {
  gateways: Gateway[];
};

export type CreateGatewayRequest = {
  name: string;
  endpoint?: string;
  namespace?: string;
  isGlobal?: boolean;
  deploy?: boolean;
};
