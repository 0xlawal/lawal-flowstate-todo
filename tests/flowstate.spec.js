const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // External font requests should not block app tests from starting.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Playwright gives each test an isolated browser context and fresh storage.
});

test('loads the workspace and seeded tasks', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('Good evening, Lawal');
  await expect(page.locator('.task')).toHaveCount(3);
  await expect(page.locator('#allCount')).toHaveText('4');
});

test('creates a task and persists it after reload', async ({ page }) => {
  await page.getByRole('button', { name: /New task/ }).click();
  await page.locator('#title').fill('Playwright test task');
  await page.locator('#notes').fill('Created by browser automation');
  await page.locator('#list').selectOption('Work');
  await page.locator('#priority').selectOption('high');
  await page.getByRole('button', { name: /Add task/ }).click();
  await expect(page.locator('.task-title', { hasText: 'Playwright test task' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'All tasks' }).click();
  await expect(page.locator('.task-title', { hasText: 'Playwright test task' })).toBeVisible();
});

test('edits, completes, and deletes a task', async ({ page }) => {
  const task = page.locator('.task').filter({ hasText: 'Review lecture notes' });
  await task.getByRole('button', { name: 'Edit task' }).click();
  await page.locator('#title').fill('Updated lecture notes');
  await page.getByRole('button', { name: /Save changes/ }).click();
  const updated = page.locator('.task').filter({ hasText: 'Updated lecture notes' });
  await expect(updated).toBeVisible();
  await updated.getByRole('button', { name: 'Complete task' }).click();
  await expect.poll(async () => page.locator('#done').textContent()).toBe('2');
  await updated.getByRole('button', { name: 'Delete task' }).click();
  await expect(updated).toHaveCount(0);
});

test('searches tasks and filters by list', async ({ page }) => {
  await page.locator('#searchBtn').click();
  await page.locator('#query').fill('lecture');
  await expect(page.locator('.task')).toHaveCount(1);
  await page.locator('#closeSearch').click();
  await page.locator('[data-list="Ideas"]').click();
  await expect(page.locator('.task-title')).toContainText(['Capture ideas for the weekend']);
});

test('toggles and remembers the theme', async ({ page }) => {
  await page.locator('#themeBtn').click();
  await expect(page.locator('body')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/dark/);
});

