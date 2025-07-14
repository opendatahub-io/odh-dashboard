import * as yaml from 'js-yaml';
import { isUrlExcluded } from '#~/__tests__/cypress/cypress/utils/urlExtractor';
import { getErrorType } from '#~/__tests__/cypress/cypress/utils/urlValidator';

interface UrlLocation {
  url: string;
  file: string;
  line: number;
}

interface UrlValidationResult {
  url: string;
  originalUrl?: string;
  status: number;
  error?: string;
}

interface UrlValidationResultWithLocation extends UrlValidationResult {
  location?: UrlLocation;
}

interface ManifestTestConfig {
  excludedSubstrings?: string[];
}

const VALID_STATUS_CODES = new Set([200, 201, 202, 204]);

const formatValidationMessage = (
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

const formatUrlLocation = (urlLocation: UrlLocation): string => {
  const { url, line } = urlLocation;
  return `[:${line}] - ${url}`;
};

const formatUrlLocationsByFile = (urlLocations: UrlLocation[]): string => {
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
  if (!allLocations) return '';

  const locations = allLocations.get(url);
  if (!locations || locations.length === 0) return '';

  const locationInfo = locations
    .map((loc) => {
      const fileName = loc.file.split('/').pop() || loc.file;
      return `${fileName}:${loc.line}`;
    })
    .join(', ');

  return ` [${locationInfo}]`;
};

describe('[Product Bug: RHOAIENG-27761] Verify that all the URLs referenced in the Manifest directory are operational', () => {
  let excludedSubstrings: string[] = [];

  before(() => {
    cy.fixture('e2e/dashboardNavigation/testManifestLinks.yaml').then((yamlString) => {
      try {
        const yamlData = yaml.load(yamlString) as ManifestTestConfig;
        excludedSubstrings = yamlData.excludedSubstrings ?? [];
        cy.log(`Loaded ${excludedSubstrings.length} excluded substrings`);
      } catch (error: unknown) {
        cy.log(
          'Error parsing YAML configuration:',
          error instanceof Error ? error.message : String(error),
        );
        excludedSubstrings = [];
      }
    });
  });

  it(
    'Reads the manifest directory, filters out test/sample URLs and validates the remaining URLs',
    {
      tags: [
        '@Smoke',
        '@SmokeSet1',
        '@ODS-327',
        '@ODS-492',
        '@Dashboard',
        '@RHOAIENG-9235',
        '@Bug',
      ],
    },
    () => {
      const manifestsDir = '../../../../manifests';
      cy.log(`Resolved manifests directory: ${manifestsDir}`);

      cy.task<UrlLocation[]>('extractHttpsUrls', manifestsDir)
        .then((urlLocations) => {
          if (!Array.isArray(urlLocations)) {
            throw new Error('Failed to extract URLs from manifests directory');
          }

          const filteredUrlLocations = urlLocations.filter(
            (urlLocation) => urlLocation.url && !isUrlExcluded(urlLocation.url, excludedSubstrings),
          );

          const filteredUrls = filteredUrlLocations.map((location) => location.url);

          cy.log(
            `Found ${urlLocations.length} total URLs, filtered to ${
              filteredUrlLocations.length
            } URLs.\nValid status codes to check: ${Array.from(VALID_STATUS_CODES).join(
              ', ',
            )}\n\nURLs to verify:\n${formatUrlLocationsByFile(filteredUrlLocations)}`,
          );

          const urlToLocationsMap = new Map<string, UrlLocation[]>();
          filteredUrlLocations.forEach((location) => {
            if (!urlToLocationsMap.has(location.url)) {
              urlToLocationsMap.set(location.url, []);
            }
            const locationsForUrl = urlToLocationsMap.get(location.url);
            if (locationsForUrl) {
              locationsForUrl.push(location);
            }
          });

          return cy
            .task<UrlValidationResult[]>('validateHttpsUrls', filteredUrls)
            .then((results) => {
              const resultsWithLocation: UrlValidationResultWithLocation[] = results.map(
                (result) => {
                  const resultWithOriginal = result as UrlValidationResult & {
                    originalUrl?: string;
                  };

                  const finalUrlLocations = urlToLocationsMap.get(result.url);
                  const location =
                    finalUrlLocations && finalUrlLocations.length > 0
                      ? finalUrlLocations[0]
                      : undefined;

                  return {
                    ...result,
                    originalUrl: resultWithOriginal.originalUrl,
                    location,
                  };
                },
              );

              return { resultsWithLocation, urlToLocationsMap };
            });
        })
        .then(({ resultsWithLocation, urlToLocationsMap }) => {
          if (!Array.isArray(resultsWithLocation)) {
            throw new Error('Failed to validate URLs');
          }

          const loggedUrls = new Set<string>();

          resultsWithLocation.forEach((result) => {
            if (loggedUrls.has(result.url)) {
              return;
            }
            loggedUrls.add(result.url);

            const isValid = VALID_STATUS_CODES.has(result.status);
            const logMessage = formatValidationMessage(result, urlToLocationsMap);
            const errorType = getErrorType(result.status, result.error);

            cy.step(logMessage);
            softTrue(
              isValid,
              `URL ${result.url} should return one of the valid status codes (${Array.from(
                VALID_STATUS_CODES,
              ).join(', ')}), but was ${result.status}${
                result.error ? ` - ${errorType}: ${result.error}` : ''
              }`,
            );
          });
        });
    },
  );
});
