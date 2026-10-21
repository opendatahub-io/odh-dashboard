'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Cypress E2E workflow', () => {
  it('passes explicit specs through the Cypress CLI instead of an ignored environment variable', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('CYPRESS_COMMAND+=" --spec $ESCAPED_SPEC_LIST"'));
    assert.ok(!workflow.includes('export CYPRESS_spec='));
  });

  it('uses the human-readable Node test reporter', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('--test-reporter=spec'));
  });

  it('routes Gen AI inter-BFF MLflow calls through the pod-local E2E MLflow BFF', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );
    const genAiMakefile = fs.readFileSync(
      path.join(__dirname, '../../../packages/gen-ai/bff/Makefile'),
      'utf8',
    );

    assert.ok(workflow.includes("BFF_MLFLOW_DEV_URL: 'http://localhost:9110/api/v1'"));
    assert.ok(workflow.includes("BFF_MLFLOW_AUTH_TOKEN_HEADER: 'Authorization'"));
    assert.ok(workflow.includes("BFF_MLFLOW_AUTH_TOKEN_PREFIX: 'Bearer '"));
    assert.ok(workflow.includes("MLFLOW_URL: 'https://localhost:18443/mlflow'"));
    assert.ok(
      workflow.includes('oc port-forward -n redhat-ods-applications deployment/mlflow 18443:8443'),
    );
    assert.ok(workflow.includes('trap cleanup_mlflow_forward EXIT'));
    assert.ok(
      genAiMakefile.includes('BFF_MLFLOW_AUTH_TOKEN_PREFIX="$(BFF_MLFLOW_AUTH_TOKEN_PREFIX)"'),
    );
  });
});
