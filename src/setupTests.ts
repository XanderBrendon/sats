import matchers from '@testing-library/jest-dom/matchers';
import 'cross-fetch/polyfill';
// @icp-sdk/auth persists its session key in IndexedDB, which jsdom does not
// implement.
import 'fake-indexeddb/auto';
import { expect } from 'vitest';

expect.extend(matchers);
