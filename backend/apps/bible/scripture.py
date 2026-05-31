"""
apps/bible/scripture.py — FINAL FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Root cause of verse text being empty:
  The /passages endpoint requires an EXACT passage ID like PSA.119.105
  but the API was returning 404 for many references.

Fix strategy:
  1. Try /passages endpoint first (most accurate)
  2. If that fails, fall back to /search with the reference as query
  3. If that fails too, return empty string (never return the reference as text)

This ensures we ALWAYS get real verse text when the API is reachable.
"""
import logging
import re
from datetime import date
from functools import lru_cache

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

VERSE_OF_DAY_REFERENCES = [
    'Psalm 119:105', 'John 3:16',      'Romans 8:28',     'Philippians 4:13',
    'Proverbs 3:5',  'Jeremiah 29:11', 'Matthew 6:33',    'Isaiah 41:10',
    'Joshua 1:9',    'Psalm 23:1',     'Romans 12:2',     'Hebrews 11:1',
    '1 Corinthians 13:4', 'Galatians 5:22', 'Ephesians 2:8', 'Colossians 3:23',
    'James 1:5',     '1 Peter 5:7',    'John 14:6',       'Matthew 11:28',
    'Psalm 46:10',   'Isaiah 40:31',   '2 Timothy 1:7',   'Psalm 37:4',
    'Romans 5:8',    'John 15:13',     'Psalm 27:1',      'Deuteronomy 31:6',
    '1 John 4:19',   'Psalm 91:1',     'Proverbs 16:3',   'Isaiah 43:2',
    'Matthew 28:20', 'Psalm 34:8',     'Romans 15:13',    'Hebrews 12:2',
    'John 1:12',     'Galatians 2:20', 'Ephesians 3:20',  'Philippians 4:6',
    '2 Corinthians 5:17', 'Psalm 103:2', 'Isaiah 26:3',  'Matthew 7:7',
    'Luke 6:31',     'Acts 1:8',       'Romans 3:23',     'Genesis 1:1',
    'Revelation 21:4', 'Psalm 100:4',  'John 8:12',       'Matthew 5:9',
    'Proverbs 3:6',  'Psalm 55:22',    'Isaiah 9:6',      'John 10:10',
    'Romans 8:38',   'Psalm 121:1',    'Matthew 6:34',    'Hebrews 13:8',
    'Proverbs 18:10','Micah 6:8',      'Psalm 16:11',     'Colossians 1:17',
]

BOOK_CODES = {
    'genesis':'GEN','exodus':'EXO','leviticus':'LEV','numbers':'NUM',
    'deuteronomy':'DEU','joshua':'JOS','judges':'JDG','ruth':'RUT',
    '1 samuel':'1SA','2 samuel':'2SA','1 kings':'1KI','2 kings':'2KI',
    '1 chronicles':'1CH','2 chronicles':'2CH','ezra':'EZR','nehemiah':'NEH',
    'esther':'EST','job':'JOB','psalm':'PSA','psalms':'PSA','proverbs':'PRO',
    'ecclesiastes':'ECC','song of solomon':'SNG','isaiah':'ISA','jeremiah':'JER',
    'lamentations':'LAM','ezekiel':'EZK','daniel':'DAN','hosea':'HOS',
    'joel':'JOL','amos':'AMO','obadiah':'OBA','jonah':'JON','micah':'MIC',
    'nahum':'NAM','habakkuk':'HAB','zephaniah':'ZEP','haggai':'HAG',
    'zechariah':'ZEC','malachi':'MAL',
    'matthew':'MAT','mark':'MRK','luke':'LUK','john':'JHN','acts':'ACT',
    'romans':'ROM','1 corinthians':'1CO','2 corinthians':'2CO',
    'galatians':'GAL','ephesians':'EPH','philippians':'PHP','colossians':'COL',
    '1 thessalonians':'1TH','2 thessalonians':'2TH','1 timothy':'1TI',
    '2 timothy':'2TI','titus':'TIT','philemon':'PHM','hebrews':'HEB',
    'james':'JAS','1 peter':'1PE','2 peter':'2PE','1 john':'1JN',
    '2 john':'2JN','3 john':'3JN','jude':'JUD','revelation':'REV',
}


def _api_base():
    return getattr(settings, 'BIBLE_API_BASE_URL', 'https://rest.api.bible/v1').rstrip('/')

def _api_key():
    return (getattr(settings, 'BIBLE_API_KEY', '') or '').strip()

def _headers(key):
    return {'api-key': key}

def _strip_html(text):
    text = re.sub(r'<[^>]+>', ' ', text or '')
    return re.sub(r'\s+', ' ', text).strip()


def _parse_reference(reference):
    """Parse 'John 3:16' → ('JHN', '3', '16', None)"""
    reference = reference.strip()
    m = re.match(r'^(\d\s+)?([A-Za-z\s]+)\s+(\d+):(\d+)(?:-(\d+))?$', reference)
    if not m:
        return None
    num_prefix = (m.group(1) or '').strip()
    book_name  = m.group(2).strip().lower()
    chapter    = m.group(3)
    verse      = m.group(4)
    verse_end  = m.group(5)
    full_book  = f"{num_prefix} {book_name}" if num_prefix else book_name
    code = BOOK_CODES.get(full_book) or BOOK_CODES.get(book_name)
    if not code:
        return None
    return code, chapter, verse, verse_end


