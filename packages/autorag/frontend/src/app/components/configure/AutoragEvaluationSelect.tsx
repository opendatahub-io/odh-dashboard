import { FormGroup } from '@patternfly/react-core';
import React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useParams } from 'react-router';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import FileSelector from '../common/FileSelector';

// filter only (valid?) json
// will have to read files
// do a batch file get on all jsons
// either that or lazy validate only the selected file
// query to list files from bucket
// useController
// watches secret and bucket fields
// set helper text on FileUpload
// manage selected file
// setquerydata on upload for AutoragEvaluationSelect for its list files query
// update text FileUpload text to show "Uploaded!" or clear file name text or something
// disable upload and clear buttons
// show error documenting file size limit (seems like there is a hidden one set to around 40-50 MB)
// change uploadToStorageMutation to use FormData, and specify a path to upload, which will be hardcoded to root for now
// add FormGroup

// use FileUpload, change `clearButtonText` to `Browse from S3`, change `onClearClick` to open FileExplorer
// on upload, open FileExplorer, and allow user to select which folder to upload files to
// on successful upload, auto-select all the files that were uploaded (for MVP, it will only be 1 file/folder)

// alternative: switch TypeaheadSelect to Select and open the FileExplorer on click instead of a dropdown
function AutoragEvaluationSelect(): React.JSX.Element {
  const { namespace } = useParams();

  const notification = useNotification();

  // const { data: storageFiles, ...storageFilesQuery } = useStorageFilesQuery();
  const uploadToStorageMutation = useUploadToStorageMutation(namespace ?? '');

  const form = useFormContext<ConfigureSchema>();
  const controller = useController({ control: form.control, name: 'test_data_key' });
  const { field } = controller;

  return (
    <FormGroup
      fieldId={field.name}
      label="Add the data source you would like to use for evaluation"
      isRequired
    >
      <FileSelector
        id={field.name}
        // files={storageFiles}
        files={['watsonx_benchmark.json', 'watsonx_benchmark_2.json']}
        selected={field.value}
        onSelect={field.onChange}
        onUpload={async (file, setProgress, setStatus) => {
          try {
            await uploadToStorageMutation.mutateAsync({ file, onProgress: setProgress });
          } catch (error) {
            notification.error(
              'Failed to upload file',
              error instanceof Error ? error.message : String(error),
            );
            setStatus('danger');
            return;
          }

          field.onChange(file.name);
          setStatus('success');
        }}
        fileUploadHelperText="Supply a JSON file with test questions and answers to evaluate the quality of Q&A responses."
        typeaheadProps={{ isRequired: true, placeholder: 'Select file from bucket' }}
      />
    </FormGroup>
  );
}

export default AutoragEvaluationSelect;
