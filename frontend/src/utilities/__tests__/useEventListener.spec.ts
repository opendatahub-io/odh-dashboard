import { useEventListener } from '#~/utilities/useEventListener';
import { testHook } from '#~/__tests__/unit/testUtils/hooks';

describe('useEventListener', () => {
  it('should add and remove event listener', () => {
    const eventTarget: EventTarget = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };

    const mockCallback = jest.fn();

    const { rerender } = testHook(useEventListener)(eventTarget, 'click', mockCallback);

    // Check that the event listener is added
    expect(eventTarget.addEventListener).toHaveBeenCalledWith('click', mockCallback);

    // Rerender with the same props should not affect the event listener
    rerender(eventTarget, 'click', mockCallback);
    expect(eventTarget.addEventListener).toHaveBeenCalledTimes(1); // No new listener added

    // Rerender with different props should remove the previous listener and add a new one
    const newCallback = jest.fn();
    rerender(eventTarget, 'mouseover', newCallback);

    expect(eventTarget.removeEventListener).toHaveBeenCalledWith('click', mockCallback);
    expect(eventTarget.addEventListener).toHaveBeenCalledWith('mouseover', newCallback);
  });
});
