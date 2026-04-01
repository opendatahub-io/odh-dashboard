import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { enableGenAiFeatures, disableGenAiFeatures } from '../../../utils/oc_commands/genAi';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import { aiAssets } from '../../../pages/aiAssets';

describe('Gen AI Navigation - User Journey Tests', () => {
  let projectName: string;
  let skipTest = false;
  const uuid = generateTestUUID();
  const invalidNamespace = `non-existent-project-${generateTestUUID()}`;

  // Skip admin-only setup in non-admin mode
  if (Cypress.env('IS_NON_ADMIN_RUN')) {
    skipTest = true;
  }

  // Register exception handler at describe level to avoid accumulating listeners on retries
  // Ignore module federation loading errors (for clusters without Gen AI modules deployed)
  Cypress.on('uncaught:exception', (err) => {
    // Only suppress known module federation / remoteEntry errors
    // Allow other parse errors to surface as real regressions
    if (
      err.message.includes('remoteEntry') ||
      err.message.includes('module federation') ||
      err.message.includes('Failed to fetch dynamically imported module') ||
      err.message.includes('error loading dynamically imported module')
    ) {
      return false;
    }
    return true;
  });

  retryableBefore(() => {
    // Check if the operator is RHOAI, if it's not (ODH), skip the test
    cy.step('Check if the operator is RHOAI');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log('RHOAI operator not found, skipping the test (Gen AI is RHOAI-specific).');
        skipTest = true;
      } else {
        cy.log('RHOAI operator confirmed:', result.stdout);
      }
    });

    // If not skipping, proceed with test setup
    cy.then(() => {
      if (skipTest) {
        return;
      }

      projectName = `gen-ai-nav-test-${uuid}`;

      if (!projectName) {
        throw new Error('Project name is undefined or empty');
      }

      cy.log(`Creating project ${projectName} using oc commands`);
      createCleanProject(projectName);
    }).then(() => {
      if (skipTest) {
        return;
      }
      return enableGenAiFeatures();
    });
  });

  after(() => {
    if (skipTest) {
      return;
    }

    // Chain Cypress commands to ensure deterministic cleanup
    // Return the chain so Cypress waits for completion before next spec
    return cy.then(() => {
      disableGenAiFeatures();

      if (projectName) {
        deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true });
      }
    });
  });

  beforeEach(function skipIfNotRHOAI() {
    if (skipTest) {
      cy.log('Skipping test - Gen AI is RHOAI-specific and not available on ODH.');
      this.skip();
    }
  });

  it(
    'Administrator navigates between Gen AI sections to manage resources',
    {
      tags: ['@Sanity', '@GenAI', '@Navigation'],
    },
    () => {
      cy.step('Log into the application as Administrator');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Gen AI Playground from main dashboard');
      genAiPlayground.navigate(projectName);

      cy.step('Verify Playground page loads with correct title');
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
      cy.findByRole('heading', { name: /Playground/i }).should('be.visible');

      cy.step('Navigate to AI Assets to review deployed models');
      aiAssets.navigate(projectName);

      cy.step('Verify AI Assets page loads with Models tab');
      cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
      aiAssets.findPageTitle().should('be.visible');

      cy.step('Navigate back to Playground using URL');
      genAiPlayground.navigate(projectName);

      cy.step('Verify navigation maintains context and user can work across sections');
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
      cy.findByRole('heading', { name: /Playground/i }).should('be.visible');
    },
  );

  it(
    'Data scientist accesses Gen AI resources via direct URL links',
    {
      tags: ['@Sanity', '@GenAI', '@Navigation'],
    },
    () => {
      cy.step('Log into the application as Data scientist');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate directly to Playground using full URL with namespace');
      cy.visit(`/gen-ai-studio/playground/${projectName}`);

      cy.step('Verify Playground loads correctly from direct URL');
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
      cy.findByRole('heading', { name: /Playground/i }).should('be.visible');

      cy.step('Navigate directly to AI Assets using full URL');
      cy.visit(`/gen-ai-studio/assets/${projectName}`);

      cy.step('Verify AI Assets page loads correctly from direct URL');
      cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
      aiAssets.findPageTitle().should('be.visible');

      cy.step('Verify user can work normally after direct URL navigation');
      aiAssets.findPageDescription().should('be.visible');
    },
  );

  it(
    'User accesses Gen AI Studio and gets automatic redirect to default page',
    {
      tags: ['@Sanity', '@GenAI', '@Navigation'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Access Gen AI Studio root URL without specific page');
      cy.visit('/gen-ai-studio');

      cy.step('Verify automatic redirect to Playground (default page)');
      cy.url().should('include', '/gen-ai-studio/playground');

      cy.step('Verify user lands on functional page and can continue workflow');
      cy.findByRole('heading', { name: /Playground/i }).should('be.visible');
    },
  );

  it(
    'User accesses playground without namespace and gets redirected appropriately',
    {
      tags: ['@Sanity', '@GenAI', '@Navigation'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Access Playground URL without namespace parameter');
      cy.visit('/gen-ai-studio/playground');

      cy.step('Verify user is redirected to appropriate page with namespace');
      cy.url().should('include', '/gen-ai-studio/playground/');
      cy.url().should('match', /\/gen-ai-studio\/playground\/[^/]+$/);

      cy.step('Verify page is in usable state');
      cy.findByRole('heading', { name: /Playground/i }).should('be.visible');
    },
  );

  it(
    'User follows broken link and receives clear guidance for recovery',
    {
      tags: ['@Sanity', '@GenAI', '@Navigation'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to non-existent Gen AI route');
      cy.visit('/gen-ai-studio/non-existent-page');

      cy.step('Verify 404 or Not Found page is displayed');
      cy.contains('404 Page not found').should('be.visible');

      cy.step('Verify user has clear navigation options to recover');
      cy.findByRole('button', { name: /Take me home/i }).should('be.visible');
    },
  );

  it(
    'User understands current location while navigating between sections',
    {
      tags: ['@Sanity', '@GenAI', '@Navigation'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Playground');
      genAiPlayground.navigate(projectName);

      cy.step('Verify page title indicates current location (Playground)');
      cy.findByRole('heading', { name: /Playground/i }).should('be.visible');
      cy.url().should('include', '/playground/');

      cy.step('Navigate to AI Assets');
      aiAssets.navigate(projectName);

      cy.step('Verify page title updates to reflect current location (AI Assets)');
      aiAssets.findPageTitle().should('be.visible');
      cy.url().should('include', '/assets/');

      cy.step('Verify user always knows their context for better navigation decisions');
      aiAssets.findPageDescription().should('be.visible');
    },
  );

  it(
    'Developer shares direct link for team collaboration on AI Assets',
    {
      tags: ['@Sanity', '@GenAI', '@Navigation'],
    },
    () => {
      cy.step('Log into the application as first user (Developer)');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to AI Assets and note the URL');
      aiAssets.navigate(projectName);
      let sharedUrl: string;
      cy.url().then((url) => {
        sharedUrl = url;
        cy.log(`Developer captures URL to share: ${url}`);
      });

      cy.step('Colleague accesses the shared link');
      cy.then(() => {
        cy.visit(sharedUrl);
      });

      cy.step('Verify colleague lands on correct page');
      cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
      aiAssets.findPageTitle().should('be.visible');

      cy.step('Verify colleague can immediately work with shared resource');
      aiAssets.findPageDescription().should('be.visible');

      cy.step('Verify direct link sharing enables effective team collaboration');
      cy.log('✅ Team collaboration via direct links is functional');
    },
  );

  it(
    'User receives clear feedback when using invalid namespace in URL',
    {
      tags: ['@Sanity', '@GenAI', '@Navigation'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Attempt to access Playground with non-existent namespace');
      cy.visit(`/gen-ai-studio/playground/${invalidNamespace}`);

      cy.step('Verify user receives feedback about invalid namespace');
      // The GenAiCoreInvalidProject component should display an error message
      cy.contains('Project not found').should('be.visible');
      cy.contains(`Project ${invalidNamespace}`).should('be.visible');

      cy.step('Verify user can recover and navigate to valid namespace');
      // User should see a project selector to choose a valid project
      cy.contains('Select project').should('be.visible');
    },
  );
});
