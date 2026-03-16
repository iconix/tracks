const { test, expect } = require('@playwright/test');

async function installMockClock(page, startIso) {
  await page.addInitScript((initialTime) => {
    localStorage.clear();

    const RealDate = Date;
    let currentTime = new RealDate(initialTime);

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
  }, startIso);
}

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
    'work/project | #1976D2',
    'personal/habit | #388E3C',
    'break | #607D8B'
  ].join('\n'));
  await page.locator('#configHabits').fill([
    'shower | Sh | personal/habit | shower',
    'stretch | St | personal/habit | stretch, mobility'
  ].join('\n'));
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('#tagSelect')).toContainText('Work/Project');
  await expect(page.locator('#habitList .habit-item')).toHaveCount(2);

  await page.locator('#activityInput').fill('Focus block');
  await page.locator('#tagSelect').selectOption('work/project');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await expect(page.locator('#currentActivity')).toBeVisible();

  await page.getByRole('button', { name: 'Stop Current Activity' }).click();
  await expect(page.locator('#currentActivity')).toBeHidden();
  await expect(page.locator('#list .activity-item')).toHaveCount(1);

  await page.locator('.delete-activity-button').click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('#list .activity-item')).toHaveCount(0);

  await page.locator('#habit-stretch').click();
  await expect(page.locator('#currentName')).toHaveText('stretch');
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();
  await expect(page.locator('#list .activity-item')).toHaveCount(1);
});

test('pressing Enter in the activity input starts the activity', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.goto('/');

  await page.locator('#activityInput').fill('Keyboard start');
  await page.locator('#tagSelect').selectOption('work/project');
  await page.locator('#activityInput').press('Enter');

  await expect(page.locator('#currentActivity')).toBeVisible();
  await expect(page.locator('#currentName')).toHaveText('Keyboard start');
  await expect(page.locator('#currentTag')).toContainText('Work/Project');
});

test('completed activity action buttons stay icon-sized and aligned', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.goto('/');

  await page.locator('#activityInput').fill('UI check');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();

  const metrics = await page.evaluate(() => {
    const copy = document.querySelector('.copy-button');
    const del = document.querySelector('.delete-activity-button');
    const copyRect = copy.getBoundingClientRect();
    const delRect = del.getBoundingClientRect();
    const copyStyle = window.getComputedStyle(copy);
    const delStyle = window.getComputedStyle(del);

    return {
      copyText: copy.textContent,
      deleteText: del.textContent,
      copyWidth: Math.round(copyRect.width),
      copyHeight: Math.round(copyRect.height),
      deleteWidth: Math.round(delRect.width),
      deleteHeight: Math.round(delRect.height),
      topOffsetDiff: Math.round(Math.abs(copyRect.top - delRect.top)),
      horizontalGap: Math.round(copyRect.left - delRect.right),
      copyFontSize: copyStyle.fontSize,
      deleteFontSize: delStyle.fontSize,
      copyDisplay: copyStyle.display,
      deleteDisplay: delStyle.display
    };
  });

  expect(metrics.copyText).toBe('📋');
  expect(metrics.deleteText).toBe('🗑️');
  expect(metrics.copyWidth).toBe(32);
  expect(metrics.copyHeight).toBe(32);
  expect(metrics.deleteWidth).toBe(32);
  expect(metrics.deleteHeight).toBe(32);
  expect(metrics.topOffsetDiff).toBeLessThanOrEqual(1);
  expect(metrics.horizontalGap).toBeGreaterThanOrEqual(3);
  expect(metrics.copyFontSize).toBe('18px');
  expect(metrics.deleteFontSize).toBe('18px');
  expect(metrics.copyDisplay).toBe('flex');
  expect(metrics.deleteDisplay).toBe('flex');
});

test('midnight rollover clears completed activities and habits', async ({ page }) => {
  await installMockClock(page, '2026-03-15T23:59:50');

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

test('editing a completed activity updates persisted order and durations', async ({ page }) => {
  await installMockClock(page, '2026-03-16T09:00:00');

  await page.goto('/');

  await page.locator('#activityInput').fill('Alpha');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await page.evaluate(() => window.__advanceMockTime(30 * 60 * 1000));
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();

  await page.locator('#activityInput').fill('Beta');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await page.evaluate(() => window.__advanceMockTime(30 * 60 * 1000));
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();

  await page.locator('#act-0').click();
  await page.locator('#edit-name-0').fill('Alpha edited');
  await page.locator('#edit-start-0').fill('08:45');
  await page.getByRole('button', { name: 'Save' }).click();

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('activities')).map(activity => ({
      name: activity.name,
      startLocal: new Date(activity.start).toTimeString().slice(0, 5),
      endLocal: new Date(activity.end).toTimeString().slice(0, 5),
      duration: activity.duration
    }))
  );
  expect(stored).toHaveLength(2);
  expect(stored[0].name).toBe('Alpha edited');
  expect(stored[0].startLocal).toBe('08:45');
  expect(stored[0].endLocal).toBe('09:30');
  expect(stored[0].duration).toBe(45 * 60);
  expect(stored[1].name).toBe('Beta');
  expect(stored[1].duration).toBe(30 * 60);

  await expect(page.locator('#count')).toHaveText('2');
});

