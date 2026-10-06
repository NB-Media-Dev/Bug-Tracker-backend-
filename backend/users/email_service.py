
import threading
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

try:
    import requests
except ImportError:
    requests = None


def _dispatch_email(
    to_email: str,
    subject: str,
    text_content: str,
    html_content: str,
    recipient_name: str = "",
) -> bool:
    """
    Sends an email using Brevo HTTPS API if BREVO_API_KEY is configured in settings.
    Falls back to Django's standard EmailMultiAlternatives (SMTP or default backend) if Brevo is not set or fails.
    """
    brevo_api_key = getattr(settings, 'BREVO_API_KEY', '')
    if brevo_api_key:
        brevo_api_key = str(brevo_api_key).strip()

    sender_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@company.com')
    sender_name = getattr(settings, 'DEFAULT_FROM_NAME', 'BugTracker Admin')
    from_email = f"{sender_name} <{sender_email}>" if sender_name else sender_email

    # 1. Brevo HTTPS API (recommended for cloud hosts like Render/Railway where outbound SMTP is blocked)
    if brevo_api_key and requests is not None:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": brevo_api_key,
                "content-type": "application/json",
            }
            payload = {
                "sender": {"name": sender_name, "email": sender_email},
                "to": [{"email": to_email, "name": recipient_name or to_email}],
                "subject": subject,
                "htmlContent": html_content,
                "textContent": text_content,
            }
            response = requests.post(url, json=payload, headers=headers, timeout=12)
            if response.status_code in (200, 201, 202):
                return True
            else:
                print(f"[Brevo API Error] Status: {response.status_code}, Response: {response.text}")
        except Exception as api_err:
            print(f"[Brevo API Exception]: {api_err}")

    # 2. Django Email Backend (SMTP or configured backend fallback)
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[to_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        return True
    except Exception as mail_err:
        print(f"[Django Mail Error]: {mail_err}")
        return False


def send_invite_email(
    employee_name: str,
    company_email: str,
    plain_password: str,
    role: str = 'Developer',
    employee_id: int = None,
) -> bool:
    
    subject = f"Welcome to BugTracker, {employee_name}! 🎉"
    from_email = settings.DEFAULT_FROM_EMAIL
    text_content = f"""
Hi {employee_name},

Welcome to the BugTracker team! Your company account has been created by the admin.

Here are your login credentials:

  Company Email    : {company_email}
  Company Password : {plain_password}
  Assigned Role    : {role}

Please log in and change your password as soon as possible.

If you have any questions, contact your admin.

Best regards,
The BugTracker Admin Team
"""

   
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to BugTracker</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7ff;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);
                        padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;
                          letter-spacing:-0.5px;">BugTracker Portal</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
                Employee Onboarding
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e1b4b;">
                Hi {employee_name},&nbsp;👋
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
                Welcome to the team! The admin has created your company account on the
                <strong>BugTracker Portal</strong>. Below are your login credentials.
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f5f3ff;border:1px solid #e0e7ff;border-radius:12px;
                             overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:13px;font-weight:600;
                                color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;">
                      Your Login Credentials
                    </p>
                    <!-- Company Email -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                      <tr>
                        <td style="width:130px;font-size:13px;color:#6b7280;font-weight:500;">
                        Company Email
                        </td>
                        <td style="font-size:14px;font-weight:700;color:#1e1b4b;
                                    font-family:'Courier New',monospace;">
                          {company_email}
                        </td>
                      </tr>
                       <tr>
                         <td style="width:130px;font-size:13px;color:#6b7280;font-weight:500;">
                           Assigned Role
                         </td>
                          <td style="font-size:14px;font-weight:700;color:#1e1b4b;
                          font-family:'Courier New',monospace;">
                          {role}
                         </td>
                         </tr>
                    </table>
                    <!-- Password -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:130px;font-size:13px;color:#6b7280;font-weight:500;">
                          Password
                        </td>
                        <td>
                          <span style="display:inline-block;background:#7c3aed;color:#ffffff;
                                        font-family:'Courier New',monospace;font-size:16px;
                                        font-weight:700;padding:6px 14px;border-radius:6px;
                                        letter-spacing:1px;">
                            {plain_password}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#fff7ed;border-left:4px solid #f97316;
                             border-radius:6px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;font-size:13px;color:#9a3412;line-height:1.6;">
                    ⚠️ <strong>Security Notice:</strong> Please change your password
                    immediately after your first login. Do not share these credentials
                    with anyone.
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
                If you have any questions or issues logging in, please contact your admin directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                        padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                This email was sent by the BugTracker Admin system.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""

    try:
        sent = _dispatch_email(
            to_email=company_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
            recipient_name=employee_name,
        )

        if sent:
            print("\n" + "=" * 60)
            print("[EMAIL SENT SUCCESSFULLY]")
            print(f"   Recipient: {company_email}")
            print(f" mail pass :{plain_password}")
            print("=" * 60 + "\n")

            if employee_id:
                try:
                    from .models import Employee
                    Employee.objects.filter(pk=employee_id).update(invite_sent=True)
                except Exception as db_err:
                    print(f"   [Warning] Could not update invite_sent: {db_err}")

            return True
        else:
            print("\n" + "=" * 60)
            print("[EMAIL FAILED TO SEND]")
            print(f"   Recipient: {company_email}")
            print("=" * 60 + "\n")
            return False

    except Exception as e:
        print("\n" + "=" * 60)
        print("[EMAIL FAILED TO SEND]")
        print(f"   Recipient: {company_email}")
        print(f"   Error    : {e}")
        print("=" * 60 + "\n")
        return False


