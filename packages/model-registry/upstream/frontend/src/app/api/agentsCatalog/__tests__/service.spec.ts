import { handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { getAgent, getAgentFilterOptionList, getAgentList } from '~/app/api/agentsCatalog/service';

jest.mock('mod-arch-core', () => ({
  restGET: jest.fn(),
  handleRestFailures: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const host = '/api/v1/agent_catalog';
const queryParams = { namespace: 'catalog-ns' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isModArchResponse).mockReturnValue(true);
});

describe('agent catalog services using the shared response helper', () => {
  it('should preserve list query serialization and unwrap the response', async () => {
    const data = { items: [{ id: '1', name: 'agent' }], size: 1, pageSize: 5, nextPageToken: '' };
    jest.mocked(handleRestFailures).mockResolvedValue({ data });
    await expect(
      getAgentList(host, queryParams)({}, { pageSize: 5, sourceLabel: 'Red Hat', q: 'agent' }),
    ).resolves.toEqual(data);
    expect(restGET).toHaveBeenCalledWith(
      host,
      '/agents',
      { ...queryParams, pageSize: '5', sourceLabel: 'Red Hat', q: 'agent' },
      {},
    );
  });

  it('should preserve detail and filter paths', async () => {
    jest.mocked(handleRestFailures).mockResolvedValue({ data: { id: '1', name: 'agent' } });
    await expect(getAgent(host, queryParams)({}, '1')).resolves.toEqual({ id: '1', name: 'agent' });
    expect(restGET).toHaveBeenLastCalledWith(host, '/agents/1', queryParams, {});
    const filters = { filters: {} };
    jest.mocked(handleRestFailures).mockResolvedValue({ data: filters });
    await expect(getAgentFilterOptionList(host, queryParams)({})).resolves.toEqual(filters);
    expect(restGET).toHaveBeenLastCalledWith(host, '/agents_filter_options', queryParams, {});
  });

  it('should continue rejecting invalid responses', async () => {
    jest.mocked(handleRestFailures).mockResolvedValue({});
    jest.mocked(isModArchResponse).mockReturnValue(false);
    await expect(getAgent(host, queryParams)({}, '1')).rejects.toThrow('Invalid response format');
  });
});
