export class ToastNotifications {
  findToastNotificationList(timeout?: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(
      'toast-notification-group',
      timeout !== undefined ? { timeout } : undefined,
    );
  }

  // gets the list of notifications, each entry has an Alert with data-testid=toast-notification-alert
  findToastNotification(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    const element = this.findToastNotificationList()
      .findByTestId('toast-notification-alert')
      .eq(index);
    return element;
  }
}

export const toastNotifications = new ToastNotifications();
