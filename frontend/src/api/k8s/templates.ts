import YAML from 'yaml';
import React from 'react';
import {
  k8sDeleteResource,
  k8sGetResource,
  WatchK8sResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { KnownLabels, ServingRuntimeKind, TemplateKind } from '#~/k8sTypes';
import { TemplateModel } from '#~/api/models';
import { genRandomChars } from '#~/utilities/string';
import {
  CustomWatchK8sResult,
  ServingRuntimeAPIProtocol,
  ServingRuntimePlatform,
  ServingRuntimeModelType,
} from '#~/types';
import useModelServingEnabled from '#~/pages/modelServing/useModelServingEnabled';
import useCustomServingRuntimesEnabled from '#~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { groupVersionKind } from '#~/api/k8sUtils';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

export const assembleServingRuntimeTemplate = (
  body: string,
  namespace: string,
  platforms: ServingRuntimePlatform[],
  apiProtocol: ServingRuntimeAPIProtocol | undefined,
  modelTypes: ServingRuntimeModelType[],
  templateName?: string,
): TemplateKind & { objects: ServingRuntimeKind[] } => {
  const servingRuntime: ServingRuntimeKind = YAML.parse(body);
  const name = `template-${genRandomChars()}`;
  const servingRuntimeName = servingRuntime.metadata.name;

  if (!servingRuntimeName) {
    throw new Error('Serving runtime name is required');
  }

  return {
    kind: 'Template',
    apiVersion: 'template.openshift.io/v1',
    metadata: {
      name: templateName || name,
      namespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        'opendatahub.io/modelServingSupport': JSON.stringify(platforms),
        ...(modelTypes.length > 0 && {
          'opendatahub.io/modelServingType': JSON.stringify(modelTypes),
        }),
        ...(apiProtocol && { 'opendatahub.io/apiProtocol': apiProtocol }),
      },
    },
    objects: [servingRuntime],
    parameters: [],
  };
};

export const useTemplates = (namespace?: string): CustomWatchK8sResult<TemplateKind[]> => {
  const modelServingEnabled = useModelServingEnabled();
  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const initResource: WatchK8sResource | null =
    namespace && modelServingEnabled
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(TemplateModel),
          namespace,
          selector: { matchLabels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' } },
        }
      : null;

  const [templatesData, loaded, error] = useK8sWatchResourceList<TemplateKind[]>(
    initResource,
    TemplateModel,
  );

  const templates = React.useMemo(
    () =>
      customServingRuntimesEnabled
        ? templatesData
        : templatesData.filter(
            (template) => template.metadata.labels?.['opendatahub.io/ootb'] === 'true',
          ),
    [templatesData, customServingRuntimesEnabled],
  );

  if (!namespace || !modelServingEnabled) {
    return [templates, false, undefined];
  }

  return [templates, loaded, error];
};

export const deleteTemplate = (name: string, namespace: string): Promise<TemplateKind> =>
  k8sDeleteResource<TemplateKind>({
    model: TemplateModel,
    queryOptions: { name, ns: namespace },
  });

export const getTemplate = (name: string, namespace: string): Promise<TemplateKind> =>
  k8sGetResource<TemplateKind>({
    model: TemplateModel,
    queryOptions: { name, ns: namespace },
  });
