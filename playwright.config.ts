import { defineConfig, devices } from '@playwright/test';

// BASE_URL drives browser (e2e) navigation; API_BASE_URL is separate so the
// API project's baseURL can be pointed elsewhere independently if ever needed.
const BASE_URL = process.env.BASE_URL ?? 'https://automationexercise.com';
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://automationexercise.com';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off', // not justified at this stage; revisit if flaky failures need replay
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: API_BASE_URL,
      },
    },
    {
      name: 'chromium',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URL },
    },
    {
      name: 'firefox',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Firefox'], baseURL: BASE_URL },
    },
    {
      name: 'webkit',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Safari'], baseURL: BASE_URL },
    },
  ],
});
