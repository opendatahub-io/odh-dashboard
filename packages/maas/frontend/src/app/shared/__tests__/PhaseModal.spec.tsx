import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import PhaseModal from '~/app/shared/Phase/PhaseModal';
import { PhaseResourceType, PhaseStatus } from '~/app/utilities/phaseLabelUtils';

const defaultProps = {
  resourceType: PhaseResourceType.SUBSCRIPTION,
  resourceName: 'Test Subscription',
  isOpen: true,
  onClose: jest.fn(),
  subtitle: 'Subscription status',
  resourceUrl: '',
};

const renderPhaseModal = (
  props: Partial<React.ComponentProps<typeof PhaseModal>> & { phase: string },
): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <PhaseModal {...defaultProps} {...props} />
    </MemoryRouter>,
  );

describe('PhaseModal', () => {
  describe('modal title status label', () => {
    it.each([PhaseStatus.FAILED, PhaseStatus.INVALID, PhaseStatus.DEGRADED, PhaseStatus.PENDING])(
      'should render a label with %s status in the title',
      (phase) => {
        renderPhaseModal({ phase });

        const modal = screen.getByTestId('phase-modal');
        expect(modal).toBeInTheDocument();
        const title = within(modal).getByRole('heading', { level: 1 });
        expect(within(title).getByText(phase)).toBeInTheDocument();
      },
    );
  });

  describe('alert content by status', () => {
    it.each([PhaseStatus.FAILED, PhaseStatus.INVALID, PhaseStatus.DEGRADED, PhaseStatus.PENDING])(
      'should render alert body content for %s',
      (phase) => {
        renderPhaseModal({ phase });

        expect(screen.getByTestId('phase-modal-alert')).toBeInTheDocument();
        expect(screen.getByTestId('phase-modal-alert-body')).toBeInTheDocument();
      },
    );
  });

  describe('API details expandable', () => {
    it.each([PhaseStatus.FAILED, PhaseStatus.INVALID, PhaseStatus.DEGRADED])(
      'should show expandable API details for %s and reveal reason and status message when expanded',
      async (phase) => {
        const user = userEvent.setup();
        renderPhaseModal({
          phase,
          reason: 'TestReason',
          statusMessage: 'Test status message',
        });

        const apiDetails = screen.getByTestId('phase-api-details');
        expect(apiDetails).toBeInTheDocument();
        expect(screen.getByTestId('phase-api-details-code-block')).not.toBeVisible();

        await user.click(within(apiDetails).getByRole('button'));

        expect(screen.getByTestId('phase-api-details-code-block')).toBeVisible();
      },
    );

    it.each([PhaseResourceType.SUBSCRIPTION, PhaseResourceType.AUTHPOLICY])(
      'should not show expandable API details for pending %s',
      (resourceType) => {
        renderPhaseModal({
          phase: PhaseStatus.PENDING,
          resourceType,
          reason: 'TestReason',
          statusMessage: 'Test status message',
        });

        expect(screen.queryByTestId('phase-api-details')).not.toBeInTheDocument();
        expect(screen.queryByTestId('phase-api-details-code-block')).not.toBeInTheDocument();
      },
    );

    it('should show expandable API details for pending models', async () => {
      const user = userEvent.setup();
      renderPhaseModal({
        phase: PhaseStatus.PENDING,
        resourceType: PhaseResourceType.MODEL,
        reason: 'NoPairingFound',
        statusMessage: 'Awaiting governance pairing',
      });

      const apiDetails = screen.getByTestId('phase-api-details');
      expect(apiDetails).toBeInTheDocument();
      expect(screen.getByTestId('phase-api-details-code-block')).not.toBeVisible();

      await user.click(within(apiDetails).getByRole('button'));

      expect(screen.getByTestId('phase-api-details-code-block')).toBeVisible();
      expect(screen.getByTestId('phase-api-details-code-block')).toHaveTextContent(
        'NoPairingFound',
      );
    });

    it('should not show expandable API details for pending models without reason or status message', () => {
      renderPhaseModal({
        phase: PhaseStatus.PENDING,
        resourceType: PhaseResourceType.MODEL,
      });

      expect(screen.queryByTestId('phase-api-details')).not.toBeInTheDocument();
    });
  });

  describe('affected models', () => {
    it('should show affected models table for degraded subscription when models are provided', () => {
      renderPhaseModal({
        phase: PhaseStatus.DEGRADED,
        affectedModels: [
          {
            name: 'broken-model',
            displayName: 'Broken Model',
            phase: PhaseStatus.UNAVAILABLE,
            statusMessage: 'Inference service is down',
          },
        ],
      });

      expect(screen.getByTestId('affected-models-table')).toBeInTheDocument();
      expect(screen.getByText('Broken Model')).toBeInTheDocument();
      expect(screen.getByText('Inference service is down')).toBeInTheDocument();
    });

    it('should show not-found models in the affected models table', () => {
      renderPhaseModal({
        phase: PhaseStatus.DEGRADED,
        affectedModels: [
          {
            name: 'ghost-model',
            namespace: 'missing-ns',
            phase: PhaseStatus.UNAVAILABLE,
            statusMessage: 'Model not found. The MaaSModelRef does not exist.',
          },
        ],
      });

      expect(screen.getByText('ghost-model')).toBeInTheDocument();
      expect(
        screen.getByText('Model not found. The MaaSModelRef does not exist.'),
      ).toBeInTheDocument();
    });

    it('should show loading spinner for affected models when overview is not loaded', () => {
      renderPhaseModal({
        phase: PhaseStatus.DEGRADED,
        overviewLoaded: false,
      });

      expect(screen.getByLabelText('Loading affected models')).toBeInTheDocument();
      expect(screen.queryByTestId('affected-models-table')).not.toBeInTheDocument();
    });

    it('should show loading spinner for affected models when isLoadingAffected is true', () => {
      renderPhaseModal({
        phase: PhaseStatus.DEGRADED,
        isLoadingAffected: true,
      });

      expect(screen.getByLabelText('Loading affected models')).toBeInTheDocument();
      expect(screen.queryByTestId('affected-models-table')).not.toBeInTheDocument();
    });

    it('should show affected models load error when provided', () => {
      renderPhaseModal({
        phase: PhaseStatus.DEGRADED,
        affectedLoadError: 'Unable to fetch models. A Transient error occurred.',
      });

      expect(screen.getByTestId('affected-models-load-error')).toHaveTextContent(
        'Unable to fetch models. A Transient error occurred.',
      );
      expect(screen.queryByTestId('affected-models-table')).not.toBeInTheDocument();
    });

    it('should not show affected models table for degraded subscription when models are omitted', () => {
      renderPhaseModal({
        phase: PhaseStatus.DEGRADED,
      });

      expect(screen.queryByTestId('affected-models-table')).not.toBeInTheDocument();
    });

    it('should not show affected models table when the models list is empty', () => {
      renderPhaseModal({
        phase: PhaseStatus.DEGRADED,
        affectedModels: [],
      });

      expect(screen.queryByTestId('affected-models-table')).not.toBeInTheDocument();
    });

    it.each([PhaseStatus.FAILED, PhaseStatus.INVALID, PhaseStatus.PENDING, PhaseStatus.READY])(
      'should not show the affected models table when the phase is %s',
      (phase) => {
        renderPhaseModal({
          phase,
        });

        expect(screen.queryByTestId('affected-models-table')).not.toBeInTheDocument();
      },
    );
  });

  describe('view details link', () => {
    it('should not show the view details link when only resourceUrl is provided', () => {
      renderPhaseModal({
        phase: PhaseStatus.FAILED,
        resourceUrl: '/maas/maas-governance/subscriptions/view/test',
      });

      expect(screen.queryByTestId('phase-modal-view-details-link')).not.toBeInTheDocument();
    });

    it('should show the view details link when resourceUrl and returnTo are provided', () => {
      renderPhaseModal({
        phase: PhaseStatus.FAILED,
        resourceUrl: '/maas/maas-governance/subscriptions/view/test',
        returnTo: '/maas/maas-governance/overview',
      });

      expect(screen.getByTestId('phase-modal-view-details-link')).toBeInTheDocument();
    });

    it('should not show the view details link when resourceUrl is empty', () => {
      renderPhaseModal({
        phase: PhaseStatus.FAILED,
        resourceUrl: '',
        returnTo: '/maas/maas-governance/overview',
      });

      expect(screen.queryByTestId('phase-modal-view-details-link')).not.toBeInTheDocument();
    });
    it('should not show the view details link when returnTo is empty', () => {
      renderPhaseModal({
        phase: PhaseStatus.FAILED,
        returnTo: '',
        resourceUrl: '/maas/maas-governance/subscriptions/view/test',
      });

      expect(screen.queryByTestId('phase-modal-view-details-link')).not.toBeInTheDocument();
    });
  });
});
