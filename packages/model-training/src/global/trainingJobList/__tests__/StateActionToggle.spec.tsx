import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StateActionToggle from '../StateActionToggle';

describe('StateActionToggle', () => {
  it('should display Pause button when not paused', () => {
    render(<StateActionToggle isPaused={false} onPause={jest.fn()} onResume={jest.fn()} />);

    const toggle = screen.getByTestId('state-action-toggle');
    expect(toggle).toBeVisible();
    expect(toggle).toHaveTextContent('Pause');
  });

  it('should display Resume button when paused', () => {
    render(<StateActionToggle isPaused onPause={jest.fn()} onResume={jest.fn()} />);

    const toggle = screen.getByTestId('state-action-toggle');
    expect(toggle).toBeVisible();
    expect(toggle).toHaveTextContent('Resume');
  });

  it('should be disabled when loading', () => {
    render(
      <StateActionToggle isPaused={false} onPause={jest.fn()} onResume={jest.fn()} isLoading />,
    );

    expect(screen.getByTestId('state-action-toggle')).toBeDisabled();
  });

  it('should be disabled when isDisabled is true', () => {
    render(
      <StateActionToggle isPaused={false} onPause={jest.fn()} onResume={jest.fn()} isDisabled />,
    );

    expect(screen.getByTestId('state-action-toggle')).toBeDisabled();
  });

  it('should call onPause when clicked and not paused', () => {
    const onPause = jest.fn();
    const onResume = jest.fn();
    render(<StateActionToggle isPaused={false} onPause={onPause} onResume={onResume} />);

    fireEvent.click(screen.getByTestId('state-action-toggle'));
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();
  });

  it('should call onResume when clicked and paused', () => {
    const onPause = jest.fn();
    const onResume = jest.fn();
    render(<StateActionToggle isPaused onPause={onPause} onResume={onResume} />);

    fireEvent.click(screen.getByTestId('state-action-toggle'));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onPause).not.toHaveBeenCalled();
  });
});
