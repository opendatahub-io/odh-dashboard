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

/**
 * The parts of an image reference `[HOST[:PORT]/]NAMESPACE/NAME[:TAG]`.
 * Absent parts are '' (e.g. a bare `model:1.0` yields `['', '', 'model', '1.0']`).
 */
export type NIMImageParts = [host: string, namespace: string, name: string, tag: string];

// The standard OCI rule: a first path segment is a registry host (not part of the namespace) only
// if it carries a dot, a port colon, or is localhost.
const isRegistryHost = (segment: string): boolean =>
  segment.includes('.') || segment.includes(':') || segment === 'localhost';

/**
 * Parses `[HOST[:PORT]/]NAMESPACE/NAME[:TAG]` into its parts. The tag is only read from the
 * final path segment, so a `HOST:PORT` colon is never mistaken for a tag.
 */
export const parseImageString = (image: string): NIMImageParts => {
  const lastSlash = image.lastIndexOf('/');
  const tagColon = image.indexOf(':', lastSlash + 1);
  const tag = tagColon === -1 ? '' : image.slice(tagColon + 1);
  const path = tagColon === -1 ? image : image.slice(0, tagColon);

  const segments = path.split('/');
  const host = segments.length > 1 && isRegistryHost(segments[0]) ? segments.shift() ?? '' : '';
  const name = segments.pop() ?? '';
  return [host, segments.join('/'), name, tag];
};

/** Inverse of {@link parseImageString}; empty parts are dropped so no stray `/` or `:` remains. */
export const formatImageString = ([host, namespace, name, tag]: NIMImageParts): string => {
  const path = [host, namespace, name].filter(Boolean).join('/');
  return tag ? `${path}:${tag}` : path;
};
