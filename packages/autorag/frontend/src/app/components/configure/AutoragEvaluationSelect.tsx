import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleAction,
  Split,
  SplitItem,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { FileIcon, TimesIcon } from '@patternfly/react-icons';
import React, { useRef, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import S3FileExplorer from '@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer';
import EvaluationFileCreator from '~/app/components/configure/EvaluationFileCreator';
import { useS3FileUploadMutation } from '~/app/hooks/mutations';
import { useRunTriggeredTracking } from '~/app/context/RunTriggeredTrackingContext';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { fireAutoragEvaluationSourceConfigured, TrackingOutcome } from '~/app/utilities/tracking';
import {
  AUTORAG_UPLOAD_MAX_BYTES,
  AUTORAG_UPLOAD_MAX_FILES,
} from '~/app/utilities/dropzoneFileUpload';
import {
  EVALUATION_FILE_NATIVE_ACCEPT,
  isAllowedEvaluationJsonFile,
} from '~/app/utilities/autoragEvaluationFile';

function AutoragEvaluationSelect(): React.JSX.Element {
  const { namespace } = useParams();
  const { onEvaluationSourceConfigured } = useRunTriggeredTracking();
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const s3SelectionCommittedRef = useRef(false);
  const form = useFormContext<ConfigureSchema>();
  const { formState } = form;
  const { field } = useController({ control: form.control, name: 'test_data_key' });
  const [testDataSecretName, displayName, inputDataKeys] = useWatch({
    control: form.control,
    name: ['test_data_secret_name', 'display_name', 'input_data_keys'],
  });
  const inputDataKey = inputDataKeys[0] ?? '';
  const { mutateAsync: uploadFileToS3 } = useS3FileUploadMutation('');
  const fileActionLabel = field.value ? 'Replace file' : 'Add file';

  const openExplorer = () => {
    setDropdownOpen(false);
    setFileExplorerOpen(true);
  };

  return (
    <div data-testid="evaluation-file-selector">
      <Split hasGutter>
        <SplitItem isFilled>
          <TextInputGroup isDisabled={formState.isSubmitting}>
            <TextInputGroupMain
              inputProps={{
                readOnly: true,
                readOnlyVariant: 'default',
                title: field.value || undefined,
              }}
              icon={<FileIcon />}
              placeholder="No file selected"
              value={field.value}
              data-testid="evaluation-file-input"
            />
            {!!field.value && (
              <TextInputGroupUtilities>
                <Button
                  aria-label="Clear file"
                  variant="plain"
                  icon={<TimesIcon />}
                  isDisabled={formState.isSubmitting}
                  onClick={() => field.onChange('')}
                />
              </TextInputGroupUtilities>
            )}
          </TextInputGroup>
        </SplitItem>
        <SplitItem>
          <Dropdown
            isOpen={dropdownOpen}
            onOpenChange={setDropdownOpen}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                variant="secondary"
                isExpanded={dropdownOpen}
                isDisabled={formState.isSubmitting || !testDataSecretName}
                splitButtonItems={[
                  <MenuToggleAction
                    key="add-evaluation-file"
                    className="pf-v6-u-text-nowrap"
                    aria-label={fileActionLabel}
                    onClick={openExplorer}
                  >
                    {fileActionLabel}
                  </MenuToggleAction>,
                ]}
                aria-label="More evaluation file actions"
                data-testid="evaluation-file-actions"
                onClick={() => setDropdownOpen((open) => !open)}
              />
            )}
          >
            <DropdownList>
              <DropdownItem
                onClick={() => {
                  setDropdownOpen(false);
                  setCreatorOpen(true);
                }}
              >
                Create new evaluation dataset
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </SplitItem>
      </Split>
      {creatorOpen && (
        <EvaluationFileCreator
          isOpen
          onClose={() => setCreatorOpen(false)}
          onCreated={(key) => {
            field.onChange(key);
            setCreatorOpen(false);
          }}
          namespace={namespace ?? ''}
          secretName={testDataSecretName}
          experimentName={displayName}
          inputDataKey={inputDataKey}
        />
      )}
      {fileExplorerOpen && (
        <S3FileExplorer
          apiPath="/autorag/api/v1/s3"
          namespace={namespace ?? ''}
          s3SecretName={testDataSecretName}
          isOpen
          onClose={() => {
            if (!s3SelectionCommittedRef.current) {
              fireAutoragEvaluationSourceConfigured({
                evaluationSourceType: 's3',
                countOfDocuments: 0,
                outcome: TrackingOutcome.cancel,
                success: false,
              });
            }
            s3SelectionCommittedRef.current = false;
            setFileExplorerOpen(false);
          }}
          onSelectFiles={(files) => {
            if (files.length > 0) {
              field.onChange(files[0].path.replace(/^\//, ''));
              s3SelectionCommittedRef.current = true;
              fireAutoragEvaluationSourceConfigured({
                evaluationSourceType: 's3',
                countOfDocuments: 1,
                outcome: TrackingOutcome.submit,
                success: true,
              });
              onEvaluationSourceConfigured('s3');
            }
          }}
          uploadFiles={async (files, folder) => {
            const prefix = folder.replace(/^\/+|\/+$/g, '');
            return Promise.all(
              files.map((file) =>
                uploadFileToS3({
                  namespace: namespace ?? '',
                  secretName: testDataSecretName,
                  bucket: '',
                  key: prefix ? `${prefix}/${file.name}` : file.name,
                  file,
                }).then((result) => ({ key: result.key })),
              ),
            );
          }}
          uploadConfig={{
            accept: EVALUATION_FILE_NATIVE_ACCEPT,
            maxFiles: AUTORAG_UPLOAD_MAX_FILES,
            maxSize: AUTORAG_UPLOAD_MAX_BYTES,
            multiple: false,
            validateFile: (file) =>
              isAllowedEvaluationJsonFile(file)
                ? undefined
                : 'Evaluation dataset must be a JSON file.',
          }}
          allowFolderSelection={false}
          selectableExtensions={['json']}
          unselectableReason="You can only select JSON files"
        />
      )}
    </div>
  );
}

export default AutoragEvaluationSelect;
