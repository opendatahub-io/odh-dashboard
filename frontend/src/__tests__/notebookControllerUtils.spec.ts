import { usernameTranslate } from 'utilities/notebookControllerUtils';

const validUnameRegex = new RegExp('^[a-z]{1}[a-z0-9-]{1,62}$');

test('Uname translate - escaped chars by encodeURIComponent', () => {
  const uname = usernameTranslate('test: ;,/?:@&=+$');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe(`test-3a-20-3b-2c-2f-3f-3a-40-26-3d-2b-24`);
});

test('Uname translate - non-escaped chars by encodeURIComponent', () => {
  const uname = usernameTranslate("test: -_.!~*'()");
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe(`test-3a-20-2d-5f-2e-21-7f-2a-27-28-29`);
});

test('Uname translate - no spec chars', () => {
  const uname = usernameTranslate('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789');
});

test('Uname translate - realistic uname 1', () => {
  const uname = usernameTranslate('test.user@odh.io');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe(`test-2euser-40odh-2eio`);
});

test('Uname translate - realistic uname 2', () => {
  const uname = usernameTranslate('xlogintest');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe(`xlogintest`);
});

test('Uname translate - realistic uname 3', () => {
  const uname = usernameTranslate('kube:admin');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe(`kube-3aadmin`);
});

test('Uname translate - realistic uname 4', () => {
  const uname = usernameTranslate('random-user');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe(`random-2duser`);
});

test('Uname translate - realistic uname 5', () => {
  const uname = usernameTranslate('random_user');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe(`random-5fuser`);
});

test('Uname translate - hashtags', () => {
  const uname = usernameTranslate('test#user##@odh.io');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('test-23user-23-23-40odh-2eio');
});

test('Uname translate - parentheses', () => {
  const uname = usernameTranslate('test(us()er)test');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('test-28us-28-29er-29test');
});

test('Uname translate - exclamation mark', () => {
  const uname = usernameTranslate('Cr!t!cal@test.io');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('cr-21t-21cal-40test-2eio');
});

test('Uname translate - question mark', () => {
  const uname = usernameTranslate('test?user?@odh.io');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe(`test-3fuser-3f-40odh-2eio`);
});

test('Uname translate - commas', () => {
  const uname = usernameTranslate('test,user,odh,io');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('test-2cuser-2codh-2cio');
});

test('Uname translate - apostrophes', () => {
  const uname = usernameTranslate('te`"st\'user\'odh"io`');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('te-60-22st-27user-27odh-22io-60');
});

test('Uname translate - currency signs', () => {
  const uname = usernameTranslate('test¥u$€r');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('test-c2-a5u-24-e2-82-acr');
});

test('Uname translate - hyphen underscore tilde', () => {
  const uname = usernameTranslate('test-user_odh~io');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('test-2duser-5fodh-7fio');
});

test('Uname translate - percentage', () => {
  const uname = usernameTranslate('test%user%odh%io');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('test-25user-25odh-25io');
});

test('Uname translate - stars, colons and dots', () => {
  const uname = usernameTranslate('te:st.*us:er*odh.io');
  expect(uname).toMatch(validUnameRegex);
  expect(uname).toBe('te-3ast-2e-2aus-3aer-2aodh-2eio');
});
