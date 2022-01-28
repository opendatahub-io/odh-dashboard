import * as React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { mount } from 'enzyme';
import { store } from '../redux/store/store';
import { EnabledApplicationsInner } from '../pages/enabledApplications/EnabledApplications';
import { mockEnabledApplications } from '../../__mocks__/mockEnabledApplications';

describe('EnabledApplications', () => {
  it('should display a message when there are no enabled applications', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <EnabledApplicationsInner loaded={true} components={[]} />
        </Router>
      </Provider>,
    );
    expect(wrapper.find('[data-test-id="empty-empty-state"]').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
    wrapper.unmount();
  });

  it('should display a message when loading applications fails', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <EnabledApplicationsInner
            loaded={true}
            loadError={new Error('faux error')}
            components={[]}
          />
        </Router>
      </Provider>,
    );
    expect(wrapper.find('[data-test-id="error-empty-state"]').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
    wrapper.unmount();
  });

  it('should display enabled applications', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <EnabledApplicationsInner loaded={true} components={mockEnabledApplications} />
        </Router>
      </Provider>,
    );
    expect(wrapper.find('.odh-dashboard__page-content').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
    wrapper.unmount();
  });
});
