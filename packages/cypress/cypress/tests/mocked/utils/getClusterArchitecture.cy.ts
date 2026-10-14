import { getClusterArchitecture } from '../../../utils/oc_commands/baseCommands';

describe('getClusterArchitecture', () => {
  const mockNodes = (stdout: string, exitCode = 0, stderr = ''): void => {
    cy.stub(cy, 'exec').callsFake((command: string, options: { failOnNonZeroExit: boolean }) => {
      expect(command).to.eq("oc get nodes -o jsonpath='{.items[*].status.nodeInfo.architecture}'");
      expect(options).to.deep.eq({ failOnNonZeroExit: false });
      return cy.wrap({ stdout, stderr, exitCode });
    });
  };

  it('maps arm64 nodes to arm64', () => {
    mockNodes('arm64');
    getClusterArchitecture().should('eq', 'arm64');
  });

  it('maps aarch64 nodes to arm64', () => {
    mockNodes('aarch64');
    getClusterArchitecture().should('eq', 'arm64');
  });

  it('maps amd64 nodes to x86_64', () => {
    mockNodes('amd64');
    getClusterArchitecture().should('eq', 'x86_64');
  });

  it('preserves s390x', () => {
    mockNodes('s390x');
    getClusterArchitecture().should('eq', 's390x');
  });

  it('prioritizes ARM when node architectures are mixed', () => {
    mockNodes('amd64 s390x aarch64');
    getClusterArchitecture().should('eq', 'arm64');
  });

  it('falls back to x86_64 when oc exits nonzero', () => {
    mockNodes('arm64', 1);
    getClusterArchitecture().should('eq', 'x86_64');
  });

  it('falls back to x86_64 when oc returns no architecture', () => {
    mockNodes('  ', 0);
    getClusterArchitecture().should('eq', 'x86_64');
  });
});
