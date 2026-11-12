import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { removeManagedFields } from './removeManagedFields';
import { DeploymentAssemblyResources } from '../../../../extension-points/deployment-wizard';

// The wizard requires named, namespaced resources. Extensions validate kind-specific fields.
const kubernetesResourceSchema = z
  .object({
    apiVersion: z.string().min(1),
    kind: z.string().min(1),
    metadata: z
      .object({
        name: z.string().min(1),
        namespace: z.string().min(1),
        annotations: z.record(z.string()).optional(),
        labels: z.record(z.string()).optional(),
      })
      .passthrough(),
    spec: z.record(z.any()),
  })
  .passthrough();

export type YamlParseResult = {
  yaml: string;
  error?: Error;
};

export const convertResourcesToYaml = (
  resources?: DeploymentAssemblyResources,
): YamlParseResult => {
  try {
    if (!resources?.model) {
      return {
        yaml: '',
      };
    }

    return { yaml: stringify(removeManagedFields(resources.model)) };
  } catch (error) {
    const message = 'Failed to generate YAML from deployment resources';

    return {
      yaml: '',
      error: new Error(error instanceof Error ? `${message}: ${error.message}` : message),
    };
  }
};

export type ResourcesParseResult = {
  resources: DeploymentAssemblyResources;
  error?: Error;
};

export const convertYamlToResources = (yaml?: string): ResourcesParseResult => {
  try {
    if (!yaml?.trim()) {
      throw new Error('YAML cannot be empty');
    }
    const model: unknown = parse(yaml);
    const result = kubernetesResourceSchema.safeParse(model);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'resource'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid Kubernetes resource YAML: ${details}`);
    }
    return { resources: { model: result.data } };
  } catch (error) {
    return {
      resources: { model: undefined },
      error: error instanceof Error ? error : new Error('Failed to parse YAML'),
    };
  }
};
