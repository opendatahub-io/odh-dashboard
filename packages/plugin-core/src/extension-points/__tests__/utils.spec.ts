import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard, isValidExtensionId } from '../utils';

type FakeTabExtension = Extension<
  'test.details/tab',
  {
    id: string;
    title: string;
  }
>;

type FakeActionExtension = Extension<
  'test.header/action',
  {
    id: string;
    label: string;
  }
>;

describe('createExtensionGuard', () => {
  it('should return true for matching extension type', () => {
    const isFakeTab = createExtensionGuard<FakeTabExtension>('test.details/tab');
    const extension: Extension = {
      type: 'test.details/tab',
      properties: { id: 'tab-1', title: 'Tab 1' },
    };

    expect(isFakeTab(extension)).toBe(true);
  });

  it('should return false for non-matching extension type', () => {
    const isFakeTab = createExtensionGuard<FakeTabExtension>('test.details/tab');
    const extension: Extension = {
      type: 'other.extension/type',
      properties: { id: 'other', title: 'Other' },
    };

    expect(isFakeTab(extension)).toBe(false);
  });

  it('should narrow the type when used as a predicate', () => {
    const isFakeAction = createExtensionGuard<FakeActionExtension>('test.header/action');
    const extensions: Extension[] = [
      { type: 'test.header/action', properties: { id: 'a1', label: 'Action 1' } },
      { type: 'test.details/tab', properties: { id: 'tab-1', title: 'Tab 1' } },
      { type: 'test.header/action', properties: { id: 'a2', label: 'Action 2' } },
    ];

    const filtered = extensions.filter(isFakeAction);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].properties.id).toBe('a1');
    expect(filtered[1].properties.id).toBe('a2');
  });

  it('should return false for empty type string', () => {
    const guard = createExtensionGuard<FakeTabExtension>('');
    const extension: Extension = {
      type: 'test.details/tab',
      properties: { id: 'tab-1', title: 'Tab 1' },
    };

    expect(guard(extension)).toBe(false);
  });

  it('should handle case-sensitive type matching', () => {
    const guard = createExtensionGuard<FakeTabExtension>('test.details/tab');
    const extension: Extension = {
      type: 'Test.Details/Tab',
      properties: { id: 'tab-1', title: 'Tab 1' },
    };

    expect(guard(extension)).toBe(false);
  });

  it('should return false when properties is null or undefined', () => {
    const guard = createExtensionGuard<FakeTabExtension>('test.details/tab');

    expect(guard({ type: 'test.details/tab', properties: null } as unknown as Extension)).toBe(
      false,
    );
    expect(guard({ type: 'test.details/tab', properties: undefined } as unknown as Extension)).toBe(
      false,
    );
  });

  it('should accept a propertiesValidator and reject invalid properties', () => {
    const guard = createExtensionGuard<FakeTabExtension>(
      'test.details/tab',
      (p): p is FakeTabExtension['properties'] =>
        typeof (p as Record<string, unknown>).id === 'string' &&
        typeof (p as Record<string, unknown>).title === 'string',
    );

    expect(guard({ type: 'test.details/tab', properties: { id: 'tab-1', title: 'Tab 1' } })).toBe(
      true,
    );
    expect(
      guard({ type: 'test.details/tab', properties: { id: 123 } } as unknown as Extension),
    ).toBe(false);
  });
});

describe('isValidExtensionId', () => {
  it.each(['foo', 'my-tab', 'tab_1'])('should return true for safe id "%s"', (id) => {
    expect(isValidExtensionId(id)).toBe(true);
  });

  it.each(['foo/bar', ':param', '*', 'tab with spaces', ''])(
    'should return false for unsafe id "%s"',
    (id) => {
      expect(isValidExtensionId(id)).toBe(false);
    },
  );
});
