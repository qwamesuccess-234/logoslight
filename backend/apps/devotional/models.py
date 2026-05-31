"""
apps/devotional/models.py — Sprint 3 improvements
New: tags field on ReadingPlan for category search
New: featured flag for recommended plans shown on empty state
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from django.urls import path, include
from rest_framework.routers import DefaultRouter


# ─── Models ───────────────────────────────────────────────────────────────────

class ReadingPlan(models.Model):
    title           = models.CharField(max_length=200)
    description     = models.TextField()
    duration_days   = models.PositiveIntegerField()
    cover_image_url = models.URLField(blank=True, default='')
    is_active       = models.BooleanField(default=True)
    is_featured     = models.BooleanField(
        default=False,
        help_text='Show in recommended plans on empty search'
    )
    tags = models.CharField(
        max_length=300, blank=True, default='',
        help_text='Comma-separated: prayer,faith,gospel,psalms,new testament'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reading_plans'
        ordering = ['-is_featured', 'title']

    def tag_list(self):
        return [t.strip().lower() for t in self.tags.split(',') if t.strip()]

    def __str__(self):
        return f"{self.title} ({self.duration_days} days)"


class Devotional(models.Model):
    plan               = models.ForeignKey(
        ReadingPlan, on_delete=models.CASCADE, related_name='devotionals'
    )
    day_number         = models.PositiveIntegerField()
    title              = models.CharField(max_length=300)
    scripture_reference = models.CharField(max_length=100)
    content            = models.TextField()
    prayer             = models.TextField(blank=True, default='')
    reflection_question = models.TextField(blank=True, default='')
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'devotionals'
        ordering        = ['plan', 'day_number']
        unique_together = [['plan', 'day_number']]

    def __str__(self):
        return f"{self.plan.title} — Day {self.day_number}: {self.title}"


class UserPlanProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='plan_progress'
    )
    plan = models.ForeignKey(
        ReadingPlan, on_delete=models.CASCADE, related_name='user_progress'
    )
    current_day  = models.PositiveIntegerField(default=1)
    started_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table        = 'user_plan_progress'
        unique_together = [['user', 'plan']]
        indexes         = [models.Index(fields=['user', 'plan'])]

    def __str__(self):
        return f"{self.user.username} → {self.plan.title} (Day {self.current_day})"


# ─── Serializers ──────────────────────────────────────────────────────────────

class DevotionalSerializer(serializers.ModelSerializer):
    scripture_text = serializers.SerializerMethodField()

    class Meta:
        model  = Devotional
        fields = [
            'id', 'day_number', 'title', 'scripture_reference',
            'scripture_text', 'content', 'prayer', 'reflection_question', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_scripture_text(self, obj) -> str:
        try:
            from apps.bible.scripture import fetch_scripture_for_reference
            result = fetch_scripture_for_reference(obj.scripture_reference)
            return result.get('text', '')
        except Exception:
            return ''


class ReadingPlanSerializer(serializers.ModelSerializer):
    devotional_count = serializers.SerializerMethodField()
    tag_list         = serializers.SerializerMethodField()

    class Meta:
        model  = ReadingPlan
        fields = [
            'id', 'title', 'description', 'duration_days',
            'cover_image_url', 'is_featured', 'tags', 'tag_list',
            'devotional_count',
        ]

    def get_devotional_count(self, obj) -> int:
        return obj.devotionals.count()

    def get_tag_list(self, obj):
        return obj.tag_list()


class UserPlanProgressSerializer(serializers.ModelSerializer):
    plan_title         = serializers.CharField(source='plan.title', read_only=True)
    plan_duration_days = serializers.IntegerField(source='plan.duration_days', read_only=True)

    class Meta:
        model  = UserPlanProgress
        fields = [
            'id', 'plan', 'plan_title', 'plan_duration_days',
            'current_day', 'started_at', 'completed_at',
        ]
        read_only_fields = ['id', 'started_at']

    def update(self, instance, validated_data):
        new_day = validated_data.get('current_day', instance.current_day)
        instance.current_day = new_day
        if new_day > instance.plan.duration_days and not instance.completed_at:
            instance.completed_at = timezone.now()
        instance.save()
        return instance


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class ReadingPlanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReadingPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields    = ['title', 'description', 'tags']

    def get_queryset(self):
        qs = ReadingPlan.objects.filter(is_active=True).prefetch_related('devotionals')
        q = self.request.query_params.get('q', '').strip()
        if q:
            keywords = q.split()
            query = Q()
            for kw in keywords:
                query |= (
                    Q(title__icontains=kw) |
                    Q(description__icontains=kw) |
                    Q(tags__icontains=kw)
                )
            qs = qs.filter(query)
        return qs


class DevotionalViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = DevotionalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        plan_id = self.request.query_params.get('plan')
        qs = Devotional.objects.select_related('plan').order_by('day_number')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        return qs


class UserPlanProgressViewSet(viewsets.ModelViewSet):
    serializer_class   = UserPlanProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPlanProgress.objects.filter(
            user=self.request.user
        ).select_related('plan')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ─── Featured / Recommended plans endpoint ────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def featured_plans(request):
    """GET /devotional/featured/ — recommended plans for empty search state."""
    plans = ReadingPlan.objects.filter(
        is_active=True, is_featured=True
    ).prefetch_related('devotionals')[:6]
    # Fall back to any plans if none are featured
    if not plans.exists():
        plans = ReadingPlan.objects.filter(
            is_active=True
        ).prefetch_related('devotionals')[:6]
    serializer = ReadingPlanSerializer(plans, many=True)
    return Response({'results': serializer.data})


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register(r'plans',       ReadingPlanViewSet,      basename='reading-plan')
router.register(r'entries',     DevotionalViewSet,       basename='devotional')
router.register(r'my-progress', UserPlanProgressViewSet, basename='plan-progress')

urlpatterns = [
    path('', include(router.urls)),
    path('featured/', featured_plans, name='featured-plans'),
]


# ─── Admin ────────────────────────────────────────────────────────────────────
from django.contrib import admin

@admin.register(ReadingPlan)
class ReadingPlanAdmin(admin.ModelAdmin):
    list_display  = ['title', 'duration_days', 'is_active', 'is_featured', 'tags']
    list_filter   = ['is_active', 'is_featured']
    search_fields = ['title', 'tags']
    list_editable = ['is_active', 'is_featured']

@admin.register(Devotional)
class DevotionalAdmin(admin.ModelAdmin):
    list_display  = ['plan', 'day_number', 'title', 'scripture_reference']
    list_filter   = ['plan']
    ordering      = ['plan', 'day_number']

@admin.register(UserPlanProgress)
class UserPlanProgressAdmin(admin.ModelAdmin):
    list_display  = ['user', 'plan', 'current_day', 'started_at', 'completed_at']
    list_filter   = ['plan']
    raw_id_fields = ['user']