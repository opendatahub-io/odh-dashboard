import { filterDeploymentEventRows, toDeploymentEventRows } from '../deploymentEventRows';

const time = '2026-11-23T12:00:00Z';
const latest = '2026-11-23T12:10:00Z';
const createEvent = (uid: string, sourceUid?: string) => ({
  metadata: { uid, creationTimestamp: time },
  involvedObject: { uid: sourceUid, kind: 'ReplicaSet', name: 'predictor' },
  reason: 'FailedCreate',
  message: 'Exceeded quota',
  type: 'Warning',
});

it('should require matching source UID and stable Event identity', () => {
  expect(
    toDeploymentEventRows('source', [
      createEvent('invalid'),
      createEvent('', 'source'),
      createEvent('foreign', 'elsewhere'),
      createEvent('valid', 'source'),
    ]),
  ).toEqual([
    {
      uid: 'valid',
      severity: 'Warning',
      reason: 'FailedCreate',
      message: 'Exceeded quota',
      source: 'ReplicaSet/predictor',
      timestamp: Date.parse(time),
    },
  ]);
});

it('should prefer the latest valid observation and sort unknown times last', () => {
  const rows = toDeploymentEventRows('source', [
    { ...createEvent('unknown', 'source'), metadata: { uid: 'unknown' }, eventTime: 'invalid' },
    { ...createEvent('b', 'source'), series: { lastObservedTime: 'invalid' }, lastTimestamp: time },
    { ...createEvent('a', 'source'), lastTimestamp: time, eventTime: latest },
    {
      ...createEvent('latest', 'source'),
      series: { lastObservedTime: latest },
      lastTimestamp: time,
    },
  ]);
  expect(
    filterDeploymentEventRows(rows, '  REPLICASET/PREDICTOR  ', 'Warning').map(({ uid }) => uid),
  ).toEqual(['latest', 'a', 'b', 'unknown']);
  expect(rows.find(({ uid }) => uid === 'unknown')?.timestamp).toBeUndefined();
});
