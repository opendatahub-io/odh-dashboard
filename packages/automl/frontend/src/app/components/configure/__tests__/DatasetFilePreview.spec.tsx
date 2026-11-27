/* eslint-disable camelcase -- API column names */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileExplorer from '@odh-dashboard/internal/concepts/fileExplorer/FileExplorer/FileExplorer';
import {
  mockFile,
  mockSource,
} from '@odh-dashboard/internal/concepts/fileExplorer/__mocks__/mockFileExplorer';
import { useS3GetFileSchemaQuery, type DatasetSample } from '~/app/hooks/useS3GetFileSchemaQuery';
import DatasetCompatibilityCheck from '~/app/components/configure/DatasetCompatibilityCheck';
import DatasetFileDetailsPreview from '~/app/components/configure/DatasetFileDetailsPreview';
import DatasetFilePreview from '~/app/components/configure/DatasetFilePreview';

jest.mock('~/app/hooks/useS3GetFileSchemaQuery');

const sample: DatasetSample = {
  columns: [{ name: 'value', type: 'string', task_type: 'multiclass' }],
  sampleRows: Array.from({ length: 25 }, (_, index) => [`row-${index + 1}`]),
  sampleSize: 25,
  parseWarnings: 0,
};

function PreviewStack({
  parent,
  revision,
}: {
  parent: 'explorer' | 'comparison';
  revision: number;
}) {
  const [preview, setPreview] = React.useState<{ fileKey: string; trigger: HTMLElement }>();
  const openPreview = (fileKey: string, event: React.MouseEvent<HTMLButtonElement>) =>
    setPreview({ fileKey, trigger: event.currentTarget });
  return (
    <>
      <button>Outside the dialogs</button>
      {parent === 'explorer' ? (
        <FileExplorer
          isOpen
          presentation="tearsheet"
          isCovered={Boolean(preview)}
          files={[mockFile({ name: 'data.csv', path: '/data.csv', type: 'csv' })]}
          source={mockSource()}
          modalDescription={`Explorer update ${revision}`}
          onClose={jest.fn()}
          onPrimary={jest.fn()}
          renderFilePreview={() => (
            <DatasetFileDetailsPreview
              namespace="ns"
              secretName="s3"
              fileKey="data.csv"
              onViewFile={(event) => openPreview('data.csv', event)}
            />
          )}
        />
      ) : (
        <DatasetCompatibilityCheck
          training={
            revision === 3
              ? { ...sample, columns: [], sampleRows: [], sampleSize: 0 }
              : { ...sample, parseWarnings: revision }
          }
          test={sample}
          trainingFile="data.csv"
          testFile="test.csv"
          isChecking={false}
          hasError={revision === 2}
          isCovered={Boolean(preview)}
          onViewFile={openPreview}
        />
      )}
      {preview && (
        <DatasetFilePreview
          namespace="ns"
          secretName="s3"
          {...preview}
          onClose={() => setPreview(undefined)}
        />
      )}
    </>
  );
}

describe('DatasetFilePreview accessibility in a stack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({
      sample,
      isFetching: false,
    } as ReturnType<typeof useS3GetFileSchemaQuery>);
  });

  it.each(['explorer', 'comparison'] as const)(
    'should keep the preview accessible after the covered %s updates and restore its state',
    async (parent) => {
      const user = userEvent.setup();
      const { rerender } = render(<PreviewStack parent={parent} revision={0} />);
      if (parent === 'explorer') {
        const row = screen.getByTestId('file-explorer-row--data-csv');
        await user.click(within(row).getByRole('radio'));
      } else {
        await user.click(screen.getByTestId('dataset-compatibility-view-details'));
        await user.click(screen.getByRole('tab', { name: 'Data preview' }));
        await user.click(screen.getAllByLabelText('Go to next page')[0]);
      }
      const trigger = screen.getAllByRole('button', { name: 'View file' })[0];
      await user.click(trigger);
      const preview = screen.getByRole('dialog', { name: 'Preview data.csv' });
      await user.click(within(preview).getByRole('button', { name: 'Go to next page' }));
      rerender(<PreviewStack parent={parent} revision={1} />);
      expect(screen.getByRole('dialog', { name: 'Preview data.csv' })).toBe(preview);
      rerender(<PreviewStack parent={parent} revision={2} />);
      expect(screen.getByRole('dialog', { name: 'Preview data.csv' })).toBe(preview);
      rerender(<PreviewStack parent={parent} revision={3} />);
      expect(screen.getByRole('dialog', { name: 'Preview data.csv' })).toBe(preview);
      expect(within(preview).getByText('row-21')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Outside the dialogs' })).not.toBeInTheDocument();
      // A real key event bubbles through the child portal to its covered parent.
      const escape = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      const onBubbledKeyDown = jest.fn();
      document.body.addEventListener('keydown', onBubbledKeyDown);
      try {
        fireEvent(preview, escape);
        expect(onBubbledKeyDown).not.toHaveBeenCalled();
      } finally {
        document.body.removeEventListener('keydown', onBubbledKeyDown);
      }
      expect(screen.queryByRole('dialog', { name: 'Preview data.csv' })).not.toBeInTheDocument();
      await waitFor(() => expect(trigger).toHaveFocus());
      if (parent === 'explorer') {
        expect(screen.getByRole('dialog', { name: 'Select file or folder' })).toBeInTheDocument();
        expect(
          within(screen.getByTestId('file-explorer-row--data-csv')).getByRole('radio'),
        ).toBeChecked();
      } else {
        expect(screen.getByRole('dialog', { name: 'Compatibility check' })).toBeInTheDocument();
        expect(screen.getByText('Compatibility check could not be refreshed')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Data preview' })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        expect(
          within(screen.getByRole('grid', { name: 'Training data preview' })).getByText('row-11'),
        ).toBeInTheDocument();
      }
      expect(screen.queryByRole('button', { name: 'Outside the dialogs' })).not.toBeInTheDocument();
    },
  );
});
