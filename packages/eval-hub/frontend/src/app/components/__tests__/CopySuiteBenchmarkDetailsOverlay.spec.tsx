import * as React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockFlatBenchmark } from '~/__mocks__/mockBenchmark';
import CopySuiteBenchmarkDetailsOverlay from '~/app/components/CopySuiteBenchmarkDetailsOverlay';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const TestOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button type="button" data-testid="benchmark-trigger" onClick={() => setIsOpen(true)}>
        Open benchmark details
      </button>
      <CopySuiteBenchmarkDetailsOverlay
        benchmark={mockFlatBenchmark()}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onPrimaryAction={jest.fn()}
        primaryActionLabel="Select benchmark"
      />
    </>
  );
};

const activateDrawerFocusTrap = async () => {
  const panel = await screen.findByTestId('benchmark-drawer-panel');
  const transitionEnd = new Event('transitionend', { bubbles: true });
  Object.defineProperty(transitionEnd, 'propertyName', { value: 'transform' });
  act(() => panel.dispatchEvent(transitionEnd));
  await waitFor(() => expect(within(panel).getByRole('separator')).toHaveFocus());
  return panel;
};

describe('CopySuiteBenchmarkDetailsOverlay', () => {
  beforeEach(() => {
    jest.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue({
      length: 1,
    } as DOMRectList);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should move initial focus into the drawer when opened', async () => {
    const user = userEvent.setup();
    render(<TestOverlay />);

    await user.click(screen.getByTestId('benchmark-trigger'));
    const panel = await activateDrawerFocusTrap();

    expect(within(panel).getByRole('separator')).toHaveFocus();
  });

  it('should contain Tab focus within the drawer', async () => {
    const user = userEvent.setup();
    render(<TestOverlay />);

    await user.click(screen.getByTestId('benchmark-trigger'));
    const panel = await activateDrawerFocusTrap();

    for (let index = 0; index < 5; index += 1) {
      await user.tab();
      expect(panel).toContainElement(
        document.activeElement instanceof HTMLElement ? document.activeElement : null,
      );
    }
  });

  it('should restore focus to the triggering benchmark button when closed', async () => {
    const user = userEvent.setup();
    render(<TestOverlay />);

    const trigger = screen.getByTestId('benchmark-trigger');
    await user.click(trigger);
    const panel = await activateDrawerFocusTrap();

    await user.click(screen.getByTestId('benchmark-drawer-close-footer'));
    const transitionEnd = new Event('transitionend', { bubbles: true });
    Object.defineProperty(transitionEnd, 'propertyName', { value: 'transform' });
    act(() => panel.dispatchEvent(transitionEnd));

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
