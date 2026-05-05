import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { useEnabledModelServingConnectionTypes } from '../useEnabledConnectionTypes';

const createMockConnectionType = (
  name: string,
  fields: { envVar: string; type: string }[],
  annotations?: Record<string, string>,
): ConnectionTypeConfigMapObj => ({
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name,
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      'opendatahub.io/connection-type': 'true',
    },
    annotations,
  },
  data: {
    fields: fields.map((f) => ({
      envVar: f.envVar,
      name: f.envVar,
      required: true,
      type: f.type,
      properties: {},
    })),
  },
});

describe('useEnabledModelServingConnectionTypes', () => {
  const s3ConnectionType = createMockConnectionType('s3', [
    { envVar: 'AWS_ACCESS_KEY_ID', type: 'short-text' },
    { envVar: 'AWS_SECRET_ACCESS_KEY', type: 'hidden' },
    { envVar: 'AWS_S3_ENDPOINT', type: 'short-text' },
    { envVar: 'AWS_S3_BUCKET', type: 'short-text' },
  ]);

  const uriConnectionType = createMockConnectionType('uri-v1', [{ envVar: 'URI', type: 'uri' }]);

  const ociConnectionType = createMockConnectionType('oci-v1', [
    { envVar: 'OCI_HOST', type: 'short-text' },
    { envVar: '.dockerconfigjson', type: 'file' },
  ]);

  const disabledConnectionType = createMockConnectionType(
    'disabled-s3',
    [
      { envVar: 'AWS_ACCESS_KEY_ID', type: 'short-text' },
      { envVar: 'AWS_SECRET_ACCESS_KEY', type: 'hidden' },
      { envVar: 'AWS_S3_ENDPOINT', type: 'short-text' },
      { envVar: 'AWS_S3_BUCKET', type: 'short-text' },
    ],
    { 'opendatahub.io/disabled': 'true' },
  );

  it('should return empty arrays when no connection types are provided', () => {
    const { result } = renderHook(() => useEnabledModelServingConnectionTypes([]));

    expect(result.current.enabledConnectionTypes).toHaveLength(0);
    expect(result.current.uriConnectionTypes).toHaveLength(0);
    expect(result.current.ociConnectionTypes).toHaveLength(0);
    expect(result.current.s3ConnectionTypes).toHaveLength(0);
  });

  it('should filter out disabled connection types', () => {
    const { result } = renderHook(() =>
      useEnabledModelServingConnectionTypes([s3ConnectionType, disabledConnectionType]),
    );

    expect(result.current.enabledConnectionTypes).toHaveLength(1);
    expect(result.current.enabledConnectionTypes[0].metadata.name).toBe('s3');
  });

  it('should categorize S3 connection types', () => {
    const { result } = renderHook(() => useEnabledModelServingConnectionTypes([s3ConnectionType]));

    expect(result.current.s3ConnectionTypes).toHaveLength(1);
    expect(result.current.s3ConnectionTypes[0].metadata.name).toBe('s3');
    expect(result.current.uriConnectionTypes).toHaveLength(0);
    expect(result.current.ociConnectionTypes).toHaveLength(0);
  });

  it('should categorize URI connection types', () => {
    const { result } = renderHook(() => useEnabledModelServingConnectionTypes([uriConnectionType]));

    expect(result.current.uriConnectionTypes).toHaveLength(1);
    expect(result.current.uriConnectionTypes[0].metadata.name).toBe('uri-v1');
    expect(result.current.s3ConnectionTypes).toHaveLength(0);
    expect(result.current.ociConnectionTypes).toHaveLength(0);
  });

  it('should categorize OCI connection types', () => {
    const { result } = renderHook(() => useEnabledModelServingConnectionTypes([ociConnectionType]));

    expect(result.current.ociConnectionTypes).toHaveLength(1);
    expect(result.current.ociConnectionTypes[0].metadata.name).toBe('oci-v1');
    expect(result.current.s3ConnectionTypes).toHaveLength(0);
    expect(result.current.uriConnectionTypes).toHaveLength(0);
  });

  it('should categorize all types correctly when mixed', () => {
    const { result } = renderHook(() =>
      useEnabledModelServingConnectionTypes([
        s3ConnectionType,
        uriConnectionType,
        ociConnectionType,
        disabledConnectionType,
      ]),
    );

    expect(result.current.enabledConnectionTypes).toHaveLength(3);
    expect(result.current.s3ConnectionTypes).toHaveLength(1);
    expect(result.current.uriConnectionTypes).toHaveLength(1);
    expect(result.current.ociConnectionTypes).toHaveLength(1);
  });
});
