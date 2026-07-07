import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  isUnsupportedResource,
  isUnsupportedAccepted,
  isUnsupportedUnaccepted,
} from '../unsupportedResources';

const makeResource = (annotations?: Record<string, string>): K8sResourceCommon => ({
  apiVersion: 'v1',
  kind: 'LLMInferenceServiceConfig',
  metadata: {
    name: 'test-config',
    ...(annotations ? { annotations } : {}),
  },
});

describe('unsupportedResources', () => {
  describe('isUnsupportedResource', () => {
    it('should return false when no annotations', () => {
      expect(isUnsupportedResource(makeResource())).toBe(false);
    });

    it('should return false when support-status is not "unsupported"', () => {
      expect(
        isUnsupportedResource(makeResource({ 'opendatahub.io/support-status': 'supported' })),
      ).toBe(false);
    });

    it('should return true when support-status is "unsupported"', () => {
      expect(
        isUnsupportedResource(makeResource({ 'opendatahub.io/support-status': 'unsupported' })),
      ).toBe(true);
    });

    it('should return false when metadata is undefined', () => {
      expect(isUnsupportedResource({ apiVersion: 'v1', kind: 'Test' })).toBe(false);
    });
  });

  describe('isUnsupportedAccepted', () => {
    it('should return false when not unsupported', () => {
      expect(isUnsupportedAccepted(makeResource())).toBe(false);
    });

    it('should return false when unsupported but no acceptance annotation', () => {
      expect(
        isUnsupportedAccepted(makeResource({ 'opendatahub.io/support-status': 'unsupported' })),
      ).toBe(false);
    });

    it('should return true when unsupported and accepted is "true"', () => {
      expect(
        isUnsupportedAccepted(
          makeResource({
            'opendatahub.io/support-status': 'unsupported',
            'opendatahub.io/unsupported-status-accepted': 'true',
          }),
        ),
      ).toBe(true);
    });

    it('should return false when unsupported and accepted is "false"', () => {
      expect(
        isUnsupportedAccepted(
          makeResource({
            'opendatahub.io/support-status': 'unsupported',
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
        isUnsupportedUnaccepted(makeResource({ 'opendatahub.io/support-status': 'unsupported' })),
      ).toBe(true);
    });

    it('should return true when unsupported and accepted is "false"', () => {
      expect(
        isUnsupportedUnaccepted(
          makeResource({
            'opendatahub.io/support-status': 'unsupported',
            'opendatahub.io/unsupported-status-accepted': 'false',
          }),
        ),
      ).toBe(true);
    });

    it('should return false when unsupported and accepted is "true"', () => {
      expect(
        isUnsupportedUnaccepted(
          makeResource({
            'opendatahub.io/support-status': 'unsupported',
            'opendatahub.io/unsupported-status-accepted': 'true',
          }),
        ),
      ).toBe(false);
    });
  });
});
