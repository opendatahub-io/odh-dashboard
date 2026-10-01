import { stripBasename } from '../stripBasename';

describe('stripBasename', () => {
  it.each([
    {
      basename: '/maas-consumer-portal',
      href: '/maas-consumer-portal/observe-and-monitor/dashboard?dashboard=models',
      expected: '/observe-and-monitor/dashboard?dashboard=models',
    },
    {
      basename: '/maas-consumer-portal',
      href: '/MAAS-Consumer-Portal/Dashboard?name=MyModel#PanelA',
      expected: '/Dashboard?name=MyModel#PanelA',
    },
    { basename: '/PORTAL', href: '/portal/Dashboard', expected: '/Dashboard' },
    { basename: '/portal', href: '/portal', expected: '/' },
    { basename: '/portal', href: '/PORTAL', expected: '/' },
    { basename: '/portal', href: '/portal/', expected: '/' },
    { basename: '/portal', href: '/PORTAL?name=MyModel', expected: '/?name=MyModel' },
    { basename: '/portal', href: '/PORTAL#PanelA', expected: '/#PanelA' },
    {
      basename: '/portal',
      href: '/portal?name=MyModel#PanelA',
      expected: '/?name=MyModel#PanelA',
    },
    { basename: '/portal/', href: '/portal/Dashboard', expected: '/Dashboard' },
    { basename: '/portal///', href: '/portal', expected: '/' },
    { basename: '/portal', href: '/PORTAL-extra/dashboard', expected: '/PORTAL-extra/dashboard' },
    { basename: '/portal', href: '/dashboard', expected: '/dashboard' },
    { basename: '', href: '/portal/Dashboard', expected: '/portal/Dashboard' },
    { basename: '/', href: '/portal/Dashboard', expected: '/portal/Dashboard' },
  ])('should map $href with basename "$basename" to $expected', ({ basename, href, expected }) => {
    expect(stripBasename(href, basename)).toBe(expected);
  });
});
