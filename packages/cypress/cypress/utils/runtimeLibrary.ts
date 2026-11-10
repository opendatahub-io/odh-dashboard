import {
  ServingRuntimeAPIProtocol,
  ServingRuntimeModelType,
} from '@odh-dashboard/model-serving/shared';
import type { RuntimeLibraryInstallTestData, RuntimeLibraryTemplateTestData } from '../types';

export type LibraryResourceMetadata = {
  name: string;
  namespace?: string;
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
  [key: string]: unknown;
};

export type LibraryResource = {
  apiVersion: string;
  kind: string;
  metadata: LibraryResourceMetadata;
  spec: Record<string, unknown>;
};

export type LibraryTemplate = {
  apiVersion: string;
  kind: string;
  metadata: LibraryResourceMetadata;
  objects: LibraryResource[];
};

const readRecord = (value: unknown, context: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
};

const readString = (value: unknown, context: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${context} must be a nonempty string`);
  }
  return value;
};

const readStringMap = (value: unknown, context: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries(readRecord(value, context)).map(([key, entry]) => {
      if (typeof entry !== 'string') {
        throw new Error(`${context}.${key} must be a string`);
      }
      return [key, entry];
    }),
  );

const readMetadata = (value: unknown): LibraryResourceMetadata => {
  const metadata = readRecord(value, 'Resource metadata');
  return {
    ...metadata,
    name: readString(metadata.name, 'Resource metadata.name'),
    ...(metadata.namespace !== undefined && {
      namespace: readString(metadata.namespace, 'Resource metadata.namespace'),
    }),
    ...(metadata.annotations !== undefined && {
      annotations: readStringMap(metadata.annotations, 'Resource annotations'),
    }),
    ...(metadata.labels !== undefined && {
      labels: readStringMap(metadata.labels, 'Resource labels'),
    }),
  };
};

export const parseLibraryResource = (
  value: unknown,
  expected: Pick<RuntimeLibraryInstallTestData, 'resourceKind' | 'resourceApiVersion'>,
): LibraryResource => {
  const resource = readRecord(value, 'Library resource');
  expect(resource.kind, 'Library resource kind').to.equal(expected.resourceKind);
  expect(resource.apiVersion, 'Library resource API version').to.equal(expected.resourceApiVersion);
  const spec = readRecord(resource.spec, 'Library resource spec');
  expect(Object.keys(spec), 'Nonempty library resource spec').to.have.length.greaterThan(0);
  return {
    apiVersion: expected.resourceApiVersion,
    kind: expected.resourceKind,
    metadata: readMetadata(resource.metadata),
    spec,
  };
};

export const parseLibraryTemplate = (
  value: unknown,
  expected: RuntimeLibraryTemplateTestData,
): LibraryTemplate => {
  const template = readRecord(value, 'Displayed Template');
  expect(template.kind, 'Displayed Template kind').to.equal(expected.templateKind);
  expect(template.apiVersion, 'Displayed Template API version').to.equal(
    expected.templateApiVersion,
  );
  if (!Array.isArray(template.objects) || template.objects.length === 0) {
    throw new Error('The first search result must display a Template with a ServingRuntime object');
  }
  return {
    apiVersion: expected.templateApiVersion,
    kind: expected.templateKind,
    metadata: readMetadata(template.metadata),
    objects: [parseLibraryResource(template.objects[0], expected)],
  };
};

export const getLibraryTemplateSelections = (
  template: LibraryTemplate,
): { apiProtocol: ServingRuntimeAPIProtocol; modelTypes: ServingRuntimeModelType[] } => {
  const { annotations } = template.metadata;
  const apiProtocol = readString(
    annotations?.['opendatahub.io/apiProtocol'],
    'Template API protocol',
  );
  expect(apiProtocol, 'Supported source API protocol').to.be.oneOf(
    Object.values(ServingRuntimeAPIProtocol),
  );
  const modelTypes: unknown = JSON.parse(
    readString(annotations?.['opendatahub.io/model-type'], 'Template model types'),
  );
  if (!Array.isArray(modelTypes) || modelTypes.length === 0) {
    throw new Error('The source Template must specify at least one model type');
  }
  modelTypes.forEach((modelType: unknown) => {
    expect(modelType, 'Supported source model type').to.be.oneOf(
      Object.values(ServingRuntimeModelType),
    );
  });
  return {
    apiProtocol: apiProtocol as ServingRuntimeAPIProtocol,
    modelTypes: modelTypes as ServingRuntimeModelType[],
  };
};
