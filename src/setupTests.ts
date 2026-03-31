// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import crypto from "crypto";
import { TextEncoder, TextDecoder } from 'util';

// Globally mock setup.ts to prevent its top-level initSetup() side effect
// (which requires sessionStorage) from firing when Jest force-loads source
// files for coverage instrumentation.
jest.mock('./lib/setup');

Object.defineProperty(global.self, "crypto", {
  value: crypto.webcrypto,
});

Object.assign(global, { TextDecoder, TextEncoder });
