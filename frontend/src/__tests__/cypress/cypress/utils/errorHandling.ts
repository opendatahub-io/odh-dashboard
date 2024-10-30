/**
 * Handles the result of an OpenShift (oc) command execution.
 * @param result The result of the command execution.
 * @throws Error if the command fails with an unexpected exit code.
 */
export function handleOCCommandResult(result: Cypress.Exec): void {
  if (result.code !== 0 && result.code !== 1) {
    // Code 1 is expected when the project doesn't exist, so we only throw for other non-zero codes
    cy.log(`ERROR: Command execution failed
            stdout: ${result.stdout}
            stderr: ${result.stderr}`);
    throw new Error(`Command failed with code ${result.code}`);
  }
}
