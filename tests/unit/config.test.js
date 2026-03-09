const fs = require('fs');
const os = require('os');
const path = require('path');

const Config = require('../../src/utils/config');

describe('Config normalization', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moltbook-config-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('supports snake_case config keys via normalization', () => {
    const cfgPath = path.join(tmpDir, 'cfg.yaml');
    fs.writeFileSync(
      cfgPath,
      [
        'moltbook:',
        '  api_base: "https://www.moltbook.com/api/v1"',
        'okr:',
        '  karma_target: 120',
        '  followers_target: 18',
        '  weekly_posts_target: 6',
        '  weekly_comments_target: 126',
        '',
      ].join('\n')
    );

    const cfg = new Config(cfgPath);
    expect(cfg.get('moltbook.apiBase')).toBe('https://www.moltbook.com/api/v1');
    expect(cfg.get('okr.karmaTarget')).toBe(120);
    expect(cfg.get('okr.weeklyCommentsTarget')).toBe(126);
  });
});
