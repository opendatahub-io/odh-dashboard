/**
 * Applies the given YAML content using the `oc apply` command.
 * 
 * @param yamlContent YAML content to be applied
 * @param tempFilePath Path to the temporary file
 * @returns Cypress Chainable
 */
export const applyOpenShiftYaml = (yamlContent: string, tempFilePath: string) => {
  cy.writeFile(tempFilePath, yamlContent);
  
    const ocCommand = `oc apply -f ${tempFilePath}`;
  
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    //   cy.log('Command Output:', result.stdout);
    //   cy.log('Command Error:', result.stderr);
  
    //   // Clean up the temporary file
    //   cy.task('deleteFile', tempFilePath);
  
    //   if (result.code === 0) {
    //     cy.log(`YAML content applied successfully.`);
    //   } else {
    //     cy.log(`Failed to apply YAML content.`);
    //   }
  
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

  cy.log(Cypress.env())

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
  // The default timeout is 60 seconds, and the deletion can take longer
  return cy.exec(ocCommand, { failOnNonZeroExit: false , timeout: 180000}).then((result) => {
    return result;
  });
};
  





// /**
//  * Create an Openshift Project
//  * 
//  * @param projectName Project Name
//  * @param displayName Project Display Name
//  * @returns Result Object of the operation
//  */
// export const createOpenShiftProject = (projectName: string, displayName?: string) => {
  
//     const finalDisplayName = displayName || projectName;  
//     const ocCommand = `oc new-project ${projectName} --display-name='${finalDisplayName}'`;
  
//     return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
  
//       cy.log('Command Output:', result.stdout);
//       cy.log('Command Error:', result.stderr);
          
//       if (result.code === 0) {
//         cy.log(`Project ${projectName} created successfully.`);
//       } else {
//         cy.log(`Failed to create project ${projectName}.`);
//       }
//       return result;
//     });
//   };
  
  
//   /**
//    * Delete an Openshift Project given its name
//    * 
//    * @param projectName OpenShift Project name
//    * @returns Result Object of the operation
//    */
//   export const deleteOpenShiftProject = (projectName: string) => {
//     const ocCommand = `oc delete project ${projectName}`;
    
//     return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
//       cy.log('Command Output:', result.stdout);
//       cy.log('Command Error:', result.stderr);
    
//       if (result.code === 0) {
//         cy.log(`Project ${projectName} deleted successfully.`);
//       } else {
//         cy.log(`Failed to delete project ${projectName}.`);
//       }
    
//       return result;
//     });
//   };
    