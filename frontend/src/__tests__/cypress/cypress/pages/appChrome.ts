class AppChrome {
  selectSideBar() {
    return cy.get('#page-sidebar');
  }

  selectNavItem(name: string) {
    return this.selectSideBar().findByRole('link', { name });
  }

  expandNavItem(name: string) {
    this.selectSideBar().findByRole('button', { name, expanded: false }).click();
  }
}

export const appChrome = new AppChrome();
