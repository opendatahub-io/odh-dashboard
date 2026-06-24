import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sDSGResource, ServingRuntimeKind, TemplateKind } from './k8sTypes';

const createServingRuntimeCustomError = (name: string, message: string): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

export const isServingRuntimeKind = (
  obj: K8sResourceCommon | K8sDSGResource,
): obj is ServingRuntimeKind => {
  if (obj.kind !== 'ServingRuntime') {
    throw createServingRuntimeCustomError('Invalid parameter', 'kind: must be ServingRuntime.');
  }
  if (!obj.spec?.containers) {
    throw createServingRuntimeCustomError('Missing parameter', 'spec.containers: is required.');
  }
  if (!obj.spec.supportedModelFormats) {
    throw createServingRuntimeCustomError(
      'Missing parameter',
      'spec.supportedModelFormats: is required.',
    );
  }
  return true;
};

export const getServingRuntimeFromTemplate = (
  template?: TemplateKind,
): ServingRuntimeKind | undefined => {
  try {
    if (!template || !isServingRuntimeKind(template.objects[0])) {
      return undefined;
    }
  } catch (e) {
    return undefined;
  }

  const apiProtocolAttribute = 'opendatahub.io/apiProtocol';
  const servingRuntimeObj = { ...template.objects[0] };
  const metadata = { ...template.objects[0].metadata };

  if (metadata.annotations && template.metadata.annotations?.[apiProtocolAttribute]) {
    metadata.annotations[apiProtocolAttribute] =
      template.metadata.annotations[apiProtocolAttribute];
  }

  servingRuntimeObj.metadata = metadata;

  return servingRuntimeObj;
};
