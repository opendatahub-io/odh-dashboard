import { IdentifierResourceType } from '~/types';
import { isHardwareProfileIdentifierValid } from '~/pages/hardwareProfiles/utils';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

describe('hardwareProfileWarning', () => {
  it('should generate warnings for min being larger than max', () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '50Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should return true for valid identifiers', () => {
    const identifierMock = {
      displayName: 'CPU',
      identifier: 'cpu',
      resourceType: IdentifierResourceType.CPU,
      minCount: '1',
      maxCount: '2',
      defaultCount: '1',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(true);
  });

  it('should generate warnings for negative min value', () => {
    const identifierMock = {
      displayName: 'CPU',
      identifier: 'cpu',
      resourceType: IdentifierResourceType.CPU,
      minCount: '-100',
      maxCount: '2',
      defaultCount: '1',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for negative max value', async () => {
    const identifierMock = {
      displayName: 'CPU',
      identifier: 'cpu',
      resourceType: IdentifierResourceType.CPU,
      minCount: '1',
      maxCount: '-0.20',
      defaultCount: '1',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for negative default count', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '2Gi',
      maxCount: '5Gi',
      defaultCount: '-200Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for invalid identifier counts', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: 'Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for default value outside of min/max range', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '0Gi',
      maxCount: '5Gi',
      defaultCount: '6Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for decimal max', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '0Gi',
      maxCount: '5.428Gi',
      defaultCount: '2Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for decimal min', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '0.93Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });
  it('should generate warnings for decimal default count', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '0Gi',
      maxCount: '5Gi',
      defaultCount: '2.999Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });
});
