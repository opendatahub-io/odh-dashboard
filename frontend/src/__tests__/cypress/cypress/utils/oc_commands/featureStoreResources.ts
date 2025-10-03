import {
  applyOpenShiftYaml,
  waitForPodReady,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';

/**
 * Creates Feature Store custom resource by applying a YAML template.
 * This function dynamically replaces placeholders in the template with actual values and applies it.
 *
 * @param {string} namespace - The namespace of the feast custom resource flavor to be created.
 */
export const createFeatureStoreCR = (namespace: string, feastInstanceName: string): void => {
  cy.fixture('resources/yaml/feast.yaml').then((yamlTemplate) => {
    const {
      AWS_ACCESS_KEY_ID: awsAccessKey,
      AWS_SECRET_ACCESS_KEY: awsSecretKey,
      BUCKET_1: { NAME: awsBucketName, REGION: awsDefaultRegion },
    } = AWS_BUCKETS;

    const variables: Record<string, string> = {
      awsAccessKey,
      awsSecretKey,
      awsBucketName,
      awsDefaultRegion,
      namespace,
    };

    // Replace placeholders in YAML with actual values
    const yamlContent = Object.entries(variables).reduce(
      (content, [key, value]) => content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value),
      yamlTemplate,
    );
    // Apply the modified YAML
    applyOpenShiftYaml(yamlContent);
    //wait for the feature store cr to be created
    waitForPodReady(feastInstanceName, '300s', namespace);
  });
};

/**
 * Creates a route for the Feature Store service and stores URL as alias.
 * This function finds a service containing 'registry-rest' and creates a passthrough route.
 *
 * @param {string} namespace - The namespace where the route will be created.
 * @param {string} feastProject - The feast project name to be used in the route name.
 */
export const createRoute = (namespace: string, feastProject: string): void => {
  const routeName = `${feastProject}-registry-rest`;

  cy.step(`Finding service containing 'registry-rest' in namespace ${namespace}`);

  // Find service containing 'registry-rest' in the namespace
  const findServiceCommand = `oc get services -n ${namespace} -o custom-columns="NAME:.metadata.name" --no-headers | grep registry-rest`;

  cy.exec(findServiceCommand, { failOnNonZeroExit: false }).then((findResult) => {
    if (findResult.code !== 0 || !findResult.stdout.trim()) {
      cy.log(`ERROR finding service with 'registry-rest': ${findResult.stderr}`);
      throw new Error(`No service containing 'registry-rest' found in namespace ${namespace}`);
    }

    const serviceName = findResult.stdout.trim().split('\n')[0]; // Take the first matching service
    cy.log(`Found service: ${serviceName}`);

    cy.step(`Creating route ${routeName} for service ${serviceName} in namespace ${namespace}`);

    // Create the route
    const createCommand = `oc create route passthrough ${routeName} --service=${serviceName} --port=https -n ${namespace}`;

    cy.exec(createCommand, { failOnNonZeroExit: false }).then((createResult) => {
      if (createResult.code !== 0) {
        cy.log(`ERROR creating route: ${createResult.stderr}`);
        throw new Error(`Failed to create route: ${createResult.stderr}`);
      }

      cy.log(`Created route:\n${createResult.stdout}`);

      // Get the route host
      const getCommand = `oc get route -n ${namespace} -o jsonpath="{.items[?(@.spec.to.name=='${serviceName}')].spec.host}"`;

      cy.exec(getCommand, { failOnNonZeroExit: false }).then((getResult) => {
        if (getResult.code !== 0 || !getResult.stdout.trim()) {
          cy.log(`Failed to get route host: ${getResult.stderr}`);
          throw new Error(`Failed to get route host: ${getResult.stderr}`);
        }

        const host = getResult.stdout.trim();
        const routeUrl = `https://${host}`;
        cy.log(`Route URL: ${routeUrl}`);

        // Store the route URL as an alias for later use
        cy.wrap(routeUrl).as('routeUrl');
      });
    });
  });
};
