type TrackingCapture = { log: sinon.SinonSpy; track: sinon.SinonStub };

/** Observe development logs and stub Segment delivery in production builds. No events leave the test. */
export const captureTracking = (): Cypress.Chainable =>
  cy.window().then((win) => {
    const log = cy.spy(win.console, 'log');
    const track = cy.stub();
    Object.assign(win, { analytics: { ...win.analytics, track } });
    return cy.wrap({ log, track }).as('trackingCapture');
  });

export const expectSafeTracking = (
  eventName: string,
  properties: Record<string, unknown>,
  rawMessage: string,
): Cypress.Chainable =>
  cy.get<TrackingCapture>('@trackingCapture').should(({ log, track }) => {
    const events = log
      .getCalls()
      .map((call) => String(call.args[0]))
      .filter((message) => message.startsWith(`Telemetry event triggered: ${eventName} - `))
      .map((event) =>
        JSON.parse(event.slice(event.indexOf(' - ') + 3, event.lastIndexOf(' for version '))),
      );
    events.push(
      ...track
        .getCalls()
        .filter((call) => call.args[0] === eventName)
        .map((call) => call.args[1]),
    );
    expect(events.length, eventName).to.be.greaterThan(0);
    events.forEach((event) => {
      expect(event).to.deep.include(properties);
      expect(JSON.stringify(event)).not.to.contain(rawMessage);
    });
  });
