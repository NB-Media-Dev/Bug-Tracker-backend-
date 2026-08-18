"""
users/utils.py

Utility functions for:
  - Generating company email addresses from employee names
  - Generating strong random passwords
  - Resolving company email conflicts (appends a number suffix)
"""

import secrets
import string
import re
from django.conf import settings


def generate_company_email(full_name: str, employee_id: str) -> str:
    """
    Generates a company email from the employee's full name and employee ID.

    Examples:
        Name: "Vasanthan Kumar", Employee ID: "EMP001" -> "vasanthan.kumar.emp001@nbmedia.com"
    """
    domain = getattr(settings, 'COMPANY_DOMAIN', 'company.com')

    # Normalize: lowercase, strip whitespace
    name = full_name.strip().lower()

    # Replace spaces and hyphens with dots
    name = re.sub(r"[\s\-]+", ".", name)

    # Remove any characters that aren't letters or dots
    name = re.sub(r"[^a-z.]", "", name)

    # Clean double dots and trailing/leading dots
    name = re.sub(r"\.+", ".", name).strip(".")

    if not name:
        name = "employee"

    # Extract numeric part from employee_id (e.g. Ts001 -> 001)
    match = re.search(r'\d+', employee_id)
    num_str = match.group(0) if match else "001"

    # Concatenate: <name>.emp<number>@<domain>
    eid = f"emp{num_str}"
    return f"{name}.{eid}@{domain}"


def generate_strong_password(length: int = 12) -> str:
    """
    Generates a cryptographically strong random password.

    Rules:
      - At least one uppercase letter
      - At least one lowercase letter
      - At least one digit
      - At least one special character
      - Total length = `length` characters (default: 12)

    Returns the plain-text password (to be emailed to the employee).
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"

    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))

        # Ensure all character class requirements are met
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*" for c in password)

        if has_upper and has_lower and has_digit and has_special:
            return password
