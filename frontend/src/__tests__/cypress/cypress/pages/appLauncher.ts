import { Contextual } from './components/Contextual';

class ApplicationLauncherMenuGroup extends Contextual<HTMLElement> {
  shouldHaveApplicationLauncherItem(name: string) {
    this.find().findAllByTestId('application-launcher-item').contains(name).should('exist');
    return this;
  }
}

export class ApplicationLauncher extends Contextual<HTMLElement> {
  toggleAppLauncherButton(): void {
    this.find().findByRole('button', { name: 'Application launcher' }).click();
  }

  getApplicationLauncherMenuGroup(name: string): ApplicationLauncherMenuGroup {
    return new ApplicationLauncherMenuGroup(() =>
      this.find().findAllByTestId('application-launcher-group').contains(name).parents(),
    );
  }
}
