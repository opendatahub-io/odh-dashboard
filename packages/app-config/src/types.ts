export type WorkspacePackage = {
  name: string;
  'module-federation'?: ModuleFederationConfig;
};

export type ModuleFederationConfig = {
  name: string;
  remoteEntry: string;
  tls?: boolean;
  authorize?: boolean;
  proxy: {
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
