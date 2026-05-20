import { NIM_IMAGE_REGISTRY } from './constants';

export const normalizeVersion = (tag: string): string => {
  if (/^\d+(\.\d+)*$/.test(tag)) {
    const parts = tag.split('.').map(Number);
    while (parts.length < 3) {
      parts.push(0);
    }
    return parts.join('.');
  }
  return tag;
};

export const getImageRepository = (modelNamespace: string, modelName: string): string =>
  `${NIM_IMAGE_REGISTRY}/${modelNamespace}/${modelName}`;
