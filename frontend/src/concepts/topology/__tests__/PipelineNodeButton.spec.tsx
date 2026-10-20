import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { activateNodeButtonOnKeyDown } from '#~/concepts/topology/PipelineNodeButton';

describe('activateNodeButtonOnKeyDown', () => {
  it.each(['Enter', ' '])('activates once when %s is held', (key) => {
    const onClick = jest.fn();
    render(
      <button type="button" onClick={onClick} onKeyDown={activateNodeButtonOnKeyDown}>
        Toggle group
      </button>,
    );
    const button = screen.getByRole('button', { name: 'Toggle group' });

    fireEvent.keyDown(button, { key });
    fireEvent.keyDown(button, { key, repeat: true });
    fireEvent.keyDown(button, { key, repeat: true });

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
