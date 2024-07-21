from django.db import models

# Create your models here.

import random

class Quote(models.Model):
    text = models.TextField()
    author = models.CharField(max_length=255)
    book = models.CharField(max_length=255)

    @classmethod
    def get_daily_quote(cls):
        count = cls.objects.count()
        if count == 0:
            return None
        return cls.objects.all()[random.randint(0, count - 1)]

    def __str__(self):
        return f"{self.text[:50]}... - {self.author}"