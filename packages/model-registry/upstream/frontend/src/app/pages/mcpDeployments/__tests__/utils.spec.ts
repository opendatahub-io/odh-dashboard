import {
  McpConditionType,
  McpConditionStatus,
  McpAcceptedReason,
  McpReadyReason,
  McpDeploymentCondition,
} from '~/app/mcpDeploymentTypes';
import {
  getCondition,
  isConditionTrue,
  getConnectionUrl,
  getDeploymentDisplayName,
  getStatusInfo,
  getStatusSortWeight,
} from '~/app/pages/mcpDeployments/utils';
import {
  createMockDeployment,
  createReadyConditions,
  createInitializingConditions,
  createFailedConditions,
} from './mcpDeploymentTestUtils';

describe('getCondition', () => {
  it('should return matching condition or undefined', () => {
    const conditions = createReadyConditions();
    expect(getCondition(conditions, McpConditionType.READY)).toBeDefined();
    expect(getCondition([], McpConditionType.READY)).toBeUndefined();
  });
});

describe('isConditionTrue', () => {
  it('should return true when condition status is True', () => {
    const condition: McpDeploymentCondition = {
      type: McpConditionType.READY,
      status: McpConditionStatus.TRUE,
    };
    expect(isConditionTrue(condition)).toBe(true);
  });

  it('should return false when condition status is False', () => {
    const condition: McpDeploymentCondition = {
      type: McpConditionType.READY,
      status: McpConditionStatus.FALSE,
    };
    expect(isConditionTrue(condition)).toBe(false);
  });

  it('should return false when condition is undefined', () => {
    expect(isConditionTrue(undefined)).toBe(false);
  });
});

describe('getDeploymentDisplayName', () => {
  it('should return displayName when set', () => {
    const deployment = createMockDeployment({
      displayName: 'My Kubernetes Server',
    });
    expect(getDeploymentDisplayName(deployment)).toBe('My Kubernetes Server');
  });

  it('should fall back to name when displayName is not set', () => {
    const deployment = createMockDeployment({ name: 'kubernetes-mcp' });
    expect(getDeploymentDisplayName(deployment)).toBe('kubernetes-mcp');
  });

  it('should fall back to name when displayName is empty string', () => {
    const deployment = createMockDeployment({
      displayName: '',
      name: 'kubernetes-mcp',
    });
    expect(getDeploymentDisplayName(deployment)).toBe('kubernetes-mcp');
  });
});

describe('getConnectionUrl', () => {
  it('should return address URL when Ready condition is True', () => {
    const deployment = createMockDeployment({
      conditions: createReadyConditions(),
      address: { url: 'https://kubernetes-mcp.example.com:8080' },
    });
    expect(getConnectionUrl(deployment)).toBe('https://kubernetes-mcp.example.com:8080');
  });

  it('should return undefined when no address URL is set', () => {
    const deployment = createMockDeployment({
      conditions: createReadyConditions(),
    });
    expect(getConnectionUrl(deployment)).toBeUndefined();
  });

  it('should return undefined when Ready condition is not True', () => {
    expect(
      getConnectionUrl(
        createMockDeployment({
          conditions: createFailedConditions(),
          address: { url: 'https://stale-url.example.com:8080' },
        }),
      ),
    ).toBeUndefined();
    expect(getConnectionUrl(createMockDeployment({ conditions: [] }))).toBeUndefined();
  });
});

