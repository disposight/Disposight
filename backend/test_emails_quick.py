"""Quick test: verify Resend API key works using their test sender."""

import resend
from dotenv import load_dotenv

load_dotenv()

from app.config import settings

resend.api_key = settings.resend_api_key

print(f"API Key: {settings.resend_api_key[:8]}...{settings.resend_api_key[-4:]}")

# Resend allows onboarding@resend.dev as sender without domain verification
# but it can only send to the account owner's email
try:
    result = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": "support@disposight.com",
        "subject": "[DispoSight Test] API Key Verification",
        "html": "<p>Your Resend API key is working correctly.</p>",
    })
    print(f"SUCCESS: API key is valid. Email sent. ID: {result.get('id', result)}")
except Exception as e:
    print(f"RESULT: {e}")

# Also list domains to see what's configured
print("\nChecking configured domains...")
try:
    domains = resend.Domains.list()
    print(f"Domains: {domains}")
except Exception as e:
    print(f"Domain list error: {e}")
