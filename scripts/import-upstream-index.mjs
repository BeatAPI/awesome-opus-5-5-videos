import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

// Import source metadata only. Creator prompts and media remain at their original URLs.
const catalogPath = new URL('../cases/catalog.json', import.meta.url);
const current = JSON.parse(readFileSync(catalogPath, 'utf8'));
const revision = current.sourceRevision;
const sourceUrl = `https://raw.githubusercontent.com/yihui-dev/awesome-opus5-5-videos/${revision}/data/videos.json`;
const response = await fetch(sourceUrl);
if (!response.ok) throw new Error(`Unable to read pinned upstream index: HTTP ${response.status}`);
const source = await response.json();
assert.ok(Array.isArray(source), 'upstream index must be an array');

const featured = current.cases.filter((item) => (item.featured || !('featured' in item)) && item.upstreamCollectionUrl);
const directCases = current.cases.filter((item) => item.collectionSource === 'direct-x');
const featuredByPost = new Map(featured.map((item) => [item.originalPostUrl, item]));
const sourcePosts = new Set(source.map((item) => item.post_url));
for (const item of featured) {
  assert.ok(sourcePosts.has(item.originalPostUrl), `${item.id}: featured case missing from pinned source`);
}

const categoryLabel = {
  motion: 'Motion graphics',
  explainer: 'Explainer animation',
  '3d': '3D scene',
  interactive: 'Interactive scene',
};

const indexed = source.map((item) => {
  assert.ok(categoryLabel[item.category], `${item.slug}: unknown category`);
  assert.match(item.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.match(item.post_url, /^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+$/);
  assert.match(item.poster_url, /^https:\/\/media\.skillry\.dev\//);
  assert.match(item.skillry_url, /^https:\/\/skillry\.dev\//);
  const existing = featuredByPost.get(item.post_url);
  if (existing) {
    assert.equal(existing.id, item.slug);
    assert.equal(existing.category, item.category);
    return { ...existing, featured: true };
  }

  const tags = item.tech_tags.filter((tag) => typeof tag === 'string' && tag.trim());
  const title = `${categoryLabel[item.category]} · @${item.author} · ${item.slug.slice(-6)}`;
  return {
    id: item.slug,
    title,
    summary: `A source-linked ${categoryLabel[item.category].toLowerCase()} case tagged ${tags.join(', ') || 'creative coding'}. Open the creator post and upstream prompt for the original brief.`,
    category: item.category,
    techTags: tags.length ? tags : ['creative-coding'],
    creator: item.author,
    originalPostUrl: item.post_url,
    sourcePromptUrl: `https://github.com/yihui-dev/awesome-opus5-5-videos/blob/${revision}/prompts/${item.slug}.md`,
    upstreamCollectionUrl: 'https://github.com/yihui-dev/awesome-opus5-5-videos',
    evidenceStatus: 'source-listed',
    promptRights: 'external-link-only',
    mediaRights: 'external-link-only',
    productionMethod: 'creative-coding',
    externalPreviewUrl: item.poster_url,
    externalWatchUrl: item.skillry_url,
    featured: false,
  };
});

const byPost = new Map(indexed.map((item) => [item.originalPostUrl, item]));
assert.equal(byPost.size, source.length, 'duplicate creator posts in upstream index');
const ordered = [
  ...featured.map((item) => byPost.get(item.originalPostUrl)),
  ...indexed.filter((item) => !featuredByPost.has(item.originalPostUrl)),
];
for (const item of directCases) {
  assert.ok(!byPost.has(item.originalPostUrl), `${item.id}: direct case duplicates pinned upstream`);
}
const catalog = { ...current, cases: [...ordered, ...directCases] };
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Indexed ${catalog.cases.length} source-linked cases; ${featured.length} featured`);
