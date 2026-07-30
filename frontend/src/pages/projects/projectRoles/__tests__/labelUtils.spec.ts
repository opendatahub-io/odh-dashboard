import {
  toK8sLabels,
  fromK8sLabels,
  getUserLabels,
  validateLabelKey,
  validateLabelValue,
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

describe('validateLabelKey', () => {
  it('should return null for a valid key', () => {
    expect(validateLabelKey('team', ['team'], 0)).toBeNull();
  });

  it('should return null for key with dots, dashes, and underscores', () => {
    expect(validateLabelKey('my_key.name-1', ['my_key.name-1'], 0)).toBeNull();
  });

  it('should return null for single-character key', () => {
    expect(validateLabelKey('a', ['a'], 0)).toBeNull();
  });

  it('should return null for key at max length (63 characters)', () => {
    const key63 = 'a'.repeat(63);
    expect(validateLabelKey(key63, [key63], 0)).toBeNull();
  });

  it('should return error for empty key', () => {
    expect(validateLabelKey('', [''], 0)).toBe('Required');
  });

  it('should return error for key containing a slash', () => {
    expect(validateLabelKey('prefix/name', ['prefix/name'], 0)).toBe(
      'Do not include slashes (/). The system adds the required namespace prefix for you.',
    );
  });

  it('should return error for key exceeding 63 characters', () => {
    const longKey = 'a'.repeat(64);
    expect(validateLabelKey(longKey, [longKey], 0)).toBe('Must be 1\u201363 characters.');
  });

  it('should return error for key starting with a dash', () => {
    expect(validateLabelKey('-invalid', ['-invalid'], 0)).toBe(
      'Must start and end with a letter or number.',
    );
  });

  it('should return error for key ending with a dash', () => {
    expect(validateLabelKey('invalid-', ['invalid-'], 0)).toBe(
      'Must start and end with a letter or number.',
    );
  });

  it('should return error for key starting with a dot', () => {
    expect(validateLabelKey('.invalid', ['.invalid'], 0)).toBe(
      'Must start and end with a letter or number.',
    );
  });

  it('should return error for key with spaces', () => {
    expect(validateLabelKey('my key', ['my key'], 0)).toBe(
      'Valid characters include letters, numbers, hyphens (-), periods (.), and underscores (_).',
    );
  });

  it('should return error for key with special characters', () => {
    expect(validateLabelKey('key@!#', ['key@!#'], 0)).toBe(
      'Valid characters include letters, numbers, hyphens (-), periods (.), and underscores (_).',
    );
  });

  it('should return error for duplicate keys', () => {
    const allKeys = ['team', 'team'];
    expect(validateLabelKey('team', allKeys, 1)).toBe('team is already in use.');
  });

  it('should flag all duplicate rows', () => {
    const allKeys = ['team', 'team'];
    expect(validateLabelKey('team', allKeys, 0)).toBe('team is already in use.');
    expect(validateLabelKey('team', allKeys, 1)).toBe('team is already in use.');
  });

  it('should not flag unique keys as duplicates', () => {
    const allKeys = ['team', 'env'];
    expect(validateLabelKey('team', allKeys, 0)).toBeNull();
    expect(validateLabelKey('env', allKeys, 1)).toBeNull();
  });

  it('should accept uppercase characters in keys', () => {
    expect(validateLabelKey('MyKey', ['MyKey'], 0)).toBeNull();
  });

  it('should prioritize slash error over syntax error', () => {
    expect(validateLabelKey('bad/key!', ['bad/key!'], 0)).toBe(
      'Do not include slashes (/). The system adds the required namespace prefix for you.',
    );
  });
});

describe('validateLabelValue', () => {
  it('should return null for a valid value', () => {
    expect(validateLabelValue('platform')).toBeNull();
  });

  it('should return null for value with dots, dashes, and underscores', () => {
    expect(validateLabelValue('my-value_1.0')).toBeNull();
  });

  it('should return null for single-character value', () => {
    expect(validateLabelValue('a')).toBeNull();
  });

  it('should return null for value at max length (63 characters)', () => {
    expect(validateLabelValue('a'.repeat(63))).toBeNull();
  });

  it('should return null for empty value (K8s spec allows empty label values)', () => {
    expect(validateLabelValue('')).toBeNull();
  });

  it('should return error for value exceeding 63 characters', () => {
    expect(validateLabelValue('a'.repeat(64))).toBe('Must be 63 characters or less.');
  });

  it('should return error for value starting with a dash', () => {
    expect(validateLabelValue('-invalid')).toBe('Must start and end with a letter or number.');
  });

  it('should return error for value ending with a dash', () => {
    expect(validateLabelValue('invalid-')).toBe('Must start and end with a letter or number.');
  });

  it('should return error for value with spaces', () => {
    expect(validateLabelValue('my value')).toBe(
      'Valid characters include letters, numbers, hyphens (-), periods (.), and underscores (_).',
    );
  });

  it('should return error for value with special characters', () => {
    expect(validateLabelValue('val@!#')).toBe(
      'Valid characters include letters, numbers, hyphens (-), periods (.), and underscores (_).',
    );
  });

  it('should accept uppercase characters in values', () => {
    expect(validateLabelValue('MyValue')).toBeNull();
  });
});
