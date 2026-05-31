from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookmarkViewSet, ReadingProgressViewSet,
    search_scripture, get_passage, list_bibles,
    verse_of_the_day, compare_versions, verse_reactions,
)

router = DefaultRouter()
router.register(r'bookmarks', BookmarkViewSet, basename='bookmark')
router.register(r'progress',  ReadingProgressViewSet, basename='reading-progress')

urlpatterns = [
    path('', include(router.urls)),
    path('search/',            search_scripture,  name='bible-search'),
    path('passage/',           get_passage,       name='bible-passage'),
    path('list/',              list_bibles,       name='bible-list'),
    path('verse-of-the-day/',  verse_of_the_day,  name='verse-of-the-day'),
    path('compare/',           compare_versions,  name='bible-compare'),
    path('verse-reactions/',   verse_reactions,   name='verse-reactions'),
]