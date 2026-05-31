"""
apps/bible/views.py — updated with multi-version + verse reactions
"""
import logging, requests
from datetime import date
from django.conf import settings
from rest_framework import serializers, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db import models as dm
from django.contrib.auth import get_user_model

from apps.core.permissions import IsOwner
from .models import Bookmark, ReadingProgress
from .scripture import resolve_bible_id, verse_of_the_day_payload, fetch_scripture_for_reference, _fetch_verse_cached

logger = logging.getLogger(__name__)
User = get_user_model()

def _base(): return getattr(settings,'BIBLE_API_BASE_URL','https://rest.api.bible/v1').rstrip('/')
def _key():  return (getattr(settings,'BIBLE_API_KEY','') or '').strip()
def _h(k):   return {'api-key': k}
def _cfg():
    k = _key()
    if not k or 'replace-this' in k.lower():
        return Response({'error':'Bible API key not configured.'},status=503)
def _na(e=None):
    return Response({'error':'Could not connect to Bible API.','hint':{'invalid_key':'Key rejected.','no_bibles':'No translations enabled.','connection':'Check internet.'}.get(e,'Check internet.')},status=503)

# ── Serializers ────────────────────────────────────────────────────────────────

class BookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model=Bookmark; fields=['id','book','chapter','verse','verse_end','note','created_at']; read_only_fields=['id','created_at']

class ReadingProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model=ReadingProgress; fields=['id','book','last_chapter_read','completed','updated_at']; read_only_fields=['id','updated_at']

# ── Verse of the Day ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def verse_of_the_day(request):
    e=_cfg()
    if e: return e
    k=_key(); bid,ek=resolve_bible_id(k)
    if not bid: return _na(ek)
    data=verse_of_the_day_payload(date.today().isoformat(),bid,k)
    if not data.get('text'):
        return Response({'reference':data.get('reference',''),'text':'','error':'verse_text_unavailable','hint':'Pin BIBLE_API_BIBLE_ID in backend/.env'},status=200)
    return Response(data)

# ── Search ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_scripture(request):
    q=request.query_params.get('q','').strip()
    if not q: return Response({'error':'q required'},status=400)
    e=_cfg()
    if e: return e
    k=_key(); bid,ek=resolve_bible_id(k)
    if not bid: return _na(ek)
    try:
        offset=int(request.query_params.get('offset',0)); limit=min(int(request.query_params.get('limit',100)),100)
    except: offset,limit=0,100
    try:
        r=requests.get(f'{_base()}/bibles/{bid}/search',headers=_h(k),params={'query':q,'limit':limit,'offset':offset,'sort':'relevance'},timeout=20)
        if r.status_code==401: return Response({'error':'API key invalid'},status=503)
        r.raise_for_status()
        d=r.json().get('data',{}); total=d.get('total',0); verses=d.get('verses',[])
        return Response({'data':{'query':q,'verses':verses,'total':total,'offset':offset,'limit':limit,'has_more':(offset+limit)<total}})
    except requests.Timeout: return Response({'error':'Timed out'},status=504)
    except requests.RequestException as ex: return Response({'error':str(ex)},status=502)

# ── Passage / Chapter / Verse ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_passage(request):
    e=_cfg()
    if e: return e
    k=_key(); bid,ek=resolve_bible_id(k)
    if not bid: return _na(ek)

    # Single verse lookup
    verse_num=request.query_params.get('verse','').strip()
    book=request.query_params.get('book','').strip()
    chapter=request.query_params.get('chapter','').strip()

    # If all three provided → fetch specific verse
    if book and chapter and verse_num:
        ref=f'{book} {chapter}:{verse_num}'
        result=fetch_scripture_for_reference(ref,bid)
        return Response({'data':result,'type':'verse'})

    # Reference string
    ref=request.query_params.get('reference','').strip()
    if ref:
        result=fetch_scripture_for_reference(ref,bid)
        return Response({'data':result})

    # Chapter
    if not book or not chapter:
        return Response({'error':'Provide book+chapter or book+chapter+verse'},status=400)
    try:
        r=requests.get(
            f'{_base()}/bibles/{bid}/chapters/{book}.{chapter}',
            headers=_h(k),
            params={'content-type':'text','include-verse-numbers':True,'include-titles':False},
            timeout=15,
        )
        r.raise_for_status()
        data=r.json()
        # Also fetch list of verses for this chapter so user can pick a verse
        vr=requests.get(f'{_base()}/bibles/{bid}/chapters/{book}.{chapter}/verses',headers=_h(k),timeout=10)
        verses_list=vr.json().get('data',[]) if vr.ok else []
        resp=data.copy()
        if isinstance(resp.get('data'),dict):
            resp['data']['verses_list']=verses_list
        return Response(resp)
    except requests.Timeout: return Response({'error':'Timed out'},status=504)
    except requests.RequestException as ex: return Response({'error':str(ex)},status=502)

