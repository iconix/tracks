const { test, expect } = require('@playwright/test');

test('tracker smoke flow', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /tracks/i })).toBeVisible();
  await expect(page.locator('#tagSelect')).toContainText('Work/Project');
  await expect(page.locator('#habitList .habit-item')).toHaveCount(5);

  await page.getByRole('button', { name: 'Configure' }).click();
  await page.locator('#configTags').fill([
    'work/project | Deep Work | #1976D2 | work',
    'personal/habit | Personal Habit | #388E3C | personal',
    'break | Break | #607D8B | break'
  ].join('\n'));
  await page.locator('#configHabits').fill([
    'shower | Shower | Sh | shower | personal/habit | shower',
    'stretch | Stretch | St | stretch | personal/habit | stretch, mobility'
  ].join('\n'));
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('#tagSelect')).toContainText('Deep Work');
  await expect(page.locator('#habitList .habit-item')).toHaveCount(2);

  await page.locator('#activityInput').fill('Focus block');
  await page.locator('#tagSelect').selectOption('work/project');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await expect(page.locator('#currentActivity')).toBeVisible();

  await page.getByRole('button', { name: 'Stop Current Activity' }).click();
  await expect(page.locator('#currentActivity')).toBeHidden();
  await expect(page.locator('#list .activity-item')).toHaveCount(1);

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('#list .activity-item')).toHaveCount(0);

  await page.locator('#habit-stretch').click();
  await expect(page.locator('#currentName')).toHaveText('stretch');
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();
  await expect(page.locator('#list .activity-item')).toHaveCount(1);
});

test('midnight rollover clears completed activities and habits', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();

    const RealDate = Date;
    let currentTime = new RealDate('2026-03-15T23:59:50');

    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(currentTime.getTime());
        } else {
          super(...args);
        }
      }

      static now() {
        return currentTime.getTime();
      }
    }

    window.Date = MockDate;
    window.__setMockTime = (value) => {
      currentTime = new RealDate(value);
    };
    window.__advanceMockTime = (milliseconds) => {
      currentTime = new RealDate(currentTime.getTime() + milliseconds);
    };
  });

  await page.goto('/');

  await page.locator('#habit-shower').click();
  await expect(page.locator('#currentName')).toHaveText('shower');
  await expect(page.locator('#habit-shower')).toHaveClass(/checked/);

  await page.evaluate(() => {
    window.__advanceMockTime(15000);
  });

  await expect(page.locator('#list .activity-item')).toHaveCount(0);
  await expect(page.locator('#habit-shower')).not.toHaveClass(/checked/);
  await expect(page.locator('#currentActivity')).toBeVisible();

  await page.getByRole('button', { name: 'Stop Current Activity' }).click();
  await expect(page.locator('#list .activity-item')).toHaveCount(1);
});

test('raw export includes precise timestamps', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.goto('/');
  await page.locator('#activityInput').fill('Export check');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();
  await page.getByRole('button', { name: 'View Raw Data' }).click();

  const csvText = await page.locator('.csv-text').textContent();
  expect(csvText).toContain('activity,start_at,end_at,duration,tag,data_issue');
  expect(csvText).toMatch(/Export check,[0-9]{4}-[0-9]{2}-[0-9]{2}T/);
});

test('legacy ambiguous csv rows are flagged as data issues', async ({ page }) => {
  const csv = [
    'activity,date,start,end,duration,tag',
    'flight to dulles,2026-03-13,12:11:10,08:45:00,20:33:49,work/other'
  ].join('\n');

  await page.goto('/activity-tracker.html');
  await page.locator('#csvFile').setInputFiles({
    name: 'legacy-tracks.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv)
  });
  await page.getByRole('button', { name: 'Load Data' }).click();

  await expect(page.locator('#content')).toBeVisible();
  await expect(page.locator('#statsGrid')).toContainText('Data Issues');
  await expect(page.locator('#statsGrid')).toContainText('1');
  await expect(page.locator('.day-header .data-issue-badge')).toContainText('1 issues');
});
