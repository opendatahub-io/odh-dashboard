// Add custom matchers here as needed
import { TextEncoder } from 'util';

// react-router-dom relies on the web-standard TextEncoder, which jsdom does not provide.
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
