import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleSelect from '#~/components/SimpleSelect';

describe('SimpleSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should restore modal overflow when the menu closes', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <SimpleSelect
          value={undefined}
          options={[
            { key: 'config-map', label: 'Config map' },
            { key: 'secret', label: 'Secret' },
          ]}
          onChange={jest.fn()}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const toggle = screen.getByRole('button', { name: 'Options menu' });

    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(dialog.style.overflow).toBe('visible');

    await act(async () => {
      fireEvent.keyDown(toggle, { key: 'Escape' });
    });
    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute('data-multiselection-overflow-unlock-count')).toBeNull();
  });
});
