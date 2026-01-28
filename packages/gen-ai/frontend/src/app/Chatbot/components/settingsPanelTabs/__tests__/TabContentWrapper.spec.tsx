import * as React from 'react';
import { render, screen } from '@testing-library/react';
import useDarkMode from '~/app/Chatbot/hooks/useDarkMode';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

const mockUseDarkMode = jest.mocked(useDarkMode);

describe('TabContentWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDarkMode.mockReturnValue(false);
  });

  it('renders title correctly', () => {
    render(
      <TabContentWrapper title="Test Title">
        <div>Content</div>
      </TabContentWrapper>,
    );

    expect(screen.getByRole('heading', { name: 'Test Title' })).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <TabContentWrapper title="Title">
        <div data-testid="child-content">Child Content</div>
      </TabContentWrapper>,
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders header actions when provided', () => {
    render(
      <TabContentWrapper
        title="Title"
        headerActions={<button data-testid="action-button">Action</button>}
      >
        <div>Content</div>
      </TabContentWrapper>,
    );

    expect(screen.getByTestId('action-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('does not render header actions when not provided', () => {
    render(
      <TabContentWrapper title="Title">
        <div>Content</div>
      </TabContentWrapper>,
    );

    expect(screen.queryByTestId('action-button')).not.toBeInTheDocument();
  });

  it('applies titleTestId prop correctly', () => {
    render(
      <TabContentWrapper title="Title" titleTestId="custom-title-test-id">
        <div>Content</div>
      </TabContentWrapper>,
    );

    expect(screen.getByTestId('custom-title-test-id')).toBeInTheDocument();
    expect(screen.getByTestId('custom-title-test-id')).toHaveTextContent('Title');
  });

  it('applies light mode styling when useDarkMode returns false', () => {
    mockUseDarkMode.mockReturnValue(false);

    const { container } = render(
      <TabContentWrapper title="Title">
        <div>Content</div>
      </TabContentWrapper>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({
      backgroundColor: 'var(--pf-t--global--background--color--100)',
    });
  });

  it('applies dark mode styling when useDarkMode returns true', () => {
    mockUseDarkMode.mockReturnValue(true);

    const { container } = render(
      <TabContentWrapper title="Title">
        <div>Content</div>
      </TabContentWrapper>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({
      backgroundColor: 'var(--pf-v6-c-page__main-section--BackgroundColor)',
    });
  });

  it('renders with headerActionsPosition right by default', () => {
    render(
      <TabContentWrapper title="Title" headerActions={<button>Action</button>}>
        <div>Content</div>
      </TabContentWrapper>,
    );

    // When headerActionsPosition is 'right', space-between is applied
    // The header and action should both be present
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders with headerActionsPosition inline when specified', () => {
    render(
      <TabContentWrapper
        title="Title"
        headerActions={<button>Action</button>}
        headerActionsPosition="inline"
      >
        <div>Content</div>
      </TabContentWrapper>,
    );

    // When headerActionsPosition is 'inline', no space-between is applied
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
