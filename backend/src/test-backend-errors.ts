// Backend test file with intentional lint errors
const unused_var = 'backend lint error test';
console.log('missing semicolon');
var shouldBeConst = 'another error';
function missingReturnType() {
  return 'no return type specified';
}
