import { expect, test } from '@playwright/test';

test('demo covers discovery, invite, meets and profile', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('./');
  await expect(page.getByText('Открываем Feromeet')).toBeHidden();
  await expect(page.getByText(/Встречайтесь по-/)).toBeVisible();
  await page.getByText('Посмотреть demo').click();

  await expect(page).toHaveURL(/\/swipes$/);
  await expect(page.getByText('Найдите своего человека')).toBeVisible();
  await page.getByText('Пригласить на встречу').click();
  await expect(page.getByText(/Пригласить Лена/)).toBeVisible();
  await expect(page.getByText('Бюджет, BYN')).toBeVisible();
  await page.getByLabel('Закрыть').click();

  await page.getByText('Встречи', { exact: true }).click();
  await expect(page.getByText('От приглашения до впечатления')).toBeVisible();
  await expect(page.getByText(/Встреча с/).first()).toBeVisible();

  await page.getByText('Профиль', { exact: true }).click();
  await expect(page.getByText('Ваше пространство')).toBeVisible();
  await page.getByText('Редактировать').click();
  await expect(page.getByText('Расскажите о себе')).toBeVisible();

  expect(
    consoleErrors.filter(
      (message) =>
        !message.includes('Failed to fetch') &&
        !message.includes('Network request failed'),
    ),
  ).toEqual([]);
});
