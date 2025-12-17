import { Contextual } from './components/Contextual';

class ApplicationLauncherMenuGroup extends Contextual<HTMLElement> {
  shouldHaveApplicationLauncherItem(name: string) {
    this.findApplicationLauncherItem(name).should('exist');
    return this;
  }

  shouldNotHaveApplicationLauncherItem(name: string) {
    this.findApplicationLauncherItem(name).should('not.exist');
    return this;
  }

  findApplicationLauncherItem(name: string) {
    return this.find().findAllByTestId('application-launcher-item').contains(name);
  }
}

export class ApplicationLauncher extends Contextual<HTMLElement> {
  toggleAppLauncherButton(): void {
    this.find().findByRole('button', { name: 'Application launcher' }).click();
  }

  findApplicationLauncherMenuGroup(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findAllByTestId('application-launcher-group').contains(name);
  }

  getApplicationLauncherMenuGroup(name: string): ApplicationLauncherMenuGroup {
    return new ApplicationLauncherMenuGroup(() =>
      this.findApplicationLauncherMenuGroup(name).parents(),
    );
  }
}
