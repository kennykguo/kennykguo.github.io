import os
import django
import pandas as pd
from django.db import transaction

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from quotes.models import Quote

def import_quotes_from_excel(file_path):
    df = pd.read_excel(file_path)
    # print(df)
    
    with transaction.atomic():
        Quote.objects.all().delete()  # Clear existing quotes
        for _, row in df.iterrows():
            Quote.objects.create(
                text=row['quote'],
                author=row['author'],
                book=row['book']
            )
    
    print(f"Imported {len(df)} quotes successfully.")


excel_file_path = "quotes.xlsx"  # Update this path

import_quotes_from_excel(excel_file_path)