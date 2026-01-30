import { render, screen } from '@testing-library/react';
import React from 'react';
import { GuardrailsUnavailableAlert } from '~/app/Chatbot/components/chatbotConfiguration/GuardrailsUnavailableAlert';

describe('GuardrailsUnavailableAlert', () => {
  it('should render as a warning alert with inline styling', () => {
    const { container } = render(<GuardrailsUnavailableAlert />);

    const alert = container.querySelector('.pf-v6-c-alert.pf-m-warning.pf-m-inline');
    expect(alert).toBeInTheDocument();
  });

  it('should display the correct title', () => {
    render(<GuardrailsUnavailableAlert />);

    expect(screen.getByText('Guardrails unavailable')).toBeInTheDocument();
  });

  it('should display the complete warning message', () => {
    render(<GuardrailsUnavailableAlert />);

    expect(
      screen.getByText(
        'Guardrails are not configured for this cluster. You can continue with the playground configuration, but guardrails will be disabled. Contact a cluster administrator to add guardrails.',
      ),
    ).toBeInTheDocument();
  });
});
