import { readFileSync, writeFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../cases/catalog.json', import.meta.url), 'utf8'));
const checkOnly = process.argv.includes('--check');
const startMarker = '<!-- GENERATED_CASE_GALLERY_START -->';
const endMarker = '<!-- GENERATED_CASE_GALLERY_END -->';
const categories = [
  { id: 'motion', en: 'Motion graphics', zh: '动态视觉' },
  { id: 'explainer', en: 'Explainers', zh: '讲解动画' },
  { id: '3d', en: '3D scenes', zh: '3D 场景' },
  { id: 'interactive', en: 'Games & interactive', zh: '游戏与交互' },
];

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function renderCase(item, index, locale) {
  const isChinese = locale === 'zh';
  const watchUrl = item.externalWatchUrl ?? item.originalPostUrl;
  const preview = item.externalPreviewUrl
    ? `<a href="${watchUrl}">\n  <img src="${item.externalPreviewUrl}" alt="${isChinese ? '外部视频预览' : 'External video preview'}: ${escapeHtml(item.title)}" width="700" />\n</a>\n\n`
    : `_${isChinese ? '暂无可核对的视频预览；请在创作者原帖观看。' : 'No matching video preview is available; watch the creator’s original post.'}_\n\n`;
  const badge = item.externalWatchUrl
    ? `[![${isChinese ? '观看视频' : 'Watch video'}](https://img.shields.io/badge/WATCH_VIDEO-3158E8?style=for-the-badge)](${watchUrl})`
    : `[![${isChinese ? '观看原帖' : 'Watch original post'}](https://img.shields.io/badge/WATCH_ORIGINAL-3158E8?style=for-the-badge)](${watchUrl})`;
  const sourceLabel = isChinese ? '原帖' : 'Source';
  const promptLabel = isChinese ? '上游提示词' : 'Prompt at source';
  const previewNote = item.externalWatchUrl
    ? ` · ${isChinese ? 'Skillry 外部观看页，可能含重制版' : 'External Skillry watch page; may include a remake'}`
    : '';

  return `### ${index + 1}. ${item.title}\n\n${preview}${item.summary}\n\n${badge}\n\n**${sourceLabel}:** [@${item.creator}](${item.originalPostUrl}) · ${item.techTags.join(' / ')}${previewNote}\n\n**${promptLabel}:** [${isChinese ? '查看来源文件' : 'View upstream file'}](${item.sourcePromptUrl})\n\n---`;
}

function renderGallery(locale) {
  let caseIndex = 0;
  return categories
    .map((category) => {
      const items = catalog.cases.filter((item) => item.category === category.id);
      const blocks = items.map((item) => renderCase(item, caseIndex++, locale)).join('\n\n');
      return `<a id="${category.id}"></a>\n\n**${category[locale]} (${items.length})**\n\n${blocks}`;
    })
    .join('\n\n');
}

let differs = false;
for (const [filename, locale] of [['README.md', 'en'], ['README.zh-CN.md', 'zh']]) {
  const path = new URL(`../${filename}`, import.meta.url);
  const current = readFileSync(path, 'utf8');
  const start = current.indexOf(startMarker);
  const end = current.indexOf(endMarker);
  if (start < 0 || end < start || current.indexOf(startMarker, start + 1) >= 0 || current.indexOf(endMarker, end + 1) >= 0) {
    throw new Error(`${filename}: expected one ordered pair of gallery markers`);
  }
  const updated = `${current.slice(0, start + startMarker.length)}\n\n${renderGallery(locale)}\n\n${current.slice(end)}`;
  if (updated !== current) {
    differs = true;
    if (!checkOnly) writeFileSync(path, updated);
  }
}

if (checkOnly && differs) throw new Error('README galleries are out of date; run npm run gallery:sync');
console.log(checkOnly ? 'README galleries match catalog' : 'README galleries generated from catalog');
