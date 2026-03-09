const fs = require('fs');
const os = require('os');
const path = require('path');

const OKRTracker = require('../../src/core/okr');

describe('OKRTracker', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moltbook-okr-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('getWeekStartDate parses ISO week key', () => {
    const tracker = new OKRTracker({ memoryDir: tmpDir });
    const start = tracker.getWeekStartDate('2026-W11');
    expect(start).toBeInstanceOf(Date);
    expect(Number.isNaN(start.getTime())).toBe(false);
  });

  test('status output does not produce Day NaN', () => {
    const tracker = new OKRTracker({
      memoryDir: tmpDir,
      karmaTarget: 120,
      followersTarget: 18,
      weeklyPostsTarget: 6,
      weeklyCommentsTarget: 126,
    });

    tracker.updateProgress({ karma: 112, followers: 14 });
    const status = tracker.getStatus({ karma: 112, followers: 14 });

    expect(status).toContain('This Week');
    expect(status).not.toContain('Day NaN');
  });
});
