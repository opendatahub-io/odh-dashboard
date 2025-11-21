/**
 * Test utility to format urls
 *
 * Including:
 * - formatUrlLocation(): Formats url location in file
 * - formatUrlLocationsByFile(): Formats list of urls per file across many files
 * - getLocationInfo(): Gathers url location info
 * - formatValidationMessage(): Returns formatted message with url's successful or failed validation result
 */

import { getErrorType } from '#~/__tests__/cypress/cypress/utils/urlValidator';

export interface UrlLocation {
  url: string;
  file: string;
  line: number;
}

export interface UrlValidationResult {
  url: string;
  originalUrl?: string;
  status: number;
  error?: string;
}

export interface UrlValidationResultWithLocation extends UrlValidationResult {
  location?: UrlLocation;
}

export const VALID_STATUS_CODES = new Set([200, 201, 202, 204]);

const formatUrlLocation = (urlLocation: UrlLocation): string => {
  const { url, line } = urlLocation;
  return `[:${line}] - ${url}`;
};

export const formatUrlLocationsByFile = (urlLocations: UrlLocation[]): string => {
  const urlsByFile = new Map<string, UrlLocation[]>();

  urlLocations.forEach((location) => {
    const { file } = location;
    if (!urlsByFile.has(file)) {
      urlsByFile.set(file, []);
    }
    const fileLocations = urlsByFile.get(file);
    if (fileLocations) {
      fileLocations.push(location);
    }
  });

  const formattedFiles: string[] = [];

  urlsByFile.forEach((locations, file) => {
    const filePath = file;
    const urls = locations.map(formatUrlLocation).join('\n  ');
    formattedFiles.push(`${filePath}:\n  ${urls}`);
  });

  return formattedFiles.join('\n\n');
};

const getLocationInfo = (url: string, allLocations?: Map<string, UrlLocation[]>): string => {
  if (!allLocations) {
    return '';
  }

  const locations = allLocations.get(url);
  if (!locations || locations.length === 0) {
    return '';
  }

  const locationInfo = locations
    .map((loc) => {
      const fileName = loc.file.split('/').pop() || loc.file;
      return `${fileName}:${loc.line}`;
    })
    .join(', ');

  return ` [${locationInfo}]`;
};

export const formatValidationMessage = (
  result: UrlValidationResultWithLocation,
  allLocations?: Map<string, UrlLocation[]>,
): string => {
  const { url, status, error, originalUrl } = result;
  const isValid = VALID_STATUS_CODES.has(status);

  const finalUrlLocationInfo = getLocationInfo(url, allLocations);
  const originalUrlLocationInfo =
    originalUrl && originalUrl !== url ? getLocationInfo(originalUrl, allLocations) : '';

  const urlDisplay =
    originalUrl && originalUrl !== url
      ? `${originalUrl}${originalUrlLocationInfo} → ${url}${finalUrlLocationInfo}`
      : `${url}${finalUrlLocationInfo}`;

  if (isValid) {
    return `✅ ${urlDisplay} - Status: ${status}`;
  }

  const errorType = getErrorType(status, error);
  const baseMessage = `❌ ${urlDisplay} - ${errorType}: ${status}`;
  return error ? `${baseMessage} (Details: ${error})` : baseMessage;
};
