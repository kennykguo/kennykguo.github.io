# quotes/views.py
from django.http import JsonResponse
from .models import Quote
from django.utils.timezone import now
import random

def daily_quote(request):
    today = now().date()
    random.seed(today.toordinal())  # Seed with today's date
    quote = Quote.get_daily_quote()
    if quote:
        return JsonResponse({
            'text': quote.text,
            'author': quote.author,
            'book': quote.book
        })
    return JsonResponse({'error': 'No quotes available'}, status=404)