def send_invite_email_async(
    employee_name: str,
    company_email: str,
    plain_password: str,
    role: str = 'Developer',
    employee_id: int = None,
):
  
    thread = threading.Thread(
        target=send_invite_email,
        kwargs={
            'employee_name': employee_name,
            'company_email': company_email,
            'plain_password': plain_password,
            'role': role,
            'employee_id': employee_id,
        },
        daemon=True,
    )
    thread.start()


def send_temp_password_email(
    employee_name: str,
    email: str,
    temp_password: str,
) -> bool:
    subject = "Temporary Password for BugTracker Portal 🔑"
    from_email = settings.DEFAULT_FROM_EMAIL
    
    text_content = f"""
Hi {employee_name},

You requested a password reset for your BugTracker account.

Here is your temporary password:
   Temporary Password: {temp_password}

Please note:
- This temporary password is valid for only 15 minutes.
- You will be required to change your password immediately upon login.

If you did not request this, please contact your administrator.

Best regards,
The BugTracker Admin Team
"""

    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Temporary Password</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;
                 box-shadow:0 4px 20px rgba(30,41,59,0.06);width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#eef2ff;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#373a5e;font-size:25px;font-weight:600;">
                Password Recovery
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 40px;">

              <p style="margin:0 0 16px;font-size:19px;font-weight:600;color:#374151;">
                Hi {employee_name},
              </p>

              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
                Below is your temporary password. Please log in using this password.
                <strong style="color:#4b5563;">
                  This password is valid for 15 minutes only
                </strong>
                and you will be asked to set a new password immediately.
              </p>

              <!-- Password Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f8fafc;border:1px solid #e2e8f0;
                       border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">

                    <span style="
                      font-size:12px;
                      font-weight:600;
                      color:#64748b;
                      text-transform:uppercase;
                      letter-spacing:0.5px;
                      display:block;
                      margin-bottom:9px;
                    ">
                      Temporary Password
                    </span>

                    <span style="
                      font-size:22px;
                      font-weight:600;
                      color:#334155;
                      font-family:monospace;
                      letter-spacing:1px;
                    ">
                      {temp_password}
                    </span>

                  </td>
                </tr>
              </table>

              <p style="
                font-size:12px;
                color:#9ca3af;
                line-height:1.6;
                margin:0;
              ">
                If you did not request this reset, please contact the admin team immediately.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              background:#fafbfc;
              padding:18px 40px;
              text-align:center;
              border-top:1px solid #f1f5f9;
            ">
              <p style="margin:0;font-size:11px;color:#a1a1aa;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
"""
    try:
        sent = _dispatch_email(
            to_email=email,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
            recipient_name=employee_name,
        )

        if sent:
            print("\n" + "=" * 60)
            print("[EMAIL SENT SUCCESSFULLY]")
            print(f"   To       : {email}")
            print(f"   Temp Pass: {temp_password}")
            print("=" * 60 + "\n")
            return True
        else:
            print("\n" + "=" * 60)
            print("[EMAIL FAILED TO SEND]")
            print(f"   To    : {email}")
            print("=" * 60 + "\n")
            return False

    except Exception as e:
        print("\n" + "=" * 60)
        print("[EMAIL FAILED TO SEND]")
        print(f"   To    : {email}")
        print(f"   Error : {e}")
        print("=" * 60 + "\n")
        return False


def send_temp_password_email_async(
    employee_name: str,
    email: str,
    temp_password: str,
):
    thread = threading.Thread(
        target=send_temp_password_email,
        kwargs={
            'employee_name': employee_name,
            'email': email,
            'temp_password': temp_password,
        },
        daemon=True,
    )
    thread.start()