/* eslint-disable camelcase */
import { formatBytes, mapResultToItems } from '#~/concepts/fileExplorer/utils';
import { isFolder } from '#~/concepts/fileExplorer/FileExplorer/FileExplorer';
import {
  mockS3ListObjectsResponse,
  mockS3EmptyResponse,
} from '#~/concepts/fileExplorer/__mocks__/mockS3ListObjectsResponse';

jest.mock('@odh-dashboard/internal/utilities/time', () => ({
  relativeTime: jest.fn(() => '2 days ago'),
}));

describe('formatBytes', () => {
  it('should return "0 B" for zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
  it('should return "0 B" for negative values', () => {
    expect(formatBytes(-100)).toBe('0 B');
  });
  it('should return "0 B" for NaN', () => {
    expect(formatBytes(NaN)).toBe('0 B');
  });
  it('should return "0 B" for Infinity', () => {
    expect(formatBytes(Infinity)).toBe('0 B');
  });
  it('should format bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
  });
  it('should format kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });
  it('should format megabytes correctly', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });
  it('should format gigabytes correctly', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB');
  });
  it('should format terabytes correctly', () => {
    expect(formatBytes(1099511627776)).toBe('1.0 TB');
  });
  it('should format partial values with one decimal', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('mapResultToItems', () => {
  it('should map common_prefixes to folders', () => {
    const result = mockS3ListObjectsResponse({ contents: [] });
    const items = mapResultToItems(result);
    const folders = items.filter(isFolder);

    expect(folders).toHaveLength(3);
    expect(folders.map((f) => f.name)).toEqual(
      expect.arrayContaining(['configs', 'datasets', 'results']),
    );
  });
  it('should map contents to files with correct properties', () => {
    const result = mockS3ListObjectsResponse({ common_prefixes: [] });
    const items = mapResultToItems(result);

    const readme = items.find((f) => f.name === 'README.md');
    expect(readme).toBeDefined();
    expect(readme?.path).toBe('/README.md');
    expect(readme?.type).toBe('MD');
    expect(readme?.size).toBe('2.0 KB');
  });
  it('should sort items alphabetically by name', () => {
    const result = mockS3ListObjectsResponse();
    const items = mapResultToItems(result);
    const names = items.map((f) => f.name);

    expect(names).toEqual([...names].toSorted((a, b) => a.localeCompare(b)));
  });
  it('should mark root folder markers as hidden', () => {
    const result = mockS3ListObjectsResponse({
      common_prefixes: [{ prefix: '/' }, { prefix: '' }],
      contents: [],
    });
    const items = mapResultToItems(result);

    expect(items.every((i) => i.hidden)).toBe(true);
  });
  it('should treat keys ending with / as folder markers', () => {
    const result = mockS3ListObjectsResponse({
      common_prefixes: [],
      contents: [{ key: 'my-folder/', size: 0, last_modified: '', etag: '', storage_class: '' }],
    });
    const items = mapResultToItems(result);

    expect(items).toHaveLength(1);
    expect(isFolder(items[0])).toBe(true);
    expect(items[0].name).toBe('my-folder');
  });
  it('should return empty array for empty response', () => {
    const result = mockS3EmptyResponse();
    const items = mapResultToItems(result);

    expect(items).toEqual([]);
  });
  it('should filter selectable files by extension', () => {
    const result = mockS3ListObjectsResponse({ common_prefixes: [] });
    const items = mapResultToItems(result, { selectableExtensions: ['yaml'] });

    const yaml = items.find((f) => f.name === 'config.yaml');
    const md = items.find((f) => f.name === 'README.md');

    expect(yaml?.selectable).toBe(true);
    expect(md?.selectable).toBe(false);
  });
  it('should mark all files selectable when no extensions filter is provided', () => {
    const result = mockS3ListObjectsResponse({ common_prefixes: [] });
    const items = mapResultToItems(result);

    const files = items.filter((f) => !isFolder(f));
    expect(files.every((f) => f.selectable)).toBe(true);
  });
  it('should mark folders as selectable when allowFolderSelection is true', () => {
    const result = mockS3ListObjectsResponse({ contents: [] });
    const items = mapResultToItems(result, { allowFolderSelection: true });
    const folders = items.filter(isFolder);

    expect(folders.length).toBeGreaterThan(0);
    expect(folders.every((f) => f.selectable)).toBe(true);
  });
  it('should not mark folders as selectable by default', () => {
    const result = mockS3ListObjectsResponse({ contents: [] });
    const items = mapResultToItems(result);
    const folders = items.filter(isFolder);

    expect(folders.length).toBeGreaterThan(0);
    expect(folders.every((f) => !f.selectable)).toBe(true);
  });
  it('should produce type "File" for files without extensions', () => {
    const result = mockS3ListObjectsResponse({
      common_prefixes: [],
      contents: [
        { key: 'Makefile', size: 512, last_modified: '', etag: '', storage_class: '' },
        { key: 'LICENSE', size: 1024, last_modified: '', etag: '', storage_class: '' },
        { key: 'Dockerfile', size: 256, last_modified: '', etag: '', storage_class: '' },
      ],
    });
    const items = mapResultToItems(result);

    for (const item of items) {
      expect(item.type).toBe('File');
    }
  });
  it('should omit Last Modified detail when last_modified is an invalid date string', () => {
    const result = mockS3ListObjectsResponse({
      common_prefixes: [],
      contents: [
        {
          key: 'file.txt',
          size: 100,
          last_modified: 'not-a-date',
          etag: '',
          storage_class: '',
        },
      ],
    });
    const items = mapResultToItems(result);

    expect(items).toHaveLength(1);
    expect(items[0].details).toBeDefined();
    expect(items[0].details?.['Last Modified']).toBeUndefined();
  });
  it('should mark contents with key "/" or "" as hidden root folder markers', () => {
    const result = mockS3ListObjectsResponse({
      common_prefixes: [],
      contents: [
        { key: '/', size: 0, last_modified: '', etag: '', storage_class: '' },
        { key: '', size: 0, last_modified: '', etag: '', storage_class: '' },
        {
          key: 'file.txt',
          size: 100,
          last_modified: '2026-01-01T00:00:00Z',
          etag: '',
          storage_class: '',
        },
      ],
    });
    const items = mapResultToItems(result);

    const hiddenItems = items.filter((i) => i.hidden);
    expect(hiddenItems).toHaveLength(2);

    const visibleItems = items.filter((i) => !i.hidden);
    expect(visibleItems).toHaveLength(1);
    expect(visibleItems[0].name).toBe('file.txt');
  });
});
