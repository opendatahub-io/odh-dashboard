import * as React from 'react';
import App from '../App';
import { shallow } from 'enzyme';

describe('Index test', () => {
  it('should render a basic component', () => {
    const component = shallow(<App />);
    expect(component.html()).toMatchSnapshot('basic');
  });
});
