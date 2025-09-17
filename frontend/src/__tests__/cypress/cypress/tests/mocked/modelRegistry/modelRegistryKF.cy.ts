// TODO delete me when we have a module tests
/*
 * This test simply verifies that that the model registry module loads
 * and contributes extensions to the ODH Dashboard.
 */
describe('Model Registry KF', () => {
  it('should load the model registry kf', () => {
    cy.visit('/model-registry?devFeatureFlags=Model+Registry+Plugin%3Dtrue');
    cy.contains('Model registry (KF)').should('exist');
  });
});
