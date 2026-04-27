const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadEnvFile } = require('./envLoader');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('loads key value pairs without overwriting existing environment values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nolaboda-env-'));
  const envPath = path.join(dir, '.env');
  const original = process.env.NOLABODA_TEST_VALUE;

  try {
    fs.writeFileSync(envPath, 'NOLABODA_TEST_VALUE=file-value\nNOLABODA_NEW_VALUE=new-value\n', 'utf8');
    process.env.NOLABODA_TEST_VALUE = 'existing-value';

    loadEnvFile(envPath);

    assert.equal(process.env.NOLABODA_TEST_VALUE, 'existing-value');
    assert.equal(process.env.NOLABODA_NEW_VALUE, 'new-value');
  } finally {
    if (original === undefined) {
      delete process.env.NOLABODA_TEST_VALUE;
    } else {
      process.env.NOLABODA_TEST_VALUE = original;
    }
    delete process.env.NOLABODA_NEW_VALUE;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