describe('getStatusInfo', () => {
  it('should return Available for Ready=True', () => {
    const result = getStatusInfo(createReadyConditions());
    expect(result.label).toBe('Available');
    expect(result.status).toBe('success');
  });

  it('should return Initializing for Ready=False with Initializing reason', () => {
    const result = getStatusInfo(createInitializingConditions());
    expect(result.label).toBe('Initializing');
    expect(result.status).toBe('info');
  });

  it('should return Unavailable for Ready=False with DeploymentUnavailable reason', () => {
    const result = getStatusInfo(createFailedConditions());
    expect(result.label).toBe('Unavailable');
    expect(result.status).toBe('danger');
  });

  it('should return Configuration invalid for Accepted=False with Invalid reason', () => {
    const conditions: McpDeploymentCondition[] = [
      {
        type: McpConditionType.ACCEPTED,
        status: McpConditionStatus.FALSE,
        reason: McpAcceptedReason.INVALID,
        message: 'Invalid port configuration.',
      },
    ];
    const result = getStatusInfo(conditions);
    expect(result.label).toBe('Configuration invalid');
    expect(result.status).toBe('danger');
    expect(result.popoverBody).toBe('Invalid port configuration.');
  });

  it('should return Configuration invalid for Ready=False with ConfigurationInvalid reason', () => {
    const conditions: McpDeploymentCondition[] = [
      {
        type: McpConditionType.ACCEPTED,
        status: McpConditionStatus.TRUE,
        reason: McpAcceptedReason.VALID,
      },
      {
        type: McpConditionType.READY,
        status: McpConditionStatus.FALSE,
        reason: McpReadyReason.CONFIGURATION_INVALID,
        message: 'Container image pull failed.',
      },
    ];
    const result = getStatusInfo(conditions);
    expect(result.label).toBe('Configuration invalid');
    expect(result.status).toBe('danger');
    expect(result.popoverBody).toBe('Container image pull failed.');
  });

  it('should return Scaled to zero for Ready=False with ScaledToZero reason', () => {
    const conditions: McpDeploymentCondition[] = [
      {
        type: McpConditionType.ACCEPTED,
        status: McpConditionStatus.TRUE,
        reason: McpAcceptedReason.VALID,
      },
      {
        type: McpConditionType.READY,
        status: McpConditionStatus.FALSE,
        reason: McpReadyReason.SCALED_TO_ZERO,
        message: 'Scaled to zero replicas.',
      },
    ];
    const result = getStatusInfo(conditions);
    expect(result.label).toBe('Scaled to zero');
    expect(result.status).toBe('info');
  });

  it('should return Pending when there are no conditions', () => {
    const result = getStatusInfo([]);
    expect(result.label).toBe('Pending');
    expect(result.status).toBe('info');
  });

  it('should return Not ready for unknown Ready=False reason', () => {
    const conditions: McpDeploymentCondition[] = [
      {
        type: McpConditionType.READY,
        status: McpConditionStatus.FALSE,
        reason: 'SomeOtherReason',
        message: 'Something happened.',
      },
    ];
    const result = getStatusInfo(conditions);
    expect(result.label).toBe('Not ready');
    expect(result.status).toBe('warning');
    expect(result.popoverBody).toBe('Something happened.');
  });

  it('should prioritize Accepted=False over Ready condition', () => {
    const conditions: McpDeploymentCondition[] = [
      {
        type: McpConditionType.ACCEPTED,
        status: McpConditionStatus.FALSE,
        reason: McpAcceptedReason.INVALID,
        message: 'Bad config.',
      },
      {
        type: McpConditionType.READY,
        status: McpConditionStatus.FALSE,
        reason: McpReadyReason.DEPLOYMENT_UNAVAILABLE,
        message: 'Deploy failed.',
      },
    ];
    const result = getStatusInfo(conditions);
    expect(result.label).toBe('Configuration invalid');
    expect(result.popoverBody).toBe('Bad config.');
  });
});

describe('getStatusSortWeight', () => {
  it('should give lowest weight (first) to danger statuses', () => {
    expect(getStatusSortWeight(createFailedConditions())).toBe(0);
  });

  it('should give highest weight (last) to success statuses', () => {
    expect(getStatusSortWeight(createReadyConditions())).toBe(3);
  });

  it('should place info statuses in the middle', () => {
    expect(getStatusSortWeight(createInitializingConditions())).toBe(2);
  });
});
