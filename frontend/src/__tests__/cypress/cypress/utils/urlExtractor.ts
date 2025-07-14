/**
 * Test utilities to extract URLs from YAML files and Cypress page elements.
 *
 * Including:
 * - extractLauncherUrls(): Extract URLs from Application Launcher dropdown
 * - extractHttpsUrlsWithLocation(): Extract URLs from YAML files with file/line info
 * - isUrlExcluded(): Check if URL contains excluded substrings
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface UrlLocation {
  url: string;
  file: string;
  line: number;
}

type YamlValue = string | number | boolean | null | YamlObject | YamlArray;
interface YamlObject {
  [key: string]: YamlValue;
}
type YamlArray = YamlValue[];

// Extract URLs from anchor tags in the Application Launcher dropdown menu
export function extractLauncherUrls(): Cypress.Chainable<string[]> {
  return cy.get('a').then(($elements) => {
    const extractedUrls: string[] = [];
    $elements.each((_, el) => {
      const href = Cypress.$(el).attr('href');
      if (href) {
        extractedUrls.push(href);
      }
    });
    return extractedUrls;
  });
}

// Check if URL should be excluded based on common patterns
function shouldExcludeUrl(url: string): boolean {
  const exclusionPatterns = [
    /localhost/,
    /my-project/,
    /cluster\.com/,
    /example\.com/,
    /example\.apps/,
    /<[^>]+>/,
    /\$\{[^}]+\}/,
    /USER_KEY/,
    /API_KEY/,
    /clusterip/,
    /ClusterIP/,
    /s2i-python-service/,
    /user-dev-rhoam-quarkus/,
    /project-simple/,
  ];
  return exclusionPatterns.some((pattern) => pattern.test(url));
}

// Recursively extract URLs from YAML values with file location tracking
function extractUrlsWithLocation(
  value: YamlValue,
  urlLocations: UrlLocation[],
  filePath: string,
  lineNumber: number,
): void {
  if (typeof value === 'string') {
    const urlRegex = /https?:\/\/[^\s\](),"'}*]*(?=[\s\](),"'}*]|$)/g;
    const matches = value.match(urlRegex);
    if (matches) {
      matches.forEach((url) => {
        const cleanUrl = url.replace(/\*+$/, '');
        if (!shouldExcludeUrl(cleanUrl)) {
          urlLocations.push({ url: cleanUrl, file: filePath, line: lineNumber });
        }
      });
    }
  } else if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      value.forEach((item) => extractUrlsWithLocation(item, urlLocations, filePath, lineNumber));
    } else {
      Object.values(value).forEach((val) =>
        extractUrlsWithLocation(val, urlLocations, filePath, lineNumber),
      );
    }
  }
}

// Scan file content line by line for URL patterns
function scanFileForUrls(content: string, filePath: string, urlLocations: UrlLocation[]): void {
  const lines = content.split('\n');
  const urlRegex = /https?:\/\/[^\s\](),"'}*]*(?=[\s\](),"'}*]|$)/g;

  lines.forEach((line, lineIndex) => {
    const matches = line.match(urlRegex);
    if (matches) {
      matches.forEach((url) => {
        const cleanUrl = url.replace(/\*+$/, '');
        if (!shouldExcludeUrl(cleanUrl)) {
          const existingIndex = urlLocations.findIndex(
            (loc) => loc.url === cleanUrl && loc.file === filePath,
          );

          if (existingIndex !== -1) {
            if (urlLocations[existingIndex].line === 0) {
              // eslint-disable-next-line no-param-reassign
              urlLocations[existingIndex] = { ...urlLocations[existingIndex], line: lineIndex + 1 };
            }
          } else {
            urlLocations.push({ url: cleanUrl, file: filePath, line: lineIndex + 1 });
          }
        }
      });
    }
  });
}

// Extract HTTPS URLs from directory with file and line location information
export function extractHttpsUrlsWithLocation(directory: string): UrlLocation[] {
  const urlLocations: UrlLocation[] = [];

  // Recursively walk through directory structure
  function walkDir(dir: string): void {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const yamlDocuments = yaml.loadAll(content);

          yamlDocuments.forEach((yamlContent) => {
            if (typeof yamlContent === 'object' && yamlContent !== null) {
              Object.values(yamlContent).forEach((value) =>
                extractUrlsWithLocation(value, urlLocations, filePath, 0),
              );
            }
          });

          scanFileForUrls(content, filePath, urlLocations);
        } catch (error) {
          // Catches file reading errors
        }
      }
    });
  }

  walkDir(directory);

  // Remove duplicate URL locations
  const uniqueUrlLocations = urlLocations.filter(
    (location, index, self) =>
      index ===
      self.findIndex(
        (l) => l.url === location.url && l.file === location.file && l.line === location.line,
      ),
  );

  return uniqueUrlLocations;
}

// Check if URL contains any excluded substrings
export const isUrlExcluded = (url: string, excludedSubstrings: string[]): boolean =>
  excludedSubstrings.some((substring) => url.includes(substring));
