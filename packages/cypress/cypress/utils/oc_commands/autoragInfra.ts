/* eslint-disable cypress/no-unnecessary-waiting */

import { pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PGVECTOR_DEPLOYMENT = 'pgvector';
const PGVECTOR_PORT = 5432;
const PGVECTOR_USER = 'testuser'; // notsecret — ephemeral test DB
const PGVECTOR_PASSWORD = 'testpassword'; // notsecret — ephemeral test DB
const PGVECTOR_DATABASE = 'testdb';
const DEFAULT_PGVECTOR_IMAGE = 'quay.io/rh-aiservices-bu/postgresql-15-pgvector-c9s:latest';
const PGVECTOR_IMAGE_PLACEHOLDER = '{{PGVECTOR_IMAGE}}';

const getPgvectorImage = (): string =>
  (Cypress.env('AUTORAG_PGVECTOR_IMAGE') as string) || DEFAULT_PGVECTOR_IMAGE;

// ---------------------------------------------------------------------------
// Vector store provisioning
// ---------------------------------------------------------------------------

const applyVectorStoreFixture = (namespace: string): Cypress.Chainable<CommandLineResult> =>
  cy.fixture('resources/autorag/pgvector-standalone.yaml').then((content: string) => {
    const resolved = content.replace(
      new RegExp(PGVECTOR_IMAGE_PLACEHOLDER.replace(/[{}]/g, '\\$&'), 'g'),
      getPgvectorImage(),
    );
    const tempFile = `/tmp/autorag_vectorstore_${Date.now()}.yaml`;
    cy.writeFile(tempFile, resolved);
    return cy.exec(`oc apply -f "${tempFile}" -n ${namespace}`).then((result) => {
      cy.exec(`rm -f ${tempFile}`);
      return cy.wrap(result);
    });
  });

const deployVectorStore = (namespace: string): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Deploying vector store in namespace ${namespace}`);
  return applyVectorStoreFixture(namespace);
};

const waitForVectorStoreReady = (
  namespace: string,
  maxAttempts = 60,
  pollIntervalMs = 5000,
): void => {
  const readyCmd = `oc get pods -n ${namespace} -l app=pgvector -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}'`;
  pollUntilSuccess(
    `${readyCmd} | grep -q True && ${readyCmd}`,
    `Vector store pod to be Ready in ${namespace}`,
    { maxAttempts, pollIntervalMs },
  );

  cy.exec(
    `oc exec deploy/${PGVECTOR_DEPLOYMENT} -n ${namespace} -- ` +
      `psql -U postgres -d ${PGVECTOR_DATABASE} -c "CREATE EXTENSION IF NOT EXISTS vector"`,
  );
};

const cleanupVectorStore = (namespace: string): void => {
  cy.log('Cleaning up vector store');
  cy.exec(`oc delete deployment ${PGVECTOR_DEPLOYMENT} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
  cy.exec(`oc delete service ${PGVECTOR_DEPLOYMENT} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

const createVectorDbSecret = (namespace: string, secretName: string): void => {
  const host = `${PGVECTOR_DEPLOYMENT}.${namespace}.svc.cluster.local`;
  cy.exec(
    `oc create secret generic ${secretName} -n ${namespace} ` +
      `--from-literal=PGVECTOR_HOST='${host}' ` +
      `--from-literal=PGVECTOR_PORT='${PGVECTOR_PORT}' ` +
      `--from-literal=PGVECTOR_DB='${PGVECTOR_DATABASE}' ` +
      `--from-literal=PGVECTOR_USER='${PGVECTOR_USER}' ` +
      `--from-literal=PGVECTOR_PASSWORD='${PGVECTOR_PASSWORD}' ` +
      `--dry-run=client -o json | oc apply -f -`,
    { failOnNonZeroExit: true, log: false },
  );
  cy.exec(
    `oc annotate secret ${secretName} -n ${namespace} ` +
      `openshift.io/display-name=${secretName} ` +
      `opendatahub.io/connection-type=pgvector --overwrite && ` +
      `oc label secret ${secretName} -n ${namespace} ` +
      `opendatahub.io/dashboard=true opendatahub.io/secret-type=pgvector --overwrite`,
    { failOnNonZeroExit: true, log: false },
  );
};

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------

/**
 * Provision the project-scoped AutoRAG vector database.
 */
export const provisionVectorDatabase = (namespace: string, vectorDbSecretName: string): void => {
  deployVectorStore(namespace);
  waitForVectorStoreReady(namespace);
  createVectorDbSecret(namespace, vectorDbSecretName);
};

// ---------------------------------------------------------------------------
// Cleanup helpers (resilient — each call uses failOnNonZeroExit: false)
// ---------------------------------------------------------------------------

/**
 * Clean up a generated project-scoped secret.
 */
export const cleanupAutoragSecret = (namespace: string, secretName: string): void => {
  cy.log(`Cleaning up AutoRAG secret ${secretName}`);
  cy.exec(`oc delete secret ${secretName} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Clean up only resources generated in the unique AutoRAG project.
 */
export const cleanupAutoragInfrastructure = (
  namespace: string,
  maasSecretName: string,
  vectorDbSecretName: string,
): void => {
  cleanupVectorStore(namespace);
  cleanupAutoragSecret(namespace, maasSecretName);
  cleanupAutoragSecret(namespace, vectorDbSecretName);
};
