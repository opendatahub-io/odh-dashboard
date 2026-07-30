/* eslint-disable camelcase */
import { Button, Stack, StackItem, Tooltip, Truncate } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { TimesIcon } from '@patternfly/react-icons';
import React, { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import S3FileExplorer from '@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer';
import type { ExplorerFile } from '@odh-dashboard/internal/concepts/fileExplorer/types';
import ConfigureFormGroup from '~/app/components/common/ConfigureFormGroup';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

type ConfigureTestDatasetProps = {
  namespace: string;
  s3SecretName: string;
  isDisabled: boolean;
};

function ConfigureTestDataset({
  namespace,
  s3SecretName,
  isDisabled,
}: ConfigureTestDatasetProps): React.JSX.Element {
  const form = useFormContext<ConfigureSchema>();
  const { control, setValue } = form;

  const [isTestFileExplorerOpen, setIsTestFileExplorerOpen] = useState(false);
  const [selectedTestDataFile, setSelectedTestDataFile] = useState<ExplorerFile | undefined>(() => {
    const initialKey = form.getValues('test_data_s3_key');
    if (!initialKey) {
      return undefined;
    }
    const lastSegment = initialKey.split('/').pop();
    const fileName = lastSegment || initialKey;
    const ext = fileName.includes('.') ? fileName.split('.').pop()! : '';
    return { name: fileName, path: `/${initialKey}`, type: ext };
  });

  const testDataFileKey = useWatch({ control, name: 'test_data_s3_key' });

  useEffect(() => {
    if (!testDataFileKey) {
      setSelectedTestDataFile(undefined);
    }
  }, [testDataFileKey]);

  return (
    <div data-testid="test-dataset-section">
      <ConfigureFormGroup
        label="Test dataset"
        description="Optionally select a separate test dataset from the same S3 bucket. When provided, model evaluation uses this data instead of an automatic train/test split."
      >
        <Stack hasGutter>
          <StackItem>
            <Button
              variant="secondary"
              data-testid="test-data-browse-bucket-button"
              onClick={() => setIsTestFileExplorerOpen(true)}
              isDisabled={isDisabled}
            >
              Browse bucket
            </Button>
          </StackItem>
          {selectedTestDataFile && (
            <StackItem>
              <Table aria-label="Selected test data file" variant="compact">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td dataLabel="Name">
                      <span title={selectedTestDataFile.path}>
                        <Truncate content={selectedTestDataFile.name} />
                      </span>
                    </Td>
                    <Td dataLabel="Type">{selectedTestDataFile.type}</Td>
                    <Td isActionCell>
                      <Tooltip content="Remove selection">
                        <Button
                          size="sm"
                          variant="plain"
                          aria-label="Remove test data selection"
                          icon={<TimesIcon />}
                          isDisabled={isDisabled}
                          data-testid="test-data-file-remove"
                          onClick={() => {
                            setSelectedTestDataFile(undefined);
                            setValue('test_data_s3_key', '', { shouldValidate: true });
                          }}
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </StackItem>
          )}
        </Stack>
      </ConfigureFormGroup>
      <S3FileExplorer
        id="test-data-s3-explorer"
        apiPath="/automl/api/v1/s3"
        namespace={namespace}
        s3SecretName={s3SecretName}
        isOpen={isTestFileExplorerOpen}
        onClose={() => setIsTestFileExplorerOpen(false)}
        onSelectFiles={(files) => {
          if (files.length > 0) {
            const file = files[0];
            const filePath = file.path.replace(/^\//, '');
            setValue('test_data_s3_key', filePath, { shouldValidate: true });
            setSelectedTestDataFile(file);
          }
        }}
        allowFolderSelection={false}
        selectableExtensions={['csv']}
        unselectableReason="You can only select CSV files"
        disabledPaths={[
          '/autogluon-tabular-training-pipeline',
          '/autogluon-timeseries-training-pipeline',
        ]}
      />
    </div>
  );
}

export default ConfigureTestDataset;
