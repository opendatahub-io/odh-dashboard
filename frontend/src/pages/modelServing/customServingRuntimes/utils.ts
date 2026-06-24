import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { TemplateKind, ServingRuntimeKind } from '@odh-dashboard/k8s-core';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/k8s-core';

import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimePlatform,
  ServingRuntimeModelType,
} from '#~/types';
import { asEnumMember } from '#~/utilities/utils';
import { CreatingServingRuntimeObject } from '#~/pages/modelServing/screens/types';

type DataKeys = keyof CreatingServingRuntimeObject;

type ServingRuntimeTemplateOptions = {
  template: TemplateKind;
  scope: string;
  currentScope: string;
  currentTemplateName: string;
  setData: (key: DataKeys, value: string) => void;
  setDisplayName: (name: string) => void;
  resetModelFormat?: () => void;
};

export const getTemplateEnabled = (
  template: TemplateKind,
  templateDisablement: string[],
): boolean => !templateDisablement.includes(getServingRuntimeNameFromTemplate(template));

export const getTemplateEnabledForPlatform = (
  template: TemplateKind,
  platform: ServingRuntimePlatform,
): boolean => getEnabledPlatformsFromTemplate(template).includes(platform);

export const getSortedTemplates = (templates: TemplateKind[], order: string[]): TemplateKind[] =>
  templates.toSorted(
    (a, b) =>
      order.indexOf(getServingRuntimeNameFromTemplate(a)) -
      order.indexOf(getServingRuntimeNameFromTemplate(b)),
  );

export const setListDisabled = (
  template: TemplateKind,
  listTemplates: TemplateKind[],
  templateDisablement: string[],
  isDisabled: boolean,
): string[] => {
  const servingRuntimeName = getServingRuntimeNameFromTemplate(template);
  const templateDisablementFiltered = templateDisablement.filter((item) =>
    listTemplates.find((t) => getServingRuntimeNameFromTemplate(t) === item),
  );
  if (isDisabled) {
    if (!templateDisablementFiltered.includes(servingRuntimeName)) {
      return [...templateDisablementFiltered, servingRuntimeName];
    }
  } else {
    return templateDisablementFiltered.filter((item) => item !== servingRuntimeName);
  }
  return templateDisablementFiltered;
};

export const getServingRuntimeDisplayNameFromTemplate = (template: TemplateKind): string =>
  getDisplayNameFromK8sResource(template.objects[0]);

export const getServingRuntimeNameFromTemplate = (template: TemplateKind): string =>
  template.objects[0].metadata.name;

export const getServingRuntimeFromName = (
  templateName: string,
  templateList: TemplateKind[] = [],
): ServingRuntimeKind | undefined => {
  const template = templateList.find((t) => getServingRuntimeNameFromTemplate(t) === templateName);
  return getServingRuntimeFromTemplate(template);
};

export const getDisplayNameFromServingRuntimeTemplate = (resource: ServingRuntimeKind): string => {
  const templateName =
    resource.metadata.annotations?.['opendatahub.io/template-display-name'] ||
    resource.metadata.annotations?.['opendatahub.io/template-name'];
  const legacyTemplateName =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- K8s resources can arrive without spec at runtime (RHOAIENG-32511)
    resource.spec?.builtInAdapter?.serverType === 'ovms' ? 'OpenVINO Model Server' : undefined;

  return templateName || legacyTemplateName || 'Unknown Serving Runtime';
};

export const getServingRuntimeVersion = (
  resource: ServingRuntimeKind | TemplateKind | undefined,
): string | undefined => {
  if (!resource) {
    return undefined;
  }
  if (isTemplateKind(resource)) {
    return (
      resource.objects[0].metadata.annotations?.['opendatahub.io/runtime-version'] || undefined
    );
  }
  return resource.metadata.annotations?.['opendatahub.io/runtime-version'] || undefined;
};

export const getTemplateNameFromServingRuntime = (
  resource: ServingRuntimeKind,
): string | undefined => resource.metadata.annotations?.['opendatahub.io/template-name'];

export const findTemplateByName = (
  templates: TemplateKind[],
  templateName: string,
): TemplateKind | undefined =>
  templates.find(
    (t) =>
      getServingRuntimeNameFromTemplate(t) === templateName || t.metadata.name === templateName,
  );

export const isTemplateKind = (resource: K8sResourceCommon): resource is TemplateKind =>
  resource.kind === 'Template';

export const getEnabledPlatformsFromTemplate = (
  template: TemplateKind,
): ServingRuntimePlatform[] => {
  if (!template.metadata.annotations?.['opendatahub.io/modelServingSupport']) {
    return [ServingRuntimePlatform.SINGLE];
  }

  try {
    const platforms = JSON.parse(
      template.metadata.annotations['opendatahub.io/modelServingSupport'],
    );
    if (platforms.length === 0) {
      return [ServingRuntimePlatform.SINGLE];
    }
    return platforms;
  } catch (e) {
    return [ServingRuntimePlatform.SINGLE];
  }
};

export const getAPIProtocolFromTemplate = (
  template: TemplateKind,
): ServingRuntimeAPIProtocol | undefined => {
  if (!template.metadata.annotations?.['opendatahub.io/apiProtocol']) {
    return undefined;
  }
  return (
    asEnumMember(
      template.metadata.annotations['opendatahub.io/apiProtocol'],
      ServingRuntimeAPIProtocol,
    ) ?? undefined
  );
};

export const getModelTypesFromTemplate = (template: TemplateKind): ServingRuntimeModelType[] => {
  if (!template.metadata.annotations?.['opendatahub.io/model-type']) {
    return [];
  }

  try {
    const modelTypes = JSON.parse(template.metadata.annotations['opendatahub.io/model-type']);
    if (!Array.isArray(modelTypes)) {
      return [];
    }
    const validTypes: ServingRuntimeModelType[] = [];
    for (const type of modelTypes) {
      if (
        type === ServingRuntimeModelType.PREDICTIVE ||
        type === ServingRuntimeModelType.GENERATIVE
      ) {
        validTypes.push(type);
      }
    }
    return validTypes;
  } catch (e) {
    return [];
  }
};

export const getAPIProtocolFromServingRuntime = (
  resource: ServingRuntimeKind,
): ServingRuntimeAPIProtocol | undefined => {
  if (!resource.metadata.annotations?.['opendatahub.io/apiProtocol']) {
    return undefined;
  }
  return (
    asEnumMember(
      resource.metadata.annotations['opendatahub.io/apiProtocol'],
      ServingRuntimeAPIProtocol,
    ) ?? undefined
  );
};

export const getKServeTemplates = (
  templates: TemplateKind[],
  templateOrder: string[],
  templateDisablement: string[],
): TemplateKind[] => {
  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );
  return templatesEnabled.filter((template) =>
    getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
  );
};

export const setServingRuntimeTemplate = ({
  template,
  scope,
  currentScope,
  currentTemplateName,
  setData,
  setDisplayName,
  resetModelFormat,
}: ServingRuntimeTemplateOptions): void => {
  const templateName = getServingRuntimeNameFromTemplate(template);
  const hasChanged = templateName !== currentTemplateName || scope !== currentScope;

  if (!hasChanged) {
    return;
  }

  setData('servingRuntimeTemplateName', templateName);
  setData('scope', scope);
  setDisplayName(getServingRuntimeDisplayNameFromTemplate(template));

  if (resetModelFormat) {
    resetModelFormat();
  }
};
