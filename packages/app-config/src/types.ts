export type WorkspacePackage = {
  name: string;
  'module-federation'?: ModuleFederationConfig;
};

export type ProxyService = {
  authorize?: boolean;
  tls?: boolean;
  localService?: {
    host?: string;
    port?: number;
  };
  service: {
    name: string;
    namespace: string;
    port: number;
  };
};

export type ModuleFederationConfig = {
  name: string;
  backend?: {
    remoteEntry: string;
  } & ProxyService;
  proxyService?: ({
    path: string;
    pathRewrite?: string;
  } & ProxyService)[];
};

// deprecated
export type ModuleFederationConfigOld = {
  name: string;
  remoteEntry: string;
  tls?: boolean;
  authorize?: boolean;
  proxy?: {
    path: string;
    pathRewrite?: string;
  }[];
  local?: {
    host?: string;
    port?: number;
  };
  service: {
    name: string;
    namespace?: string;
    port: number;
  };
};
