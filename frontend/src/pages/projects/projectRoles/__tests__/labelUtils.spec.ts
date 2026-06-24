import {
  toK8sLabels,
  fromK8sLabels,
  getUserLabels,
} from '#~/pages/projects/projectRoles/labelUtils';
import { USER_LABEL_PREFIX } from '#~/pages/projects/projectRoles/const';

describe('toK8sLabels', () => {
  it('should prepend the prefix to each key', () => {
    const entries = [
      { id: 'l-1', key: 'team', value: 'platform' },
      { id: 'l-2', key: 'env', value: 'production' },
    ];

    expect(toK8sLabels(entries)).toStrictEqual({
      [`${USER_LABEL_PREFIX}team`]: 'platform',
      [`${USER_LABEL_PREFIX}env`]: 'production',
    });
  });

  it('should skip entries with empty keys', () => {
    const entries = [
      { id: 'l-1', key: '', value: 'platform' },
      { id: 'l-2', key: 'env', value: 'production' },
    ];

    expect(toK8sLabels(entries)).toStrictEqual({
      [`${USER_LABEL_PREFIX}env`]: 'production',
    });
  });

  it('should skip entries with whitespace-only keys', () => {
    const entries = [
      { id: 'l-1', key: '   ', value: 'platform' },
      { id: 'l-2', key: 'env', value: 'production' },
    ];

    expect(toK8sLabels(entries)).toStrictEqual({
      [`${USER_LABEL_PREFIX}env`]: 'production',
    });
  });

  it('should trim leading and trailing whitespace from keys', () => {
    const entries = [{ id: 'l-1', key: '  team  ', value: 'val' }];

    expect(toK8sLabels(entries)).toStrictEqual({
      [`${USER_LABEL_PREFIX}team`]: 'val',
    });
  });

  it('should return empty object for empty array', () => {
    expect(toK8sLabels([])).toStrictEqual({});
  });
});

describe('fromK8sLabels', () => {
  it('should extract and strip prefixed labels', () => {
    const labels = {
      'opendatahub.io/dashboard': 'true',
      [`${USER_LABEL_PREFIX}team`]: 'platform',
      [`${USER_LABEL_PREFIX}env`]: 'production',
    };

    const result = fromK8sLabels(labels);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'team', value: 'platform' }),
        expect.objectContaining({ key: 'env', value: 'production' }),
      ]),
    );
  });

  it('should return empty array when no prefixed labels exist', () => {
    const labels = {
      'opendatahub.io/dashboard': 'true',
      'some-other-label': 'value',
    };

    expect(fromK8sLabels(labels)).toHaveLength(0);
  });

  it('should return empty array for undefined labels', () => {
    expect(fromK8sLabels(undefined)).toHaveLength(0);
  });

  it('should return empty array for null labels', () => {
    expect(fromK8sLabels(null)).toHaveLength(0);
  });

  it('should return empty array for empty object', () => {
    expect(fromK8sLabels({})).toHaveLength(0);
  });

  it('should skip labels where key is exactly the prefix with no suffix', () => {
    const labels = {
      [USER_LABEL_PREFIX]: 'orphan',
      [`${USER_LABEL_PREFIX}team`]: 'platform',
    };

    const result = fromK8sLabels(labels);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('team');
  });

  it('should generate unique ids for each entry', () => {
    const labels = {
      [`${USER_LABEL_PREFIX}a`]: '1',
      [`${USER_LABEL_PREFIX}b`]: '2',
    };

    const result = fromK8sLabels(labels);

    expect(result[0].id).toBeDefined();
    expect(result[1].id).toBeDefined();
    expect(result[0].id).not.toBe(result[1].id);
  });
});

describe('getUserLabels', () => {
  it('should return only user-defined labels with prefix stripped', () => {
    const labels = {
      'opendatahub.io/dashboard': 'true',
      [`${USER_LABEL_PREFIX}team`]: 'platform',
      [`${USER_LABEL_PREFIX}env`]: 'production',
      'some-other-label': 'value',
    };

    expect(getUserLabels(labels)).toStrictEqual({
      team: 'platform',
      env: 'production',
    });
  });

  it('should return empty object when no user labels exist', () => {
    const labels = {
      'opendatahub.io/dashboard': 'true',
    };

    expect(getUserLabels(labels)).toStrictEqual({});
  });

  it('should return empty object for undefined labels', () => {
    expect(getUserLabels(undefined)).toStrictEqual({});
  });

  it('should return empty object for null labels', () => {
    expect(getUserLabels(null)).toStrictEqual({});
  });

  it('should return empty object for empty object', () => {
    expect(getUserLabels({})).toStrictEqual({});
  });

  it('should skip labels where key is exactly the prefix with no suffix', () => {
    const labels = {
      [USER_LABEL_PREFIX]: 'orphan',
      [`${USER_LABEL_PREFIX}team`]: 'platform',
    };

    expect(getUserLabels(labels)).toStrictEqual({ team: 'platform' });
  });
});
