class AppChrome {
  findSideBar() {
    return cy.get('#page-sidebar');
  }

  findNavItem(name: string, section?: string) {
    if (section) {
      this.findSideBar()
        .findByRole('button', { name: section })
        .then(($el) => {
          if ($el.attr('aria-expanded') === 'false') {
            cy.wrap($el).click();
          }
        });
    }
    return this.findSideBar().findByRole('link', { name });
  }
}

export const appChrome = new AppChrome();