# ── Multi-version comparison ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def compare_versions(request):
    """
    GET /api/v1/bible/compare/?reference=John+3:16&versions=bible1,bible2,bible3
    Returns the same verse in multiple translations side by side.
    """
    ref=request.query_params.get('reference','').strip()
    versions=request.query_params.get('versions','').strip()
    if not ref: return Response({'error':'reference required'},status=400)

    e=_cfg()
    if e: return e
    k=_key()

    # If no versions specified, use the default + fetch all available
    if versions:
        bible_ids=[v.strip() for v in versions.split(',') if v.strip()]
    else:
        bid,_=resolve_bible_id(k)
        bible_ids=[bid] if bid else []

    if not bible_ids:
        return _na('no_bibles')

    results=[]
    for bid in bible_ids[:5]:  # max 5 versions
        text,resolved=_fetch_verse_cached(ref,bid,k)
        # Get bible name
        try:
            br=requests.get(f'{_base()}/bibles/{bid}',headers=_h(k),timeout=8)
            bname=br.json().get('data',{}).get('abbreviation',bid) if br.ok else bid
        except: bname=bid
        results.append({
            'bible_id':bid,
            'abbreviation':bname,
            'reference':resolved or ref,
            'text':text,
        })
    return Response({'reference':ref,'versions':results})

# ── List all available Bibles ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_bibles(request):
    e=_cfg()
    if e: return e
    k=_key()
    try:
        r=requests.get(f'{_base()}/bibles',headers=_h(k),timeout=10); r.raise_for_status()
        bibles=r.json().get('data',[]); bid,_=resolve_bible_id(k)
        return Response({
            'count':len(bibles),
            'active_bible_id':bid,
            'bibles':[{'id':b['id'],'name':b.get('name'),'abbreviation':b.get('abbreviation'),'language':b.get('language',{}).get('name')} for b in bibles]
        })
    except requests.RequestException as ex: return Response({'error':str(ex)},status=502)

# ── Verse of the Day Reactions (stored in DB) ──────────────────────────────────

# Simple in-memory store using Django cache or DB
# We use a lightweight approach: store in a JSON field or separate model
# For now use a simple file-based approach via Django cache

from django.core.cache import cache

@api_view(['GET','POST','DELETE'])
@permission_classes([permissions.IsAuthenticated])
def verse_reactions(request):
    """
    GET    /api/v1/bible/verse-reactions/?date=2026-05-30
    POST   /api/v1/bible/verse-reactions/  {date, emoji}
    DELETE /api/v1/bible/verse-reactions/  {date, emoji}
    """
    today=request.query_params.get('date',date.today().isoformat())
    cache_key=f'verse_reactions_{today}'
    uid=str(request.user.id)

    if request.method=='GET':
        reactions=cache.get(cache_key,{})
        # Aggregate: {emoji: {count, reacted_by_me}}
        agg={}
        for emoji,users in reactions.items():
            agg[emoji]={'count':len(users),'reacted_by_me':uid in users}
        return Response({'date':today,'reactions':agg})

    emoji=request.data.get('emoji','').strip()
    if not emoji: return Response({'error':'emoji required'},status=400)
    reactions=cache.get(cache_key,{})

    if request.method=='POST':
        if emoji not in reactions: reactions[emoji]=[]
        if uid not in reactions[emoji]: reactions[emoji].append(uid)
        cache.set(cache_key,reactions,86400*7)  # keep 7 days
        return Response({'status':'reacted','emoji':emoji},status=201)

    if request.method=='DELETE':
        if emoji in reactions and uid in reactions[emoji]:
            reactions[emoji].remove(uid)
            if not reactions[emoji]: del reactions[emoji]
        cache.set(cache_key,reactions,86400*7)
        return Response({'status':'removed'})

# ── Bookmarks / Progress ViewSets ─────────────────────────────────────────────

class BookmarkViewSet(viewsets.ModelViewSet):
    serializer_class=BookmarkSerializer; permission_classes=[permissions.IsAuthenticated,IsOwner]
    def get_queryset(self): return Bookmark.objects.filter(user=self.request.user)
    def perform_create(self,s): s.save(user=self.request.user)

class ReadingProgressViewSet(viewsets.ModelViewSet):
    serializer_class=ReadingProgressSerializer; permission_classes=[permissions.IsAuthenticated,IsOwner]
    def get_queryset(self): return ReadingProgress.objects.filter(user=self.request.user)
    def perform_create(self,s): s.save(user=self.request.user)