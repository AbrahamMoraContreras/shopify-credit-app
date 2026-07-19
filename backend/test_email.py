import os
import resend

resend.api_key = "re_8F6KeQHq_2d2FoDc7RLbKPpbP3MoCDoBZ" # From .env

try:
    response = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": ["test@example.com"], # We will see if it allows random emails
        "subject": "Test Email",
        "html": "<p>Test</p>"
    })
    print("Success:", response)
except Exception as e:
    print("Error:", e)
