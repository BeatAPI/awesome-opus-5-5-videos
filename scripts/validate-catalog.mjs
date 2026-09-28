import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../cases/catalog.json', import.meta.url), 'utf8'));
const categories = new Set(['motion', 'explainer', '3d', 'interactive']);
const statuses = new Set(['source-listed', 'source-checked', 'reproduced']);
const ids = new Set();
const posts = new Set();

assert.ok(Array.isArray(catalog.cases) && catalog.cases.length > 0, 'catalog must contain cases');
assert.equal(catalog.cases.length, 282, 'the pinned upstream index contains 282 cases');
assert.equal(catalog.cases.filter((item) => item.featured).length, 20, 'keep 20 editorially featured cases');

for (const item of catalog.cases) {
  for (const key of ['id', 'title', 'summary', 'creator', 'originalPostUrl', 'sourcePromptUrl']) {
    assert.equal(typeof item[key], 'string', `${item.id ?? 'case'}: ${key} must be a string`);
    assert.ok(item[key].trim(), `${item.id ?? 'case'}: ${key} must not be empty`);
  }
  assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(categories.has(item.category), `${item.id}: unknown category`);
  assert.ok(statuses.has(item.evidenceStatus), `${item.id}: unknown evidence status`);
  assert.ok(Array.isArray(item.techTags) && item.techTags.length, `${item.id}: missing tech tags`);
  assert.match(item.originalPostUrl, /^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+$/);
  assert.match(item.sourcePromptUrl, /^https:\/\/github\.com\/yihui-dev\/awesome-opus5-5-videos\/blob\/[a-f0-9]{40}\/prompts\/[a-z0-9-]+\.md$/);
  assert.equal(item.promptRights, 'external-link-only');
  assert.equal(item.mediaRights, 'external-link-only');
  assert.equal(typeof item.featured, 'boolean', `${item.id}: featured must be a boolean`);
  assert.ok(!('prompt' in item) && !('video' in item) && !('posterUrl' in item), `${item.id}: third-party content must remain linked`);
  assert.equal('externalPreviewUrl' in item, 'externalWatchUrl' in item, `${item.id}: preview and watch links must be paired`);
  if (item.externalPreviewUrl) {
    assert.match(item.externalPreviewUrl, new RegExp(`^https://media\\.skillry\\.dev/opus-5-5/${item.id}/(?:preview|original\\.[a-f0-9]+)\\.webp$`));
    assert.equal(item.externalWatchUrl, `https://skillry.dev/ai-videos/opus-5-5/${item.id}`);
  }
  assert.ok(!ids.has(item.id), `${item.id}: duplicate id`);
  assert.ok(!posts.has(item.originalPostUrl), `${item.id}: duplicate original post`);
  ids.add(item.id);
  posts.add(item.originalPostUrl);
}

console.log(`Validated ${catalog.cases.length} source-linked cases`);
