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
export function extractHttpsUrls(directory: string): string[] {
    const httpsUrls: string[] = [];

    function walkDir(dir: string) {
        const files = fs.readdirSync(dir); 
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath); 
            if (stat.isDirectory()) {
                walkDir(filePath);
            } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8'); 
                    const yamlContent = yaml.load(content);
                    const yamlString = JSON.stringify(yamlContent);
                    const urls = yamlString.match(/https:\/\/\S+/g);
                    if (urls) {
                        httpsUrls.push(...urls);
                    }
                } catch (error) {
                    console.error(`Error parsing YAML file: ${filePath}`, error);
                }
            }
        });
    }

    walkDir(directory);
    return httpsUrls;
}