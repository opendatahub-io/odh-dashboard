import { getNotebookImageNames } from "~/__tests__/cypress/cypress/utils/oc_commands/imageStreams";


describe('test', () => {
    it('quick test', () => {
      getNotebookImageNames('redhat-ods-applications').then(imageInfos => {
        // Ensure imageInfos is an array
        expect(imageInfos).to.be.an('array');
        expect(imageInfos.length).to.be.greaterThan(0);
  
        // Log the resolved imageInfos for debugging
        cy.log(JSON.stringify(imageInfos));
      });
    });
  });
  