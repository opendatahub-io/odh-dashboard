import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { QuickStartContext } from '@patternfly/quickstarts';
import { OdhDocument, OdhDocumentType } from '#~/types';
import { CompletionStatusEnum } from '#~/utilities/quickStartUtils';
import DocCardBadges from '#~/components/DocCardBadges';

jest.mock('#~/utilities/quickStartUtils', () => ({
  ...jest.requireActual('#~/utilities/quickStartUtils'),
  getQuickStartCompletionStatus: jest.fn(),
}));

const mockGetQuickStartCompletionStatus = jest.mocked(
  jest.requireMock<typeof import('#~/utilities/quickStartUtils')>('#~/utilities/quickStartUtils')
    .getQuickStartCompletionStatus,
);

const createDoc = (
  type: OdhDocumentType = OdhDocumentType.Documentation,
  name = 'test-doc',
  durationMinutes?: number,
): OdhDocument =>
  ({
    metadata: { name },
    spec: {
      type,
      displayName: 'Test Doc',
      description: 'desc',
      durationMinutes,
    },
  } as unknown as OdhDocument);

const renderWithContext = (odhDoc: OdhDocument) => {
  const contextValue = {
    allQuickStarts: [{ metadata: { name: odhDoc.metadata.name }, spec: { tasks: [] }, status: {} }],
    activeQuickStartID: '',
    allQuickStartStates: {},
    setActiveQuickStart: jest.fn(),
    restartQuickStart: jest.fn(),
    setQuickStartTaskNumber: jest.fn(),
    setQuickStartTaskStatus: jest.fn(),
    setAllQuickStartStates: jest.fn(),
    getQuickStartForId: jest.fn(),
  };

  return render(
    <QuickStartContext.Provider value={contextValue as never}>
      <DocCardBadges odhDoc={odhDoc} />
    </QuickStartContext.Provider>,
  );
};

describe('DocCardBadges', () => {
  beforeEach(() => {
    mockGetQuickStartCompletionStatus.mockReturnValue(undefined);
  });

  it('should render documentation type label', () => {
    renderWithContext(createDoc(OdhDocumentType.Documentation));
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('should render duration label when duration is provided', () => {
    renderWithContext(createDoc(OdhDocumentType.Documentation, 'doc', 15));
    expect(screen.getByText('15 minutes')).toBeInTheDocument();
  });

  it('should render "In Progress" label with info status for in-progress quickstart', () => {
    mockGetQuickStartCompletionStatus.mockReturnValue(CompletionStatusEnum.InProgress);
    renderWithContext(createDoc(OdhDocumentType.QuickStart, 'qs-in-progress'));
    const inProgressLabel = screen.getByText('In Progress').closest('.pf-v6-c-label');
    expect(inProgressLabel).toHaveClass('pf-m-info');
    expect(inProgressLabel).toHaveClass('pf-m-outline');
  });

  it('should render "Complete" label with success status for completed quickstart', () => {
    mockGetQuickStartCompletionStatus.mockReturnValue(CompletionStatusEnum.Success);
    renderWithContext(createDoc(OdhDocumentType.QuickStart, 'qs-complete'));
    const completeLabel = screen.getByText('Complete').closest('.pf-v6-c-label');
    expect(completeLabel).toHaveClass('pf-m-success');
    expect(completeLabel).toHaveClass('pf-m-outline');
  });

  it('should render "Failed" label with danger status for failed quickstart', () => {
    mockGetQuickStartCompletionStatus.mockReturnValue(CompletionStatusEnum.Failed);
    renderWithContext(createDoc(OdhDocumentType.QuickStart, 'qs-failed'));
    const failedLabel = screen.getByText('Failed').closest('.pf-v6-c-label');
    expect(failedLabel).toHaveClass('pf-m-danger');
    expect(failedLabel).toHaveClass('pf-m-outline');
  });
});
