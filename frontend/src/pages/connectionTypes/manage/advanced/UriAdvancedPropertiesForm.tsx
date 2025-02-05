import * as React from 'react';
import { Button, FormGroup } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { UriField } from '~/concepts/connectionTypes/types';
import {
  URI_SCHEME_REGEX,
  isDuplicateExtension,
} from '~/concepts/connectionTypes/fields/fieldUtils';
import { AdvancedFieldProps } from '~/pages/connectionTypes/manage/advanced/types';
import ExpandableFormSection from '~/components/ExpandableFormSection';
import FieldRegexValidationRow from './FieldRegexValidationRow';

const UriAdvancedPropertiesForm: React.FC<AdvancedFieldProps<UriField>> = ({
  properties,
  onChange,
  onValidate,
}) => {
  const displayedSchemes = React.useMemo(
    () => [...(properties.schemes?.length ? properties.schemes : [''])],
    [properties.schemes],
  );
  const lastTextRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!properties.schemes?.length) {
      onValidate(true);
      return;
    }
    const valid = properties.schemes.every(
      (extension, i) =>
        !extension ||
        (URI_SCHEME_REGEX.test(extension) && !isDuplicateExtension(i, properties.schemes || [])),
    );
    onValidate(valid);
    // do not run when callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.schemes]);

  return (
    <ExpandableFormSection
      toggleText="Advanced settings"
      initExpanded={!!properties.schemes?.length}
      data-testid="advanced-settings-toggle"
    >
      <FormGroup label="Allow specific schemes" fieldId="scheme-types" isStack>
        {displayedSchemes.map((scheme, index) => (
          <FieldRegexValidationRow
            key={index}
            id="scheme-types"
            value={scheme}
            isDuplicate={isDuplicateExtension(index, displayedSchemes)}
            textRef={index === displayedSchemes.length - 1 ? lastTextRef : undefined}
            onChange={(val) => {
              if (!val && displayedSchemes.length === 1) {
                onChange({ ...properties, schemes: [] });
              } else {
                onChange({
                  ...properties,
                  schemes: [
                    ...displayedSchemes.slice(0, index),
                    val,
                    ...displayedSchemes.slice(index + 1),
                  ],
                });
              }
            }}
            onRemove={() => {
              const exts = [
                ...displayedSchemes.slice(0, index),
                ...displayedSchemes.slice(index + 1),
              ];
              onChange({
                ...properties,
                schemes: exts.length === 1 && exts[0].length === 0 ? [] : exts,
              });
            }}
            allowRemove={displayedSchemes.length > 1 || !!displayedSchemes[0]}
            ariaLabelItem="scheme"
            placeholder="Example https://"
            regexValidation={URI_SCHEME_REGEX}
            errorMessage={{
              invalid: 'Please enter a valid scheme.',
              duplicate: 'Scheme has already been specified.',
            }}
          />
        ))}
        <Button
          variant="link"
          data-testid="add-variable-button"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={() => {
            onChange({ ...properties, schemes: [...displayedSchemes, ''] });
            requestAnimationFrame(() => lastTextRef.current?.focus());
          }}
        >
          Add uri scheme type
        </Button>
      </FormGroup>
    </ExpandableFormSection>
  );
};

export default UriAdvancedPropertiesForm;
