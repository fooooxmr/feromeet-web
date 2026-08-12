import { expect, test } from '@playwright/test';

test('login screen has no demo entry', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem('feromeet.demo');
      localStorage.removeItem('feromeet.session');
    } catch {
      /* ignore */
    }
  });
  await page.goto('./');
  await expect(page.getByText('Вход по SMS')).toBeVisible();
  await expect(page.getByText('+375')).toBeVisible();
  await expect(page.getByPlaceholder('29 000 00 00')).toBeVisible();
  await expect(page.getByText('Посмотреть demo')).toHaveCount(0);
});

test('demo covers discovery, invite, meets and profile', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('feromeet.demo', '1');
      localStorage.removeItem('feromeet.session');
    } catch {
      /* ignore */
    }
  });
  await page.goto('./');

  await expect(page).toHaveURL(/\/swipes\/?$/);
  await expect(page.getByLabel('Пригласить').first()).toBeVisible();
  await page.getByLabel('Фильтры').first().click({ force: true });
  await expect(page.getByText('Кого показать')).toBeVisible();
  await expect(page.getByLabel('Возраст от')).toBeVisible();
  await page.getByLabel('Закрыть').first().click({ force: true });
  await page.getByLabel('Пригласить').first().click({ force: true });
  await expect(page.getByText('Я угощаю')).toBeVisible();
  await expect(page.getByText('Бюджет, BYN')).toHaveCount(0);
  await page.getByLabel('Закрыть').first().click({ force: true });

  await page.getByRole('link', { name: 'Встречи' }).click({ force: true });
  await expect(page.getByText('Лена').first()).toBeVisible();

  await page.getByRole('link', { name: 'Профиль' }).click({ force: true });
  await expect(page.getByText('Редактировать')).toBeVisible();
  await page.getByText('Редактировать').click({ force: true });
  await expect(page.getByText('О себе')).toBeVisible();

  expect(
    consoleErrors.filter(
      (message) =>
        !message.includes('Failed to fetch') &&
        !message.includes('Network request failed'),
    ),
  ).toEqual([]);
});
