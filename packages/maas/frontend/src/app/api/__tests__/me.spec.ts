/* eslint-disable camelcase */
import * as modArchCore from 'mod-arch-core';
import { getMaaSMe } from '~/app/api/me';
import { MAAS_ORGS_CLAIM, type MaaSMe } from '~/app/types/me';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restGET: jest.fn(),
}));

const mockRestGET = jest.mocked(modArchCore.restGET);
const mockHandleRestFailures = jest.mocked(modArchCore.handleRestFailures);

const validMe: MaaSMe = {
  sub: '00u7a1b2c3d4e5f6g7h8',
  email: 'alex@grid-tenant-1.com',
  name: 'Alex Doe',
  [MAAS_ORGS_CLAIM]: [
    {
      organization_id: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa',
      organization_name: 'coke',
      roles: ['admins'],
    },
  ],
};

describe('getMaaSMe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with valid MaaS identity metadata', async () => {
    mockRestGET.mockResolvedValue({ data: validMe });

    const result = await getMaaSMe()({} as never);

    expect(result.sub).toBe(validMe.sub);
    expect(result[MAAS_ORGS_CLAIM][0].roles).toContain('admins');
  });

  it('should throw when required claims are missing', async () => {
    mockRestGET.mockResolvedValue({ data: { ...validMe, sub: undefined } });

    await expect(getMaaSMe()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw when response is not mod-arch wrapped', async () => {
    mockRestGET.mockResolvedValue(validMe);

    await expect(getMaaSMe()({} as never)).rejects.toThrow('Invalid response format');
  });
});
