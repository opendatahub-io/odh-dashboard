import { getNotebookImageNames } from "~/__tests__/cypress/cypress/utils/oc_commands/imageStreams";

describe('Notebook Image Test', () => {
    it('collects and prints image names', () => {
      const namespace = 'redhat-ods-applications';
  
      getNotebookImageNames(namespace).then((imageInfos) => {
        cy.log('Collected image infos:', JSON.stringify(imageInfos, null, 2));
  
        // Add some assertions
        expect(imageInfos).to.be.an('array');
        expect(imageInfos.length).to.be.greaterThan(0, 'There should be at least one image info');
  
        imageInfos.forEach((info, index) => {
          cy.log(`Image ${index + 1}:`, JSON.stringify(info, null, 2));
        });
  
        // Filter and print notebook images with their names
        const notebookImages = imageInfos.filter(info => info.name !== null);
        cy.log(`Number of notebook images: ${notebookImages.length}`);
        cy.log('Notebook Images:');
        notebookImages.forEach(info => {
          cy.log(`- ${info.image}: ${info.name}`);
        });
      });
    });
  });
  
