import { getshmVolume, getshmVolumeMount, parseCommandLine } from '#~/api/k8s/utils';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

describe('getshmVolumeMount', () => {
  it('should correctly return shm volume mount', () => {
    const result = getshmVolumeMount();
    expect(result).toStrictEqual({
      mountPath: '/dev/shm',
      name: 'shm',
    });
  });
});

describe('getshmVolume', () => {
  it('should correctly return shm volume', () => {
    const result = getshmVolume('10');
    expect(result).toStrictEqual({
      emptyDir: {
        medium: 'Memory',
        sizeLimit: '10',
      },
      name: 'shm',
    });
  });

  it('should correctly return shm volume when size limit is not given', () => {
    const result = getshmVolume();
    expect(result).toStrictEqual({
      emptyDir: {
        medium: 'Memory',
      },
      name: 'shm',
    });
  });
});

describe('parseCommandLine', () => {
  test('parses simple space-separated arguments', () => {
    expect(parseCommandLine('arg1 arg2 arg3')).toEqual(['arg1', 'arg2', 'arg3']);
  });

  test('handles double-quoted arguments', () => {
    expect(parseCommandLine('"arg1 with spaces" arg2')).toEqual(['arg1 with spaces', 'arg2']);
  });

  test('handles single-quoted arguments', () => {
    expect(parseCommandLine("'arg1 with spaces' arg2")).toEqual(['arg1 with spaces', 'arg2']);
  });

  test('handles mixed quotes', () => {
    expect(parseCommandLine('\'single quoted\' "double quoted"')).toEqual([
      'single quoted',
      'double quoted',
    ]);
  });

  test('handles nested quotes', () => {
    expect(parseCommandLine("'nested\"'")).toEqual(['nested"']);
  });

  test('handles empty input', () => {
    expect(parseCommandLine('')).toEqual([]);
  });

  test('handles arguments with special characters', () => {
    expect(parseCommandLine('arg1 arg2!@#$%^&*()')).toEqual(['arg1', 'arg2!@#$%^&*()']);
  });

  test('handles arguments with escaped spaces', () => {
    expect(parseCommandLine('arg1 "arg with spaces" arg3')).toEqual([
      'arg1',
      'arg with spaces',
      'arg3',
    ]);
  });

  test('removes surrounding quotes from single-quoted arguments', () => {
    expect(parseCommandLine("'arg with spaces'")).toEqual(['arg with spaces']);
  });

  test('removes surrounding quotes from double-quoted arguments', () => {
    expect(parseCommandLine('"arg with spaces"')).toEqual(['arg with spaces']);
  });

  test('handles multiple consecutive spaces', () => {
    expect(parseCommandLine('arg1   arg2    arg3')).toEqual(['arg1', 'arg2', 'arg3']);
  });

  test('handles multi-line input', () => {
    expect(parseCommandLine('arg1 arg2\narg3 arg4')).toEqual(['arg1', 'arg2', 'arg3', 'arg4']);
  });
});
