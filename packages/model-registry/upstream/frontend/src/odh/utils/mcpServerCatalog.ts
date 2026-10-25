import type { McpServer, McpRuntimeMetadata } from '~/app/mcpServerCatalogTypes';
import type {
  MCPEnvVar,
  MCPServerCR,
  MCPStorageMount,
  McpDeploymentPrerequisite,
} from '~/odh/types/mcpDeploymentTypes';

const containerImageFrom = (server: McpServer): string => {
  const artifact = server.artifacts?.find((item) => item.uri);
  return artifact?.uri.replace(/^(oci|docker):\/\//, '') ?? '';
};

const configMapSource = (source: Record<string, unknown> | undefined) => {
  const value = source?.name;
  if (typeof value !== 'string') {
    return undefined;
  }
  return { name: value };
};

const secretSource = (source: Record<string, unknown> | undefined) => {
  const value = source?.secretName;
  if (typeof value !== 'string') {
    return undefined;
  }
  return { secretName: value };
};

const addDefaultContent = (
  values: Record<string, string>,
  key: { key: string; defaultContent?: string },
): Record<string, string> => {
  if (key.defaultContent === undefined) {
    return values;
  }
  return { ...values, [key.key]: key.defaultContent };
};

const storageMountsFrom = (metadata: McpRuntimeMetadata): MCPStorageMount[] => {
  const mounts: MCPStorageMount[] = [];

  metadata.prerequisites?.secrets?.forEach((secret) => {
    if (secret.mountAsFile && secret.mountPath) {
      mounts.push({
        path: secret.mountPath,
        source: { type: 'Secret', secret: { secretName: secret.name } },
      });
    }
  });

  metadata.prerequisites?.configMaps?.forEach((configMap) => {
    if (configMap.mountAsFile && configMap.mountPath) {
      mounts.push({
        path: configMap.mountPath,
        source: { type: 'ConfigMap', configMap: { name: configMap.name } },
      });
    }
  });

  metadata.storage?.forEach((mount) => {
    const existingIndex = mounts.findIndex((existing) => existing.path === mount.path);
    const converted: MCPStorageMount = {
      path: mount.path,
      permissions: mount.permissions,
      source: {
        type: mount.source.type,
        emptyDir: mount.source.emptyDir,
        configMap: configMapSource(mount.source.configMap),
        secret: secretSource(mount.source.secret),
      },
    };
    if (existingIndex >= 0) {
      mounts[existingIndex] = converted;
    } else {
      mounts.push(converted);
    }
  });

  if (metadata.capabilities?.requiresFileSystem && !mounts.some((mount) => mount.path === '/tmp')) {
    mounts.push({
      path: '/tmp',
      permissions: 'ReadWrite',
      source: { type: 'EmptyDir', emptyDir: {} },
    });
  }

  return mounts;
};

const envFrom = (metadata: McpRuntimeMetadata): MCPEnvVar[] => {
  const env: MCPEnvVar[] = [];

  metadata.requiredEnvironmentVariables?.forEach((item) => {
    env.push({ name: item.name, value: `<${item.name}>` });
  });

  metadata.prerequisites?.secrets?.forEach((secret) => {
    if (secret.mountAsFile) {
      return;
    }
    secret.keys?.forEach((key) => {
      env.push({
        name: key.envVarName || key.key,
        valueFrom: { secretKeyRef: { name: secret.name, key: key.key } },
      });
    });
  });

  metadata.prerequisites?.configMaps?.forEach((configMap) => {
    if (configMap.mountAsFile) {
      return;
    }
    configMap.keys?.forEach((key) => {
      env.push({
        name: key.envVarName || key.key,
        valueFrom: { configMapKeyRef: { name: configMap.name, key: key.key } },
      });
    });
  });

  return env;
};

/**
 * Builds the MCPServer resource from catalog metadata without requiring a second
 * server-side conversion request. The resulting YAML is intentionally the same
 * editable spec consumed by the existing MCP deployment BFF.
 */
export const mcpServerCatalogToCR = (server: McpServer, name: string): MCPServerCR | undefined => {
  const image = containerImageFrom(server);
  if (!image) {
    return undefined;
  }

  const metadata = server.runtimeMetadata ?? {};
  const cr: MCPServerCR = {
    apiVersion: 'mcp.x-k8s.io/v1alpha1',
    kind: 'MCPServer',
    metadata: { name },
    spec: {
      source: { type: 'ContainerImage', containerImage: { ref: image } },
      config: {
        port: metadata.defaultPort ?? 8080,
        path: metadata.mcpPath ?? '/mcp',
        arguments: metadata.defaultArgs,
        env: envFrom(metadata),
        storage: storageMountsFrom(metadata),
      },
    },
  };

  const serviceAccount = metadata.prerequisites?.serviceAccount;
  if (serviceAccount?.required) {
    cr.spec.runtime = {
      security: { serviceAccountName: serviceAccount.suggestedName || `${name}-sa` },
    };
  }

  return cr;
};

export const mcpServerCatalogImage = containerImageFrom;

export const mcpServerCatalogPrerequisites = (
  metadata: McpRuntimeMetadata,
): McpDeploymentPrerequisite[] => {
  const prerequisites: McpDeploymentPrerequisite[] = [];
  const serviceAccount = metadata.prerequisites?.serviceAccount;

  if (serviceAccount?.required) {
    prerequisites.push({
      type: 'ServiceAccount',
      name: serviceAccount.suggestedName || 'mcp-viewer',
      ...(serviceAccount.hint?.includes("'view' ClusterRole") ? { clusterRole: 'view' } : {}),
    });
  }

  metadata.prerequisites?.configMaps?.forEach((configMap) => {
    const data = configMap.keys?.reduce<Record<string, string>>(addDefaultContent, {}) ?? {};

    prerequisites.push({
      type: 'ConfigMap',
      name: configMap.name,
      ...(Object.keys(data).length > 0 ? { data } : {}),
    });
  });

  return prerequisites;
};
