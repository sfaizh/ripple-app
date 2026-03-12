import { test as base, expect } from '@playwright/test';

interface TestFixtures {
  testEmail: string;
  testPassword: string;
}

/**
 * Extended test fixture with helper utilities
 */
export const test = base.extend<TestFixtures>({
  /**
   * Generate a unique email for test isolation
   */
  testEmail: async ({}, use) => {
    const email = `test.${Date.now()}.${Math.random().toString(36).slice(2)}@ripple-test.local`;
    await use(email);
  },

  /**
   * Generate a strong test password
   */
  testPassword: async ({}, use) => {
    await use('TestPassword123!');
  },
});

export { expect };
