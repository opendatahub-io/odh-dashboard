import * as React from 'react';

interface TypeaheadSelectOption {
  content: string | number;
  value: string | number;
  description?: string;
}

interface TypeaheadSelectProps {
  selectOptions: TypeaheadSelectOption[];
  selected?: string | number;
  onSelect?: (
    event: React.MouseEvent | React.KeyboardEvent | undefined,
    value: string | number,
  ) => void;
  placeholder?: string;
  dataTestId?: string;
  isDisabled?: boolean;
  toggleWidth?: string;
  toggleProps?: {
    status?: string;
  };
}

// Mock TypeaheadSelect component for testing
export const TypeaheadSelect: React.FC<TypeaheadSelectProps> = ({
  selectOptions,
  selected,
  onSelect,
  placeholder,
  dataTestId,
  isDisabled,
  toggleWidth,
  toggleProps,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = selectOptions.find((opt) => opt.value === selected);
  const displayText = selectedOption?.content || placeholder;

  const handleToggleClick = (): void => {
    if (isDisabled) {
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: TypeaheadSelectOption): void => {
    onSelect?.(undefined, option.value);
    setIsOpen(false);
  };

  const handleOptionKeyPress = (
    event: React.KeyboardEvent<HTMLLIElement>,
    option: TypeaheadSelectOption,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleOptionClick(option);
    }
  };

  // Test helper to trigger onSelect with arbitrary values
  const handleTestInvalidSelection = (): void => {
    if (onSelect) {
      const testInvalidValue = 'test-invalid-selection-value';
      onSelect(undefined, testInvalidValue);
    }
  };

  return (
    <div className="pf-v6-c-select" data-testid={dataTestId ? `${dataTestId}-wrapper` : undefined}>
      <button
        type="button"
        className={`pf-v6-c-menu-toggle ${toggleWidth === '100%' ? 'pf-m-full-width' : ''} ${
          toggleProps?.status === 'danger' ? 'pf-m-danger' : ''
        }`}
        data-testid={dataTestId}
        disabled={isDisabled}
        onClick={handleToggleClick}
        aria-label={placeholder}
        style={toggleWidth ? { width: toggleWidth } : undefined}
      >
        {displayText}
      </button>
      {/* Hidden button for testing invalid value selections */}
      <button
        type="button"
        data-testid={dataTestId ? `${dataTestId}-trigger-invalid` : undefined}
        onClick={handleTestInvalidSelection}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      {isOpen && !isDisabled && (
        <ul role="listbox">
          {selectOptions.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === selected}
              data-testid={dataTestId ? `${dataTestId}-option-${option.content}` : undefined}
              onClick={() => handleOptionClick(option)}
              onKeyPress={(e) => handleOptionKeyPress(e, option)}
              tabIndex={0}
            >
              {option.content}
              {option.description && <div>{option.description}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Re-export everything else that might be needed
// Note: We can't actually re-export from the real module in a mock
// so we'll just export a basic set of components
export const ApplicationsPage = (): null => null;
export const ProjectObjectType = {};
export const TitleWithIcon = (): null => null;
export const NotFound = (): null => null;
