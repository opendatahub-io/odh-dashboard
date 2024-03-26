import * as React from 'react';
import { DatePicker } from '@patternfly/react-core';

import './DashboardDatePicker.scss';

type Props = {
  /**
   * Allows for controlling the visibility of the error message helper text which can throw
   * off the vertical alignment of the DatePicker in tool bars.
   */
  hideError: boolean;
} & React.ComponentProps<typeof DatePicker>;

const DashboardDatePicker: React.FC<Props> = ({ hideError, ...props }) => (
  <DatePicker
    data-testid="data-picker"
    className={hideError ? 'odh-dashboard-date-picker--hide-error' : undefined}
    {...props}
  />
);

export default DashboardDatePicker;
