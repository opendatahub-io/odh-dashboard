import React from 'react';
import { FormFieldset } from 'mod-arch-shared';
import { useThemeContext } from 'mod-arch-kubeflow';

interface ThemeAwareFieldsetProps {
  children: React.ReactNode;
  field?: string;
  className?: string;
}

const ThemeAwareFieldset: React.FC<ThemeAwareFieldsetProps> = ({ children, field, className }) => {
  const { isMUITheme } = useThemeContext();

  if (!isMUITheme) {
    return <>{children}</>;
  }

  return <FormFieldset component={children} field={field} className={className} />;
};

export default ThemeAwareFieldset;
