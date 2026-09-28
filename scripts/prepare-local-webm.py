"""Prepare local review copies from BeatAPI Social Data X detail responses.

This script never uploads or commits third-party media. Publication requires
the creator's permission or a license covering redistribution.
"""

import argparse
import glob
import hashlib
import json
import subprocess
import urllib.request
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def probe(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', str(path)],
        check=True, capture_output=True, text=True,
    )
    return json.loads(result.stdout)['format']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--details-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    catalog = json.loads((Path(__file__).resolve().parent.parent / 'cases/catalog.json').read_text())
    cases = {case['originalPostUrl'].rsplit('/', 1)[-1]: case for case in catalog['cases'] if case.get('collectionSource') == 'direct-x'}
    details = {}
    for filename in glob.glob(str(args.details_dir / 'custom-*-detail.json')):
        response = json.loads(Path(filename).read_text())
        if response.get('action') == 'twitter.web.fetch_tweet_detail' and response.get('status') == 'succeeded':
            details[str(response['data']['id'])] = response
    args.output_dir.mkdir(parents=True, exist_ok=True)
    records = []
    for post_id, case in cases.items():
        response = details.get(post_id)
        if not response:
            raise RuntimeError(f'Missing BeatAPI detail for {case["id"]}')
        post = response['data']
        if post['author']['screen_name'].lower() != case['creator'].lower():
            raise RuntimeError(f'Creator mismatch for {case["id"]}')
        videos = post.get('media', {}).get('video', [])
        if len(videos) != 1:
            raise RuntimeError(f'Expected one video for {case["id"]}')
        variants = [v for v in videos[0]['variants'] if v.get('content_type') == 'video/mp4']
        variants.sort(key=lambda v: v.get('bitrate', 0))
        selected = max((v for v in variants if v.get('bitrate', 0) <= 2_500_000), key=lambda v: v['bitrate'], default=variants[0])
        mp4 = args.output_dir / f'{case["id"]}.mp4'
        webm = args.output_dir / f'{case["id"]}.webm'
        poster = args.output_dir / f'{case["id"]}.jpg'
        if not mp4.exists():
            request = urllib.request.Request(selected['url'], headers={'User-Agent': 'BeatAPI-Opus-LocalReview/1.0'})
            with urllib.request.urlopen(request, timeout=90) as source, mp4.open('wb') as target:
                while chunk := source.read(1024 * 1024):
                    target.write(chunk)
        probe(mp4)
        if not webm.exists():
            subprocess.run([
                'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(mp4),
                '-vf', 'fps=24,scale=trunc(min(1280\,iw)/2)*2:-2',
                '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '5', '-b:v', '0', '-crf', '38',
                '-c:a', 'libopus', '-b:a', '96k', str(webm),
            ], check=True)
        if not poster.exists():
            subprocess.run([
                'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', str(mp4),
                '-frames:v', '1', '-vf', 'scale=trunc(min(1280\,iw)/2)*2:-2', str(poster),
            ], check=True)
        info = probe(webm)
        records.append({
            'id': case['id'], 'post_url': case['originalPostUrl'], 'beatapi_request_id': response['request_id'],
            'webm': webm.name, 'webm_bytes': webm.stat().st_size, 'webm_sha256': sha256(webm),
            'poster': poster.name, 'poster_bytes': poster.stat().st_size, 'poster_sha256': sha256(poster),
            'duration_seconds': float(info['duration']), 'media_rights': 'external-link-only', 'publishable': False,
        })
        print(f'{len(records)}/{len(cases)} {case["id"]} {webm.stat().st_size} bytes', flush=True)
        (args.output_dir / 'local-manifest.json').write_text(json.dumps(records, indent=2) + '\n')


if __name__ == '__main__':
    main()
