/**
 * Focused regression coverage for the tracing E2E route wait: another project's
 * route must not satisfy this project's wait. Stub OC responses to cover that
 * race and successful structured/legacy YAML parsing without cluster access.
 */
import * as yaml from 'js-yaml';
import { waitForPlaygroundTracingRoute } from '../../../utils/oc_commands/genAiTracing';

const project = 'tracing-test';
const namespace = 'monitoring';

const collectorOutput = (source: string, legacy = false): string => {
  const resource = yaml.load(source) as { spec: { config: unknown } };
  if (legacy) {
    resource.spec.config = yaml.dump(resource.spec.config);
  }
  return JSON.stringify(resource);
};

const mockCollector = (outputs: string[]): ReturnType<typeof cy.stub> => {
  let requests = 0;
  return cy
    .stub(cy, 'exec')
    .callsFake((command: string, options: { failOnNonZeroExit: boolean; log: boolean }) => {
      expect(command).to.eq(
        'oc get opentelemetrycollectors.opentelemetry.io gen-ai-trace-collector -n monitoring --ignore-not-found -o json --request-timeout=10s',
      );
      expect(options).to.deep.eq({ failOnNonZeroExit: false, log: false });
      const stdout = outputs[Math.min(requests, outputs.length - 1)];
      requests += 1;
      return cy.wrap({ stdout, stderr: '', exitCode: 0 }, { log: false });
    });
};

describe('waitForPlaygroundTracingRoute', () => {
  for (const legacy of [false, true]) {
    it(`accepts a connected project route in ${
      legacy ? 'legacy YAML' : 'structured'
    } config`, () => {
      cy.fixture<string>('resources/genAi/tracing-collector.yaml', 'utf8').then((source) => {
        mockCollector([collectorOutput(source, legacy)]);
        waitForPlaygroundTracingRoute(project, namespace).should('eq', namespace);
      });
    });
  }

  it('waits for this project even when a different project already has a route', () => {
    cy.fixture<string>('resources/genAi/tracing-collector.yaml', 'utf8').then((source) => {
      const query = mockCollector([
        collectorOutput(source.replaceAll(project, 'other-project')),
        collectorOutput(source),
      ]);
      waitForPlaygroundTracingRoute(project, namespace, { pollIntervalMs: 0 }).then(() => {
        expect(query).to.have.callCount(2);
      });
    });
  });
});
