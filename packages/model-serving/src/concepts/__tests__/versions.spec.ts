import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import {
  isUnsupportedResource,
  isUnsupportedAccepted,
  isUnsupportedUnaccepted,
  getServingRuntimeVersion,
  getFastVersion,
  RUNTIME_VERSION_ANNOTATION,
  FAST_VERSION_ANNOTATION,
  SUPPORT_STATUS_ANNOTATION,
} from '../versions';

const makeResource = (annotations?: Record<string, string>): K8sResourceCommon => ({
  apiVersion: 'v1',
  kind: 'LLMInferenceServiceConfig',
  metadata: {
    name: 'test-config',
    ...(annotations ? { annotations } : {}),
  },
});

const makeTemplate = (
  outerAnnotations?: Record<string, string>,
  innerAnnotations?: Record<string, string>,
): TemplateKind => ({
  apiVersion: 'template.openshift.io/v1',
  kind: 'Template',
  metadata: {
    name: 'test-template',
    namespace: 'opendatahub',
    ...(outerAnnotations ? { annotations: outerAnnotations } : {}),
  },
  objects: [
    {
      apiVersion: 'serving.kserve.io/v1alpha1',
      kind: 'ServingRuntime',
      metadata: {
        name: 'test-sr',
        ...(innerAnnotations ? { annotations: innerAnnotations } : {}),
      },
    },
  ],
  parameters: [],
});

describe('versions', () => {
  describe('isUnsupportedResource', () => {
    it('should return false when no annotations', () => {
      expect(isUnsupportedResource(makeResource())).toBe(false);
    });

    it('should return false when support-status is not "unsupported"', () => {
      expect(
        isUnsupportedResource(makeResource({ [SUPPORT_STATUS_ANNOTATION]: 'supported' })),
      ).toBe(false);
    });

    it('should return true when support-status is "unsupported"', () => {
      expect(
        isUnsupportedResource(makeResource({ [SUPPORT_STATUS_ANNOTATION]: 'unsupported' })),
      ).toBe(true);
    });

    it('should return false when metadata is undefined', () => {
      expect(isUnsupportedResource({ apiVersion: 'v1', kind: 'Test' })).toBe(false);
    });

    it('should check inner resource for Templates', () => {
      expect(
        isUnsupportedResource(
          makeTemplate(undefined, { [SUPPORT_STATUS_ANNOTATION]: 'unsupported' }),
        ),
      ).toBe(true);
    });

    it('should fall back to outer annotations for Templates', () => {
      expect(
        isUnsupportedResource(
          makeTemplate({ [SUPPORT_STATUS_ANNOTATION]: 'unsupported' }, undefined),
        ),
      ).toBe(true);
    });
  });

  describe('isUnsupportedAccepted', () => {
    it('should return false when not unsupported', () => {
      expect(isUnsupportedAccepted(makeResource())).toBe(false);
    });

    it('should return false when unsupported but no acceptance annotation', () => {
      expect(
        isUnsupportedAccepted(makeResource({ [SUPPORT_STATUS_ANNOTATION]: 'unsupported' })),
      ).toBe(false);
    });

    it('should return true when unsupported and accepted is "true"', () => {
      expect(
        isUnsupportedAccepted(
          makeResource({
            [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
            'opendatahub.io/unsupported-status-accepted': 'true',
          }),
        ),
      ).toBe(true);
    });

    it('should return false when unsupported and accepted is "false"', () => {
      expect(
        isUnsupportedAccepted(
          makeResource({
            [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
            'opendatahub.io/unsupported-status-accepted': 'false',
          }),
        ),
      ).toBe(false);
    });
  });

  describe('isUnsupportedUnaccepted', () => {
    it('should return false when not unsupported', () => {
      expect(isUnsupportedUnaccepted(makeResource())).toBe(false);
    });

    it('should return true when unsupported with no acceptance annotation', () => {
      expect(
        isUnsupportedUnaccepted(makeResource({ [SUPPORT_STATUS_ANNOTATION]: 'unsupported' })),
      ).toBe(true);
    });

    it('should return true when unsupported and accepted is "false"', () => {
      expect(
        isUnsupportedUnaccepted(
          makeResource({
            [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
            'opendatahub.io/unsupported-status-accepted': 'false',
          }),
        ),
      ).toBe(true);
    });

    it('should return false when unsupported and accepted is "true"', () => {
      expect(
        isUnsupportedUnaccepted(
          makeResource({
            [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
            'opendatahub.io/unsupported-status-accepted': 'true',
          }),
        ),
      ).toBe(false);
    });
  });

  describe('getServingRuntimeVersion', () => {
    it('should return undefined for undefined resource', () => {
      expect(getServingRuntimeVersion(undefined)).toBeUndefined();
    });

    it('should return undefined when no annotations', () => {
      expect(getServingRuntimeVersion(makeResource())).toBeUndefined();
    });

    it('should return the version from a plain resource', () => {
      expect(
        getServingRuntimeVersion(makeResource({ [RUNTIME_VERSION_ANNOTATION]: '0.11.0+rhai5' })),
      ).toBe('0.11.0+rhai5');
    });

    it('should read from the inner resource for Templates', () => {
      expect(
        getServingRuntimeVersion(
          makeTemplate(undefined, { [RUNTIME_VERSION_ANNOTATION]: '0.11.0+rhai5' }),
        ),
      ).toBe('0.11.0+rhai5');
    });

    it('should fall back to outer annotations when inner has none', () => {
      expect(
        getServingRuntimeVersion(
          makeTemplate({ [RUNTIME_VERSION_ANNOTATION]: '0.10.5' }, undefined),
        ),
      ).toBe('0.10.5');
    });

    it('should prefer inner over outer annotation for Templates', () => {
      expect(
        getServingRuntimeVersion(
          makeTemplate(
            { [RUNTIME_VERSION_ANNOTATION]: '0.10.5' },
            { [RUNTIME_VERSION_ANNOTATION]: '0.11.0+rhai5' },
          ),
        ),
      ).toBe('0.11.0+rhai5');
    });
  });

  describe('getFastVersion', () => {
    it('should return undefined for undefined resource', () => {
      expect(getFastVersion(undefined)).toBeUndefined();
    });

    it('should return undefined when no annotations', () => {
      expect(getFastVersion(makeResource())).toBeUndefined();
    });

    it('should return the fast version from a plain resource', () => {
      expect(getFastVersion(makeResource({ [FAST_VERSION_ANNOTATION]: '1' }))).toBe('1');
    });

    it('should read from the inner resource for Templates', () => {
      expect(getFastVersion(makeTemplate(undefined, { [FAST_VERSION_ANNOTATION]: '2' }))).toBe('2');
    });

    it('should fall back to outer annotations when inner has none', () => {
      expect(getFastVersion(makeTemplate({ [FAST_VERSION_ANNOTATION]: '1' }, undefined))).toBe('1');
    });

    it('should prefer inner over outer annotation for Templates', () => {
      expect(
        getFastVersion(
          makeTemplate({ [FAST_VERSION_ANNOTATION]: '1' }, { [FAST_VERSION_ANNOTATION]: '2' }),
        ),
      ).toBe('2');
    });
  });
});
