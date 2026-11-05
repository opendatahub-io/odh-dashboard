import {
  ensureOcSuccess,
  getNodeWithMostAllocatableGpus,
} from '../../../utils/oc_commands/baseCommands';

type MockNode = {
  metadata: { name: string };
  status?: { allocatable?: Record<string, string> };
};

const node = (name: string, gpus?: string): MockNode => ({
  metadata: { name },
  ...(gpus === undefined ? {} : { status: { allocatable: { 'nvidia.com/gpu': gpus } } }),
});

// `oc get nodes -o json` returns a NodeList, so the nodes are nested under `items`.
const mockNodes = (items: MockNode[], exitCode = 0, stderr = ''): void => {
  cy.stub(cy, 'exec').callsFake((command: string, options: { failOnNonZeroExit: boolean }) => {
    expect(command).to.eq('oc get nodes -o json');
    expect(options).to.deep.eq({ failOnNonZeroExit: false });
    return cy.wrap({
      stdout: JSON.stringify({ apiVersion: 'v1', kind: 'NodeList', metadata: {}, items }),
      stderr,
      exitCode,
    });
  });
};

describe('getNodeWithMostAllocatableGpus', () => {
  it('picks the node with the highest allocatable GPU count', () => {
    mockNodes([node('node-a', '0'), node('node-b', '4'), node('node-c', '2')]);

    getNodeWithMostAllocatableGpus().should('deep.eq', { name: 'node-b', gpuCount: 4 });
  });

  it('handles a single GPU node', () => {
    mockNodes([node('node-only', '1')]);

    getNodeWithMostAllocatableGpus().should('deep.eq', { name: 'node-only', gpuCount: 1 });
  });

  it('returns the none placeholder when the cluster has no nodes', () => {
    mockNodes([]);

    getNodeWithMostAllocatableGpus().should('deep.eq', { name: 'none', gpuCount: 0 });
  });

  it('ignores a node without status.allocatable', () => {
    mockNodes([node('node-no-allocatable'), node('node-with-gpus', '2')]);

    getNodeWithMostAllocatableGpus().should('deep.eq', { name: 'node-with-gpus', gpuCount: 2 });
  });

  it('returns the none placeholder when no node exposes allocatable GPUs', () => {
    mockNodes([node('node-no-allocatable')]);

    getNodeWithMostAllocatableGpus().should('deep.eq', { name: 'none', gpuCount: 0 });
  });

  it('returns the none placeholder when the response has no items field', () => {
    cy.stub(cy, 'exec').callsFake((command: string, options: { failOnNonZeroExit: boolean }) => {
      expect(command).to.eq('oc get nodes -o json');
      expect(options).to.deep.eq({ failOnNonZeroExit: false });
      return cy.wrap({
        stdout: JSON.stringify({ apiVersion: 'v1', kind: 'NodeList' }),
        stderr: '',
        exitCode: 0,
      });
    });

    getNodeWithMostAllocatableGpus().should('deep.eq', { name: 'none', gpuCount: 0 });
  });

  it('fails with the masked oc error when the command exits non-zero', () => {
    expect(() =>
      ensureOcSuccess(
        { stdout: '', stderr: 'error: You must be logged in to the server', exitCode: 1 },
        'Unable to read allocatable NVIDIA GPUs from nodes',
      ),
    ).to.throw('Unable to read allocatable NVIDIA GPUs from nodes: error: You must be logged in');

    expect(() =>
      ensureOcSuccess({ stdout: '[]', stderr: '', exitCode: 0 }, 'must not throw'),
    ).to.not.throw();
  });
});
