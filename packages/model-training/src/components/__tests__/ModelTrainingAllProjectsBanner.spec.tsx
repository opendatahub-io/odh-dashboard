import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ModelTrainingAllProjectsBanner from '../ModelTrainingAllProjectsBanner';

describe('ModelTrainingAllProjectsBanner', () => {
  it('should describe the all-projects jobs view', () => {
    render(<ModelTrainingAllProjectsBanner onExit={jest.fn()} />);

    expect(screen.getByTestId('training-jobs-all-projects-banner')).toHaveTextContent(
      "You're viewing jobs across every project you have access to.",
    );
    expect(screen.getByRole('button', { name: 'Exit all projects view' })).toBeInTheDocument();
  });

  it('should call onExit when exiting the all-projects view', () => {
    const onExit = jest.fn();
    render(<ModelTrainingAllProjectsBanner onExit={onExit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Exit all projects view' }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
