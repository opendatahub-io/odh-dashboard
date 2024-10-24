import { renderHook } from '@testing-library/react';
import {
  useMountPathFormat,
  validateMountPath,
} from '~/pages/projects/screens/spawner/storage/utils';
import { MountPathFormat } from '~/pages/projects/screens/spawner/storage/types';
import { MOUNT_PATH_PREFIX } from '~/pages/projects/screens/spawner/storage/const';

describe('validateMountPath', () => {
  const inUseMountPaths = ['/existing-folder', '/another-folder'];

  it('should return error message for empty value', () => {
    const result = validateMountPath('', inUseMountPaths);
    expect(result).toBe(
      'Enter a path to a model or folder. This path cannot point to a root folder.',
    );
  });

  it('should return error message for invalid characters in the path', () => {
    const result = validateMountPath('Invalid/Path', inUseMountPaths);
    expect(result).toBe('Must only consist of lowercase letters and dashes.');
  });

  it('should return error message for already in-use mount path', () => {
    const result = validateMountPath('existing-folder', inUseMountPaths);
    expect(result).toBe('Mount folder is already in use for this workbench.');
  });

  it('should return an empty string for valid and unused mount path', () => {
    const result = validateMountPath('new-folder', inUseMountPaths);
    expect(result).toBe('');
  });

  it('should allow valid folder name with a trailing slash', () => {
    const result = validateMountPath('valid-folder/', inUseMountPaths);
    expect(result).toBe('');
  });

  it('should return error for an invalid folder name with numbers or uppercase letters', () => {
    const result = validateMountPath('Invalid123', inUseMountPaths);
    expect(result).toBe('Must only consist of lowercase letters and dashes.');
  });
});

describe('useMountPathFormat', () => {
  it('return MountPathFormat.STANDARD if isCreate is true', () => {
    const { result } = renderHook(() => useMountPathFormat(true, 'some-path'));

    const [format] = result.current;
    expect(format).toBe(MountPathFormat.STANDARD);
  });

  it('return MountPathFormat.STANDARD if mountPath starts with /opt/app-root/src/', () => {
    const { result } = renderHook(() =>
      useMountPathFormat(false, `${MOUNT_PATH_PREFIX}/some-path`),
    );

    const [format] = result.current;
    expect(format).toBe(MountPathFormat.STANDARD);
  });

  it('return MountPathFormat.CUSTOM if mountPath does not start with /opt/app-root/src/', () => {
    const { result } = renderHook(() => useMountPathFormat(false, '/custom-path'));

    const [format] = result.current;
    expect(format).toBe(MountPathFormat.CUSTOM);
  });

  it('should update format based on the mountPath change', () => {
    const { result, rerender } = renderHook(
      ({ isCreate, mountPath }) => useMountPathFormat(isCreate, mountPath),
      {
        initialProps: { isCreate: false, mountPath: '/custom-path' },
      },
    );

    // Initial format
    expect(result.current[0]).toBe(MountPathFormat.CUSTOM);

    // Change the mountPath to a path with MOUNT_PATH_PREFIX
    rerender({ isCreate: false, mountPath: `${MOUNT_PATH_PREFIX}/new-path` });

    // Format should update to STANDARD
    expect(result.current[0]).toBe(MountPathFormat.STANDARD);
  });

  it('should not update format if isCreate is true, regardless of mountPath', () => {
    const { result, rerender } = renderHook(
      ({ isCreate, mountPath }) => useMountPathFormat(isCreate, mountPath),
      {
        initialProps: { isCreate: true, mountPath: '/custom-path' },
      },
    );

    // Initial format
    expect(result.current[0]).toBe(MountPathFormat.STANDARD);

    // Change the mountPath but keep isCreate true
    rerender({ isCreate: true, mountPath: `${MOUNT_PATH_PREFIX}/new-path` });

    // Format should remain STANDARD
    expect(result.current[0]).toBe(MountPathFormat.STANDARD);
  });
});
