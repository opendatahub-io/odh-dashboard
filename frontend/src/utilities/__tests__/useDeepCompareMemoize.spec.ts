import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';

describe('useDeepCompareMemoize', () => {
  it('should return a memoized version of the input value ', () => {
    const initialData = { user: { name: 'John', age: 25, city: 'New York' } };
    const newData = { user: { name: 'Alice', age: 30, city: 'San Francisco' } };
    const identicalData = { user: { name: 'John', age: 25, city: 'New York' } };

    const renderResult = testHook(useDeepCompareMemoize)(initialData);
    expect(renderResult).hookToBe(initialData);
    expect(renderResult).hookToHaveUpdateCount(1);

    // Re-render with new data, expect result to change
    renderResult.rerender(identicalData);
    expect(renderResult).hookToBe(initialData);
    expect(renderResult).hookToBeStable();
    expect(renderResult).hookToHaveUpdateCount(2);

    // Re-render with identical data, expect result not to change
    renderResult.rerender(newData);
    expect(renderResult).hookToStrictEqual(newData);
    expect(renderResult).hookToHaveUpdateCount(3);
  });

  it('should handle primitive values', () => {
    const initialNumber = 2024;
    const newNumber = 2025;
    const identicalNumber = 2024;

    const renderResult = testHook(useDeepCompareMemoize)(initialNumber);
    expect(renderResult).hookToBe(initialNumber);
    expect(renderResult).hookToHaveUpdateCount(1);

    // Re-render with identical data, expect result not to change
    renderResult.rerender(identicalNumber);
    expect(renderResult).hookToBe(initialNumber);
    expect(renderResult).hookToBeStable();
    expect(renderResult).hookToHaveUpdateCount(2);

    // Re-render with new data, expect result to change
    renderResult.rerender(newNumber);
    expect(renderResult).hookToBe(newNumber);
    expect(renderResult).hookToHaveUpdateCount(3);
  });

  it('should handle arrays', () => {
    const initialArray = ['book', 'pen', 'notebook'];
    const newArray = ['computer', 'mouse', 'keyboard'];
    const identicalArray = ['book', 'pen', 'notebook'];

    const renderResult = testHook(useDeepCompareMemoize)(initialArray);
    expect(renderResult).hookToBe(initialArray);
    expect(renderResult).hookToHaveUpdateCount(1);

    // Re-render with identical data, expect result not to change
    renderResult.rerender(identicalArray);
    expect(renderResult).hookToStrictEqual(initialArray);
    expect(renderResult).hookToBeStable();
    expect(renderResult).hookToHaveUpdateCount(2);

    // Re-render with new data, expect result to change
    renderResult.rerender(newArray);
    expect(renderResult).hookToBe(newArray);
    expect(renderResult).hookToHaveUpdateCount(3);
  });
});
