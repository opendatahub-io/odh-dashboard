/* eslint-disable camelcase */
import * as modArchCore from 'mod-arch-core';
import { getMaaSWhoAmI, getMaaSWhoAmIDisplayName } from '~/app/api/whoami';
import { type MaaSWhoAmI } from '~/app/types/whoami';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restGET: jest.fn(),
}));

const mockRestGET = jest.mocked(modArchCore.restGET);
const mockHandleRestFailures = jest.mocked(modArchCore.handleRestFailures);

const validWhoAmI: MaaSWhoAmI = {
  sub: '00u7a1b2c3d4e5f6g7h8',
  email: 'alex@grid-tenant-1.com',
  name: 'Alex Doe',
  isAdmin: true,
};

describe('getMaaSWhoAmI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with valid MaaS identity metadata', async () => {
    mockRestGET.mockResolvedValue({ data: validWhoAmI });

    const result = await getMaaSWhoAmI()({} as never);

    expect(result.sub).toBe(validWhoAmI.sub);
    expect(result.isAdmin).toBe(true);
  });

  it('should throw when required claims are missing', async () => {
    mockRestGET.mockResolvedValue({ data: { ...validWhoAmI, sub: undefined } });

    await expect(getMaaSWhoAmI()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw when response is not mod-arch wrapped', async () => {
    mockRestGET.mockResolvedValue(validWhoAmI);

    await expect(getMaaSWhoAmI()({} as never)).rejects.toThrow('Invalid response format');
  });
});

describe('getMaaSWhoAmIDisplayName', () => {
  it.each([
    ['Alex Doe', 'alex@example.com', true, 'Alex Doe'],
    [undefined, 'alex@example.com', false, 'alex@example.com'],
    [undefined, undefined, true, 'Admin'],
    [undefined, undefined, false, 'User'],
  ])('uses the required identity fallback order', (name, email, isAdmin, expected) => {
    expect(
      getMaaSWhoAmIDisplayName({
        sub: 'subject',
        name,
        email,
        isAdmin,
      }),
    ).toBe(expected);
  });
});
