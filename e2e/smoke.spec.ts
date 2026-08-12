import { expect, test } from '@playwright/test';

test('demo covers discovery, invite, meets and profile', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('./');
  await expect(page.getByText('Открываем Feromeet')).toBeHidden();
  await expect(page.getByText('Вход по SMS')).toBeVisible();
  await page.getByText('Посмотреть demo').click();

  await expect(page).toHaveURL(/\/swipes$/);
  await expect(page.getByLabel('Пригласить')).toBeVisible();
  await page.getByLabel('Пригласить').click();
  await expect(page.getByText(/Пригласить Лена/)).toBeVisible();
  await expect(page.getByText('Я угощаю')).toBeVisible();
  await expect(page.getByText('Бюджет, BYN')).toHaveCount(0);
  await page.getByLabel('Закрыть').click();

  await page.getByText('Встречи', { exact: true }).click();
  await expect(page.getByText(/Встреча с/).first()).toBeVisible();

  await page.getByText('Профиль', { exact: true }).click();
  await expect(page.getByText('Редактировать')).toBeVisible();
  await page.getByText('Редактировать').click();
  await expect(page.getByText('О себе')).toBeVisible();

  expect(
    consoleErrors.filter(
      (message) =>
        !message.includes('Failed to fetch') &&
        !message.includes('Network request failed'),
    ),
  ).toEqual([]);
});
