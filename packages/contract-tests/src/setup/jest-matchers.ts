// Jest matchers setup file
/// <reference types="jest" />
import { toMatchContract } from '../matchers/toMatchContract';

console.log('🔧 Setting up Jest matchers...');
expect.extend({ toMatchContract });
console.log('✅ Jest matchers setup complete');
