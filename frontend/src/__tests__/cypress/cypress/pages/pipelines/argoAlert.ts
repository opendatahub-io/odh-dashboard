class ArgoAlert {
  findAlert() {
    return cy.findByTestId('invalid-argo-alert');
  }

  findSelfManagedReleaseNotesLink() {
    return cy.findByTestId('self-managed-release-notes-link');
  }

  findCloudServiceReleaseNotesLink() {
    return cy.findByTestId('cloud-service-release-notes-link');
  }
}

export const argoAlert = new ArgoAlert();
