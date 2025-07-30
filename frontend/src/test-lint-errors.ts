// Test file demonstrating the enhanced error messaging workflow - now fixed!
const usedVariable = 'this is now used correctly';
console.log(usedVariable);

const properStyleDeclaration = 'using const as recommended';
console.log(properStyleDeclaration);

const anotherUsedVar = 'now being used';
console.log(anotherUsedVar);

function withReturnType(): string {
  return 'typescript is happy with return types';
}

const properFormatting = 'clean spacing';
console.log(properFormatting);

// Use the function we defined
console.log(withReturnType());