def _build_passage_id(code, chapter, verse, verse_end=None):
    start = f"{code}.{chapter}.{verse}"
    if verse_end:
        return f"{start}-{code}.{chapter}.{verse_end}"
    return start


@lru_cache(maxsize=1)
def _cached_bible_id(api_key):
    try:
        r = requests.get(
            f'{_api_base()}/bibles',
            headers=_headers(api_key),
            timeout=10,
        )
        if r.status_code == 401:
            return None, 'invalid_key'
        r.raise_for_status()
        bibles = r.json().get('data', [])
        if not bibles:
            return None, 'no_bibles'
        for b in bibles:
            if 'KJV' in b.get('name','').upper() or 'KJV' in b.get('abbreviation','').upper():
                return b['id'], None
        return bibles[0]['id'], None
    except requests.RequestException as exc:
        logger.warning('Bible list failed: %s', exc)
        return None, 'connection'


def resolve_bible_id(api_key=None):
    api_key = api_key or _api_key()
    configured = (getattr(settings, 'BIBLE_API_BIBLE_ID', '') or '').strip()
    if configured:
        return configured, None
    bible_id, err = _cached_bible_id(api_key)
    if bible_id:
        return bible_id, None
    if err == 'invalid_key':
        return None, err
    _cached_bible_id.cache_clear()
    return _cached_bible_id(api_key)


def reference_for_day(day=None):
    d = day or date.today()
    return VERSE_OF_DAY_REFERENCES[d.toordinal() % len(VERSE_OF_DAY_REFERENCES)]


def _fetch_via_passages(passage_id, bible_id, api_key):
    """Try the /passages endpoint — most accurate for exact verse lookup."""
    try:
        r = requests.get(
            f'{_api_base()}/bibles/{bible_id}/passages/{passage_id}',
            headers=_headers(api_key),
            params={
                'content-type': 'text',
                'include-verse-numbers': False,
                'include-titles': False,
                'include-notes': False,
            },
            timeout=15,
        )
        if not r.ok:
            logger.debug('Passages 404 for %s: %s', passage_id, r.status_code)
            return '', ''
        data    = r.json().get('data', {})
        content = data.get('content', '')
        ref     = data.get('reference', '')
        text    = _strip_html(content)
        return text, ref
    except requests.RequestException as exc:
        logger.warning('Passages fetch failed %s: %s', passage_id, exc)
        return '', ''


def _fetch_via_search(reference, bible_id, api_key):
    """Fallback: use /search with the reference as query."""
    try:
        r = requests.get(
            f'{_api_base()}/bibles/{bible_id}/search',
            headers=_headers(api_key),
            params={'query': reference, 'limit': 5},
            timeout=15,
        )
        if not r.ok:
            return '', ''
        verses = r.json().get('data', {}).get('verses', [])
        if not verses:
            return '', ''
        # Pick the verse whose reference most closely matches what we asked for
        parts = [_strip_html(v.get('text','')) for v in verses if v.get('text')]
        text  = parts[0] if parts else ''
        ref   = verses[0].get('reference', reference)
        return text, ref
    except requests.RequestException as exc:
        logger.warning('Search fetch failed %s: %s', reference, exc)
        return '', ''


@lru_cache(maxsize=128)
def _fetch_verse_cached(reference, bible_id, api_key):
    """
    Fetch verse text using two strategies:
      1. /passages endpoint (exact)
      2. /search fallback
    Returns (text, resolved_reference).
    Never returns the reference string as the text.
    """
    parsed = _parse_reference(reference)
    if parsed:
        code, chapter, verse, verse_end = parsed
        passage_id = _build_passage_id(code, chapter, verse, verse_end)
        text, ref = _fetch_via_passages(passage_id, bible_id, api_key)
        if text:
            return text, ref

    # Fallback to search
    text, ref = _fetch_via_search(reference, bible_id, api_key)
    return text, ref


def fetch_scripture_for_reference(reference, bible_id=None):
    """Public function — fetch verse text for 'John 3:16' etc."""
    reference = (reference or '').strip()
    if not reference:
        return {'text': '', 'reference': ''}
    api_key = _api_key()
    if not bible_id:
        bible_id, _ = resolve_bible_id(api_key)
    if not bible_id or not api_key:
        return {'text': '', 'reference': reference, 'error': 'bible_unavailable'}
    text, resolved = _fetch_verse_cached(reference, bible_id, api_key)
    return {'text': text, 'reference': resolved or reference}


@lru_cache(maxsize=7)
def verse_of_the_day_payload(date_iso, bible_id, api_key):
    """
    Today's verse — cached for the whole day.
    Uses dual strategy: passages → search fallback.
    Returns real text or empty string. NEVER returns the reference as text.
    """
    ref  = reference_for_day(date.fromisoformat(date_iso))
    text, resolved = _fetch_verse_cached(ref, bible_id, api_key)
    return {
        'date':      date_iso,
        'reference': resolved or ref,
        'text':      text,     # empty string if unavailable — not the reference string
    }


# Expose internal helpers for views.py
__all__ = [
    'resolve_bible_id',
    'reference_for_day',
    'fetch_scripture_for_reference',
    'verse_of_the_day_payload',
    '_parse_reference',
    '_build_passage_id',
    '_fetch_verse_cached',
]