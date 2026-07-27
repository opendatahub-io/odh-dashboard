import React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { relativeTime } from '#~/utilities/time';
import type { ExplorerFiles, Folder, S3ListObjectsResponse } from '#~/concepts/fileExplorer/types';

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Maps an S3ListObjectsResponse to FileExplorer-compatible items. */
export const mapResultToItems = (
  result: S3ListObjectsResponse,
  options?: { allowFolderSelection?: boolean; selectableExtensions?: string[] },
): ExplorerFiles => {
  const items: ExplorerFiles = [];

  if (Array.isArray(result.common_prefixes)) {
    for (const cp of result.common_prefixes) {
      // Mark root folder markers as hidden — "/" and "" are the bucket root
      const isRoot = cp.prefix === '/' || cp.prefix === '';
      const prefixPath = `/${cp.prefix.replace(/\/$/, '')}`;
      const name = prefixPath.split('/').filter(Boolean).pop() ?? prefixPath;
      const folder: Folder = {
        name,
        path: prefixPath,
        type: 'folder',
        selectable: options?.allowFolderSelection,
        items: 0,
        ...(isRoot && { hidden: true }),
        details: {
          ...{ Type: 'Folder' },
        },
      };
      items.push(folder);
    }
  }

  if (Array.isArray(result.contents)) {
    for (const obj of result.contents) {
      // Mark root folder markers as hidden
      if (obj.key === '/' || obj.key === '') {
        items.push({
          name: '/',
          path: '/',
          type: 'folder',
          selectable: options?.allowFolderSelection,
          items: 0,
          hidden: true,
        });
        continue;
      }
      // Skip keys that end with / (folder markers)
      if (obj.key.endsWith('/')) {
        const dirPath = `/${obj.key.replace(/\/$/, '')}`;
        const name = dirPath.split('/').filter(Boolean).pop() ?? dirPath;
        items.push({
          name,
          path: dirPath,
          type: 'folder',
          selectable: options?.allowFolderSelection,
          items: 0,
          details: {
            ...{ Type: 'Folder' },
          },
        });
        continue;
      }

      const fullPath = `/${obj.key}`;
      const segments = obj.key.split('/');
      const fileName = segments.pop() ?? obj.key;
      const ext = fileName.includes('.') ? fileName.split('.').pop() ?? '' : '';

      const sizeToRender = formatBytes(obj.size);
      const fileTypeToRender = ext.toLocaleUpperCase() || 'File';

      const lastModified = obj.last_modified ? new Date(obj.last_modified) : undefined;
      const isValidDate = lastModified && !Number.isNaN(lastModified.getTime());

      items.push({
        name: fileName,
        path: fullPath,
        type: fileTypeToRender,
        size: sizeToRender,
        selectable:
          !options?.selectableExtensions ||
          options.selectableExtensions.some((se) => se.toLowerCase() === ext.toLowerCase()),
        forceShowAsSelected: false,
        details: {
          ...(isValidDate && {
            'Last Modified': (
              <Timestamp
                date={lastModified}
                tooltip={{
                  variant: TimestampTooltipVariant.default,
                }}
              >
                {relativeTime(Date.now(), lastModified.getTime())}
              </Timestamp>
            ),
          }),
          ...{ Size: sizeToRender },
          ...{ Type: fileTypeToRender },
        },
      });
    }
  }

  return items.toSorted((a, b) => a.name.localeCompare(b.name));
};
