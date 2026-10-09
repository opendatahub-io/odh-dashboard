import { hasK8sIdentity, type TemplateKind } from '@odh-dashboard/k8s-core';
import { isServingRuntimeKind, isTemplateKind } from '@odh-dashboard/model-serving/shared';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A library Template is source data, not a live Kubernetes resource to recreate. */
export const parseServingRuntimeTemplate = (json: string): TemplateKind => {
  let resource: unknown;
  try {
    resource = JSON.parse(json);
  } catch {
    throw new Error(
      'The Serving runtime template is not valid JSON. Return to the Runtime image and try again.',
    );
  }

  if (!hasK8sIdentity(resource) || !isTemplateKind(resource) || !Array.isArray(resource.objects)) {
    throw new Error(
      'The Runtime image must contain a Kubernetes Template with a ServingRuntime object.',
    );
  }
  const runtime: unknown = resource.objects[0];
  if (!hasK8sIdentity(runtime) || runtime.kind !== 'ServingRuntime' || !isRecord(runtime.spec)) {
    throw new Error('The Template must have a named ServingRuntime as its first object.');
  }
  try {
    isServingRuntimeKind(runtime);
  } catch (error) {
    throw new Error(
      `The Template's ServingRuntime is invalid: ${
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'check the resource definition.'
      }`,
    );
  }

  const { metadata } = resource;
  const { annotations } = metadata;
  if (annotations !== undefined && !isRecord(annotations)) {
    throw new Error('The Template annotations must be an object.');
  }
  // Kubernetes annotations must be strings, but the source is untrusted JSON. Drop invalid
  // values so existing Template helpers can safely read them; missing protocol/model-type
  // annotations leave the required form inputs unselected and prevent submission.
  const safeAnnotations = Object.fromEntries(
    Object.entries(isRecord(annotations) ? annotations : {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
  const runtimeName = runtime.metadata?.name;
  if (typeof runtimeName !== 'string') {
    throw new Error('The ServingRuntime must have a name.');
  }
  const runtimeMetadata = { ...runtime.metadata, name: runtimeName };
  delete runtimeMetadata.resourceVersion;
  delete runtimeMetadata.uid;
  delete runtimeMetadata.managedFields;
  delete runtimeMetadata.ownerReferences;
  delete runtimeMetadata.namespace;
  delete runtimeMetadata.creationTimestamp;
  delete runtimeMetadata.generation;

  return {
    ...resource,
    metadata: {
      ...metadata,
      annotations: safeAnnotations,
    },
    objects: [{ ...runtime, metadata: runtimeMetadata }],
  };
};
