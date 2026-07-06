import type {
  File,
  Files,
  Folder,
  Source,
  Sources,
} from '~/app/components/common/FileExplorer/FileExplorer';

// Sources -------------------------------------------------------------------->

export const mockSource = (overrides: Partial<Source> = {}): Source => ({
  name: 'test-connection',
  bucket: 'test-bucket',
  count: 42,
  ...overrides,
});

export const mockSources = (count = 3): Sources =>
  Array.from({ length: count }, (_, i) =>
    mockSource({ name: `connection-${i + 1}`, count: (i + 1) * 10 }),
  );

// Files ---------------------------------------------------------------------->

export const mockFile = (overrides: Partial<File> = {}): File => ({
  name: 'test-file.json',
  path: '/test-file.json',
  type: 'JSON',
  size: '1.0 KB',
  ...overrides,
});

export const mockFolder = (overrides: Partial<Folder> = {}): Folder => ({
  name: 'test-folder',
  path: '/test-folder',
  type: 'folder',
  items: 5,
  ...overrides,
});

export const mockFiles = (count = 5): Files =>
  Array.from({ length: count }, (_, i) =>
    mockFile({
      name: `file-${i + 1}.json`,
      path: `/file-${i + 1}.json`,
      type: 'JSON',
      size: `${i + 1}.0 KB`,
    }),
  );

export const mockFoldersTrail = (): Folder[] => [
  mockFolder({ name: 'level-1', path: '/level-1', items: 3 }),
  mockFolder({ name: 'level-2', path: '/level-1/level-2', items: 2 }),
  mockFolder({ name: 'level-3', path: '/level-1/level-2/level-3', items: 1 }),
];
