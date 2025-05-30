import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';

class LoginDialog extends Modal {
  constructor() {
    super(/Session Expired/);
  }

  // FIXME Remove once PF version is upgraded to 6.1.0.
  // https://issues.redhat.com/browse/RHOAIENG-11946
  // https://github.com/patternfly/patternfly-react/issues/11041
  shouldBeOpen(open = true): void {
    if (open) {
      this.find();
    } else {
      this.find().should('not.exist');
    }
  }

  findLoginButton() {
    return this.findFooter().findByTestId('modal-login-button');
  }
}
export const loginDialog = new LoginDialog();
