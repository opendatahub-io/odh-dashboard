import * as React from 'react';
import { mount } from 'enzyme';
import { EnabledApplicationsInner } from '../pages/enabledApplications/EnabledApplications';
import { mockEnabledApplications } from '../../__mocks__/mockEnabledApplications';

describe('EnabledApplications', () => {
  it('should display a message when there are no enabled applications', () => {
    const wrapper = mount(<EnabledApplicationsInner loaded={true} components={[]} />);
    expect(wrapper.find('[data-test-id="empty-empty-state"]').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
    wrapper.unmount();
  });

  it('should display a message when loading applications fails', () => {
    const wrapper = mount(
      <EnabledApplicationsInner
        loaded={true}
        loadError={new Error('faux error')}
        components={[]}
      />,
    );
    expect(wrapper.find('[data-test-id="error-empty-state"]').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
    wrapper.unmount();
  });

  it('should display enabled applications', () => {
    const wrapper = mount(
      <EnabledApplicationsInner loaded={true} components={mockEnabledApplications} />,
    );
    expect(wrapper.find('.odh-dashboard__page-content').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
    wrapper.unmount();
  });
});
