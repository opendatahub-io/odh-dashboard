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
 * Extracts HTTPS URLs from YAML files in specified directories.
 *
 * @param {string} directory - The directory path to search for YAML files.
 * @returns {string[]} An array of HTTPS URLs extracted from YAML files.
 */
type YamlValue = string | number | boolean | null | YamlObject | YamlArray;
interface YamlObject {
  [key: string]: YamlValue;
}
type YamlArray = YamlValue[];

export function extractHttpsUrls(directory: string): string[] {
  const httpsUrlSet = new Set<string>();

  function extractUrlsFromValue(value: YamlValue): void {
    if (typeof value === 'string') {
      const urlRegex = /https:\/\/[^\s\](),"'}*]*(?=[\s\](),"'}*]|$)/g;
      const matches = value.match(urlRegex);
      if (matches) {
        matches.forEach((url) => {
          const cleanUrl = url.replace(/\*+$/, '');
          httpsUrlSet.add(cleanUrl);
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(extractUrlsFromValue);
      } else {
        Object.values(value).forEach(extractUrlsFromValue);
      }
    }
  }

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
          const yamlContent = yaml.load(content) as YamlValue;
          extractUrlsFromValue(yamlContent);
        } catch (error) {
          // Catches any file related errors
        }
      }
    });
  }

  walkDir(directory);
  return Array.from(httpsUrlSet);
}
