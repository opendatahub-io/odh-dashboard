import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NoPipelineServer from '~/app/components/empty-states/NoPipelineServer';

const mockNavigate = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

describe('NoPipelineServer', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders Empty State A (configure compatible pipeline server)', () => {
    render(
      <MemoryRouter>
        <NoPipelineServer />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Configure a compatible pipeline server' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'To use AutoRAG, you need access to a pipeline server with AutoRAG and AutoML enabled. Create or edit a pipeline server on the Pipelines page.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Pipelines' })).toBeInTheDocument();
  });

  it('navigates to pipelines route when Go to Pipelines is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Go to Pipelines' }));

    expect(mockNavigate).toHaveBeenCalledWith('/develop-train/pipelines/definitions/my-project');
  });
});
