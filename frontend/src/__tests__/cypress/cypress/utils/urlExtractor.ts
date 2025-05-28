import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Extracts URLs from all anchor elements on the current page.
 * This function finds all 'a' elements, extracts their 'href' attributes,
 * and returns them as an array of strings.
 *
 * @returns {Cypress.Chainable<string[]>} A Cypress chainable that resolves to an array of URLs.
 */
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
/**
 * Type definitions for YAML values.
 */
type YamlValue = string | number | boolean | null | YamlObject | YamlArray;
interface YamlObject {
  [key: string]: YamlValue;
}
type YamlArray = YamlValue[];

/**
 * Extracts URLs from a given value and adds them to the provided set.
 *
 * @param {YamlValue} value - The value to extract URLs from.
 * @param {Set<string>} urlSet - A set to store unique URLs.
 */
function extractUrlsFromValue(value: YamlValue, urlSet: Set<string>): void {
  if (typeof value === 'string') {
    const urlRegex = /^(?:https?:\/\/)[^\s\](),"'}*]*(?=[\s\](),"'}*]|$)/g; // Matches only http:// or https:// exactly
    const matches = value.match(urlRegex);
    if (matches) {
      matches.forEach((url) => {
        const cleanUrl = url.replace(/\*+$/, ''); // Remove trailing asterisks if any
        urlSet.add(cleanUrl); // Add URL to the set for uniqueness
      });
    }
  } else if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      value.forEach((item) => extractUrlsFromValue(item, urlSet)); // Process array items
    } else {
      Object.values(value).forEach((val) => extractUrlsFromValue(val, urlSet)); // Process object values
    }
  }
}

/**
 * Extracts HTTPS URLs from YAML files in specified directories.
 *
 * @param {string} directory - The directory path to search for YAML files.
 * @returns {string[]} An array of HTTPS URLs extracted from YAML files.
 */
export function extractHttpsUrls(directory: string): string[] {
  const httpsUrlSet = new Set<string>();

  function walkDir(dir: string): void {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath); // Recursively walk into subdirectories
      } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const yamlDocuments = yaml.loadAll(content); // Load multiple YAML documents

          // Process each document
          yamlDocuments.forEach((yamlContent) => {
            // Check if yamlContent is an object or array and extract URLs
            if (typeof yamlContent === 'object' && yamlContent !== null) {
              // Check for 'spec' key and extract URL if it exists
              if (
                'spec' in yamlContent &&
                typeof yamlContent.spec === 'object' &&
                yamlContent.spec !== null
              ) {
                if ('url' in yamlContent.spec) {
                  // Use type assertion to specify that spec.url is a string or undefined
                  extractUrlsFromValue(yamlContent.spec.url as string, httpsUrlSet);
                }
              }

              // Process all other values to find additional URLs
              Object.values(yamlContent).forEach((value) =>
                extractUrlsFromValue(value, httpsUrlSet),
              );
            }
          });
        } catch (error) {
          // Catches file reading errors
        }
      }
    });
  }

  walkDir(directory); // Start walking the directory
  return Array.from(httpsUrlSet); // Return the unique set of URLs as an array
}
export const isUrlExcluded = (url: string, excludedSubstrings: string[]): boolean => {
  return excludedSubstrings.some((substring) => url.includes(substring));
};
