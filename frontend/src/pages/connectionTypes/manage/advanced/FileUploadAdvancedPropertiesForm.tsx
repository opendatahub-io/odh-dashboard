import * as React from 'react';
import { Button, FormGroup } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { FileField } from '#~/concepts/connectionTypes/types';
import {
  EXTENSION_REGEX,
  isDuplicateExtension,
} from '#~/concepts/connectionTypes/fields/fieldUtils';
import { AdvancedFieldProps } from '#~/pages/connectionTypes/manage/advanced/types';
import ExpandableFormSection from '#~/components/ExpandableFormSection';
import FileUploadExtensionRow from '#~/pages/connectionTypes/manage/advanced/FileUploadExtensionRow';

const FileUploadAdvancedPropertiesForm: React.FC<AdvancedFieldProps<FileField>> = ({
  properties,
  onChange,
  onValidate,
}) => {
  const displayedExtensions = React.useMemo(
    () => [...(properties.extensions?.length ? properties.extensions : [''])],
    [properties.extensions],
  );
  const lastTextRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!properties.extensions?.length) {
      onValidate(true);
      return;
    }
    const valid = properties.extensions.every(
      (extension, i) =>
        !extension ||
        (EXTENSION_REGEX.test(extension) && !isDuplicateExtension(i, properties.extensions || [])),
    );
    onValidate(valid);
    // do not run when callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.extensions]);

  return (
    <ExpandableFormSection
      toggleText="Advanced settings"
      initExpanded={!!properties.extensions?.length}
      data-testid="advanced-settings-toggle"
    >
      <FormGroup label="Allow specific files" fieldId="file-types" isStack>
        {displayedExtensions.map((extension, index) => (
          <FileUploadExtensionRow
            key={index}
            extension={extension}
            isDuplicate={isDuplicateExtension(index, displayedExtensions)}
            textRef={index === displayedExtensions.length - 1 ? lastTextRef : undefined}
            onChange={(val) => {
              if (!val && displayedExtensions.length === 1) {
                onChange({ ...properties, extensions: [] });
              } else {
                onChange({
                  ...properties,
                  extensions: [
                    ...displayedExtensions.slice(0, index),
                    val,
                    ...displayedExtensions.slice(index + 1),
                  ],
                });
              }
            }}
            onRemove={() => {
              const exts = [
                ...displayedExtensions.slice(0, index),
                ...displayedExtensions.slice(index + 1),
              ];
              onChange({
                ...properties,
                extensions: exts.length === 1 && exts[0].length === 0 ? [] : exts,
              });
            }}
            allowRemove={displayedExtensions.length > 1 || !!displayedExtensions[0]}
          />
        ))}
        <Button
          variant="link"
          data-testid="add-variable-button"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={() => {
            onChange({ ...properties, extensions: [...displayedExtensions, ''] });
            requestAnimationFrame(() => lastTextRef.current?.focus());
          }}
        >
          Add file type
        </Button>
      </FormGroup>
    </ExpandableFormSection>
  );
};

export default FileUploadAdvancedPropertiesForm;