test('editing the current activity adjusts the previous completed entry', async ({ page }) => {
  await installMockClock(page, '2026-03-16T10:00:00');

  await page.goto('/');

  await page.locator('#activityInput').fill('Prep');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await page.evaluate(() => window.__advanceMockTime(30 * 60 * 1000));
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();

  await page.locator('#activityInput').fill('Live work');
  await page.getByRole('button', { name: 'Start Activity' }).click();

  await page.locator('#currentActivity').click();
  await page.locator('#edit-current-name').fill('Live work edited');
  await page.locator('#edit-current-start').fill('10:20');
  await page.getByRole('button', { name: 'Save' }).click();

  const snapshot = await page.evaluate(() => {
    const current = JSON.parse(localStorage.getItem('currentActivity'));
    const activities = JSON.parse(localStorage.getItem('activities'));
    return {
      current: {
        name: current.name,
        startLocal: new Date(current.start).toTimeString().slice(0, 5)
      },
      activities: activities.map(activity => ({
        endLocal: new Date(activity.end).toTimeString().slice(0, 5),
        duration: activity.duration
      }))
    };
  });

  expect(snapshot.current.name).toBe('Live work edited');
  expect(snapshot.current.startLocal).toBe('10:20');
  expect(snapshot.activities).toHaveLength(1);
  expect(snapshot.activities[0].endLocal).toBe('10:20');
  expect(snapshot.activities[0].duration).toBe(20 * 60);
});

test('insights flag overlapping activities as data issues', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('dailyStateDate', '2026-03-16');
    localStorage.setItem('activities', JSON.stringify([
      {
        name: 'Alpha',
        start: '2026-03-16T09:00:00',
        end: '2026-03-16T09:30:00',
        duration: 30 * 60,
        tag: 'work/project'
      },
      {
        name: 'Beta',
        start: '2026-03-16T09:20:00',
        end: '2026-03-16T10:00:00',
        duration: 40 * 60,
        tag: 'work/project'
      }
    ]));
  });

  await page.goto('/');

  await page.getByRole('button', { name: 'Insights' }).click();
  await expect(page.locator('#insightTimeline')).toContainText('Alpha');
  await expect(page.locator('#insightTimeline')).toContainText('Beta');
  await expect(page.locator('#insightTimeline .activity-row.data-issue')).toHaveCount(2);
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

test('midnight reset clears today view but keeps completed history available for export', async ({ page }) => {
  await installMockClock(page, '2026-03-15T23:40:00');

  await page.goto('/');

  await page.locator('#activityInput').fill('Before midnight');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await page.evaluate(() => window.__advanceMockTime(10 * 60 * 1000));
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();
  await expect(page.locator('#list .activity-item')).toHaveCount(1);

  await page.locator('#activityInput').fill('Carry over');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await page.evaluate(() => window.__advanceMockTime(15 * 60 * 1000));

  await expect(page.locator('#list .activity-item')).toHaveCount(0);
  await expect(page.locator('#currentActivity')).toBeVisible();

  await page.getByRole('button', { name: 'View Raw Data' }).click();
  const csvText = await page.locator('.csv-text').textContent();
  expect(csvText).toContain('Before midnight');
  expect(csvText).toContain('Carry over (current)');
});

test('clear all data resets stored configuration and tracker state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.goto('/');

  await page.getByRole('button', { name: 'Configure' }).click();
  await page.locator('#configTags').fill([
    'focus | #123456',
    'rest | #654321'
  ].join('\n'));
  await page.locator('#configHabits').fill([
    'make tea | Te | rest | tea'
  ].join('\n'));
  await page.getByRole('button', { name: 'Save' }).click();

  await page.locator('#activityInput').fill('Temporary');
  await page.getByRole('button', { name: 'Start Activity' }).click();
  await page.getByRole('button', { name: 'Stop Current Activity' }).click();
  await expect(page.locator('#list .activity-item')).toHaveCount(1);

  await page.getByRole('button', { name: 'Clear All Data' }).click();
  await page.getByRole('button', { name: 'Clear All Data' }).last().click();

  await expect(page.locator('#list .activity-item')).toHaveCount(0);
  await expect(page.locator('#currentActivity')).toBeHidden();
  await expect(page.locator('#tagSelect')).toContainText('Work/Project');
  await expect(page.locator('#habitList .habit-item')).toHaveCount(5);

  const storageState = await page.evaluate(() => ({
    current: localStorage.getItem('currentActivity'),
    activities: localStorage.getItem('activities'),
    habits: localStorage.getItem('habits'),
    tagDefinitions: localStorage.getItem('tagDefinitions'),
    habitDefinitions: localStorage.getItem('habitDefinitions')
  }));

  expect(storageState.current).toBeNull();
  expect(storageState.activities).toBeNull();
  expect(storageState.habits).toBeNull();
  expect(storageState.tagDefinitions).toBeNull();
  expect(storageState.habitDefinitions).toBeNull();
});
