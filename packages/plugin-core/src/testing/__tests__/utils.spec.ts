import { expectExtensionsToBeValid } from '../utils';

// Tests the test function
describe('validateExtensions', () => {
  it('should validate a valid code ref', () => {
    expectExtensionsToBeValid([
      {
        type: 'test',
        properties: {
          firstLevel: {
            props: {
              // This is an invalid import used for testing purposes.
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              content: () => import('./MyModule'),
            },
          },
          bool: true,
        },
      },
    ]);
  });

  it('should validate a valid code ref with a named export', () => {
    expectExtensionsToBeValid([
      {
        type: 'test',
        properties: {
          firstLevel: {
            props: {
              // This is an invalid import used for testing purposes.
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              content: () => import('./MyModule').then((module) => module.namedExport),
            },
          },
          bool: true,
        },
      },
    ]);
  });

  it('should validate an invalid code ref', () => {
    expect(() =>
      expectExtensionsToBeValid([
        {
          type: 'test',
          properties: {
            firstLevel: {
              count: 1,
              prop: {
                notAnImport: () => 'unknown',
              },
            },
          },
        },
      ]),
    ).toThrow();
  });
});
