import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import NotebookFeatureStoreList from '#~/pages/projects/screens/detail/notebooks/NotebookFeatureStoreList';

const FIVE_STORES = 'store-1,store-2,store-3,store-4,store-5';
const SIX_STORES = `${FIVE_STORES},store-6`;
const SEVEN_STORES = `${SIX_STORES},store-7`;
const THREE_PROJECTS = 'project-a,project-b,project-c';
const DUPLICATED_PROJECTS = 'project-a,project-b,project-a,project-c,project-b';
const WHITESPACE_PADDED = '  project-a , project-b , project-c  ';
const WHITESPACE_ONLY = '   ,  , ';

const renderFeatureStoreList = (annotation?: string) => {
  const notebook = mockNotebookK8sResource({
    ...(annotation !== undefined && {
      opts: {
        metadata: {
          annotations: { 'opendatahub.io/feast-config': annotation },
        },
      },
    }),
  });
  render(<NotebookFeatureStoreList notebook={notebook} />);
};

describe('NotebookFeatureStoreList', () => {
  it('should display the section title', () => {
    renderFeatureStoreList();
    expect(screen.getByTestId('notebook-feature-store-title')).toHaveTextContent(
      'Connected feature stores',
    );
  });

  it('should show "None" when annotation is absent', () => {
    renderFeatureStoreList();
    expect(screen.getByTestId('notebook-feature-store-none')).toHaveTextContent('None');
  });

  it('should show "None" when annotation is empty', () => {
    renderFeatureStoreList('');
    expect(screen.getByTestId('notebook-feature-store-none')).toHaveTextContent('None');
  });

  it('should show "None" when annotation contains only whitespace/commas', () => {
    renderFeatureStoreList(WHITESPACE_ONLY);
    expect(screen.getByTestId('notebook-feature-store-none')).toHaveTextContent('None');
  });

  it('should render a single feature store', () => {
    renderFeatureStoreList('single-project');

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('single-project')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-store-show-all')).not.toBeInTheDocument();
  });

  it('should render 3 feature store names without expand button', () => {
    renderFeatureStoreList(THREE_PROJECTS);

    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('project-a');
    expect(items[1]).toHaveTextContent('project-b');
    expect(items[2]).toHaveTextContent('project-c');
    expect(screen.queryByTestId('feature-store-show-all')).not.toBeInTheDocument();
  });

  it('should not show expand button for exactly 5 items', () => {
    renderFeatureStoreList(FIVE_STORES);

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryByTestId('feature-store-show-all')).not.toBeInTheDocument();
  });

  it('should show "1 more" for exactly 6 items', () => {
    renderFeatureStoreList(SIX_STORES);

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);

    const showAllContainer = screen.getByTestId('feature-store-show-all');
    expect(showAllContainer).toHaveTextContent('Show all');
    expect(showAllContainer).toHaveTextContent('1 more');
  });

  it('should expand and collapse for 7 items', async () => {
    const user = userEvent.setup();
    renderFeatureStoreList(SEVEN_STORES);

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);

    const showAllContainer = screen.getByTestId('feature-store-show-all');
    expect(showAllContainer).toHaveTextContent('Show all');
    expect(showAllContainer).toHaveTextContent('2 more');

    await user.click(within(showAllContainer).getByRole('button'));
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
    expect(showAllContainer).toHaveTextContent('Show less');

    await user.click(within(showAllContainer).getByRole('button'));
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(showAllContainer).toHaveTextContent('Show all');
  });

  it('should trim whitespace from comma-separated values', () => {
    renderFeatureStoreList(WHITESPACE_PADDED);

    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('project-a');
    expect(items[1]).toHaveTextContent('project-b');
    expect(items[2]).toHaveTextContent('project-c');
  });

  it('should deduplicate feature store names while preserving order', () => {
    renderFeatureStoreList(DUPLICATED_PROJECTS);

    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('project-a');
    expect(items[1]).toHaveTextContent('project-b');
    expect(items[2]).toHaveTextContent('project-c');
  });
});
