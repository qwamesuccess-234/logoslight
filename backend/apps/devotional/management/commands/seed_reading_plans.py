"""
Seed sample reading plans with daily devotionals (local dev).
Run: python manage.py seed_reading_plans
"""
from django.core.management.base import BaseCommand
from apps.devotional.models import ReadingPlan, Devotional


PLANS = [
    {
        'title': 'Knowing God — 7 Days',
        'description': 'A week exploring who God is through Scripture and reflection.',
        'duration_days': 7,
        'days': [
            ('The Creator', 'Genesis 1:1-5', 'God spoke the world into being. Before anything existed, He was — eternal, purposeful, and good.'),
            ('The Shepherd', 'Psalm 23:1-6', 'The Lord leads, restores, and comforts. We lack nothing when we belong to Him.'),
            ('The Light', 'John 8:12', 'Jesus declares Himself the light of the world. Those who follow Him walk in truth, not darkness.'),
            ('The Provider', 'Matthew 6:25-34', 'Worry cannot add a single hour to our lives. Seek first the kingdom and trust His care.'),
            ('The Redeemer', 'Romans 5:8', 'Christ died for us while we were still sinners. Love like this changes everything.'),
            ('The Comforter', 'John 14:26-27', 'The Holy Spirit teaches and brings peace the world cannot give.'),
            ('The King', 'Revelation 21:4', 'God will wipe every tear. Death, mourning, and pain will be no more.'),
        ],
    },
    {
        'title': 'Walking in Faith — 14 Days',
        'description': 'Two weeks of passages on trusting God in every season.',
        'duration_days': 14,
        'days': [
            ('Faith Defined', 'Hebrews 11:1', 'Faith is confidence in what we hope for and assurance about what we do not see.'),
            ('Abraham\'s Call', 'Genesis 12:1-4', 'Leave your country and go — Abraham obeyed without knowing the destination.'),
            ('Fear Not', 'Isaiah 41:10', 'Do not fear, for I am with you. I will strengthen you and help you.'),
            ('Ask in Faith', 'James 1:5-6', 'If any of you lacks wisdom, ask God who gives generously to all without finding fault.'),
            ('Peace in Trials', 'Philippians 4:6-7', 'Present your requests to God — and the peace of God will guard your hearts.'),
            ('All Things Work', 'Romans 8:28', 'God works for the good of those who love Him and are called according to His purpose.'),
            ('Be Still', 'Psalm 46:10', 'Be still, and know that I am God. I will be exalted among the nations.'),
            ('New Creation', '2 Corinthians 5:17', 'If anyone is in Christ, the new creation has come. The old has gone.'),
            ('Strength Renewed', 'Isaiah 40:31', 'Those who hope in the Lord will renew their strength and soar on wings like eagles.'),
            ('Trust the Path', 'Proverbs 3:5-6', 'Trust in the Lord with all your heart and lean not on your own understanding.'),
            ('God Is Love', '1 John 4:16', 'God is love. Whoever lives in love lives in God, and God in them.'),
            ('Cast Your Cares', '1 Peter 5:7', 'Cast all your anxiety on Him because He cares for you.'),
            ('Walk by Spirit', 'Galatians 5:22-23', 'The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness.'),
            ('Eternal Hope', '1 Peter 1:3-4', 'Praise be to God who has given us new birth into a living hope through the resurrection of Jesus Christ.'),
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed reading plans and devotionals for local development'

    def handle(self, *args, **options):
        created_plans = 0
        created_devotionals = 0

        for plan_data in PLANS:
            plan, created = ReadingPlan.objects.get_or_create(
                title=plan_data['title'],
                defaults={
                    'description': plan_data['description'],
                    'duration_days': plan_data['duration_days'],
                    'is_active': True,
                },
            )
            if created:
                created_plans += 1
                self.stdout.write(self.style.SUCCESS(f'Created plan: {plan.title}'))

            for day_num, (title, ref, content) in enumerate(plan_data['days'], start=1):
                _, dev_created = Devotional.objects.get_or_create(
                    plan=plan,
                    day_number=day_num,
                    defaults={
                        'title': title,
                        'scripture_reference': ref,
                        'content': content,
                        'reflection_question': f'How does {ref} speak to your life today?',
                        'prayer': 'Lord, open my heart to Your Word and help me obey what You reveal. Amen.',
                    },
                )
                if dev_created:
                    created_devotionals += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. New plans: {created_plans}, new devotionals: {created_devotionals}.'
        ))
