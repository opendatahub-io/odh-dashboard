/**
 * Applies the given YAML content using the `oc apply` command.
 *
 * @param yamlContent YAML content to be applied
 * @returns Cypress Chainable
 */
export const applyOpenShiftYaml = (yamlContent: string) => {
  const ocCommand = `oc apply -f - <<EOF\n${yamlContent}EOF`;
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      // If there is an error, log the error and fail the test
      cy.log(`ERROR applying YAML content
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Create an Openshift Project
 *
 * @param projectName Project Name
 * @param displayName Project Display Name
 * @returns Result Object of the operation
 */
export const createOpenShiftProject = (projectName: string, displayName?: string) => {
  const finalDisplayName = displayName || projectName;
  const ocCommand = `oc new-project ${projectName} --display-name='${finalDisplayName}'`;

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    return result;
  });
};

/**
 * Delete an Openshift Project given its name
 *
 * @param projectName OpenShift Project name
 * @returns Result Object of the operation
 */
export const deleteOpenShiftProject = (projectName: string) => {
  const ocCommand = `oc delete project ${projectName}`;
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then(() => {});
};
