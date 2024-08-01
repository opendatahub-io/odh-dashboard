import * as React from 'react';

import './FormGroupText.scss';

type Props = {
  component?: 'div' | 'pre';
  children?: React.ReactNode;
  id?: string;
};

const FormGroupText: React.FC<Props> = ({ component: Component = 'div', id, children }) => (
  <Component id={id} className="odh-form-group-text">
    {children}
  </Component>
);

export default FormGroupText;
