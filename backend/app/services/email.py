import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def _base_template(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">SyncUp</h1>
              <p style="margin:8px 0 0;color:#e0e7ff;font-size:14px;">Project management, in sync</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">
                &copy; SyncUp. You received this email because of activity on your account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _send_email(to_email: str, subject: str, html_body: str) -> None:
    if not settings.brevo_smtp_user or not settings.brevo_smtp_password:
        logger.warning("Brevo SMTP not configured; skipping email to %s", to_email)
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{settings.brevo_from_name} <{settings.brevo_from_email}>"
    message["To"] = to_email
    message.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.brevo_smtp_host, settings.brevo_smtp_port, timeout=30) as server:
            server.starttls()
            server.login(settings.brevo_smtp_user, settings.brevo_smtp_password)
            server.sendmail(settings.brevo_from_email, [to_email], message.as_string())
        logger.info("Email sent to %s: %s", to_email, subject)
    except smtplib.SMTPException:
        logger.exception("Failed to send email to %s", to_email)


def send_workspace_invite_email(
    *,
    to_email: str,
    invitee_name: str,
    workspace_name: str,
    inviter_name: str,
    role: str,
) -> None:
    workspace_url = f"{settings.frontend_url.rstrip('/')}/workspaces"
    body = f"""
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;">You've been invited to a workspace</h2>
      <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
        Hi <strong>{invitee_name}</strong>,<br/>
        <strong>{inviter_name}</strong> added you to <strong>{workspace_name}</strong> as <strong>{role}</strong>.
      </p>
      <a href="{workspace_url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
        Open SyncUp
      </a>
    """
    html = _base_template("Workspace invitation", body)
    _send_email(to_email, f"Invitation to {workspace_name} on SyncUp", html)


def send_task_assigned_email(
    *,
    to_email: str,
    assignee_name: str,
    task_title: str,
    project_name: str,
    assigner_name: str,
    due_date: str | None,
    priority: str,
) -> None:
    """Auto-generated Brevo SMTP notification for task assignments."""
    dashboard_url = f"{settings.frontend_url.rstrip('/')}/"
    due_display = due_date if due_date else "Not set"
    priority_label = priority.replace("_", " ").title()
    body = f"""
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:22px;">You have a new task</h2>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
        Hi <strong>{assignee_name}</strong>,<br/>
        <strong>{assigner_name}</strong> assigned you a task in project
        <strong style="color:#4f46e5;">{project_name}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Task</p>
            <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f172a;">{task_title}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
                  <span style="color:#64748b;font-size:13px;">Project</span><br/>
                  <strong style="color:#0f172a;">{project_name}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
                  <span style="color:#64748b;font-size:13px;">Priority</span><br/>
                  <strong style="color:#7c3aed;">{priority_label}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
                  <span style="color:#64748b;font-size:13px;">Due date</span><br/>
                  <strong style="color:#0f172a;">{due_display}</strong>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <a href="{dashboard_url}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Open SyncUp Dashboard
      </a>
    """
    html = _base_template("Task assignment — SyncUp", body)
    _send_email(to_email, f"[SyncUp] Task assigned: {task_title}", html)


def send_project_lead_assigned_email(
    *,
    to_email: str,
    lead_name: str,
    project_name: str,
    assigner_name: str,
) -> None:
    project_url = f"{settings.frontend_url.rstrip('/')}/projects"
    body = f"""
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:22px;">You are the project lead</h2>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
        Hi <strong>{lead_name}</strong>,<br/>
        <strong>{assigner_name}</strong> assigned you as project lead for
        <strong style="color:#4f46e5;">{project_name}</strong>.
      </p>
      <a href="{project_url}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Open SyncUp Projects
      </a>
    """
    html = _base_template("Project lead assignment — SyncUp", body)
    _send_email(to_email, f"[SyncUp] Project lead: {project_name}", html)


def send_onboarding_email(
    *,
    to_email: str,
    project_name: str,
    assigner_name: str,
) -> None:
    signup_url = f"{settings.frontend_url.rstrip('/')}/sign-up?email={to_email}"
    body = f"""
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:22px;">Welcome to SyncUp!</h2>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
        Hi there,<br/>
        <strong>{assigner_name}</strong> has assigned you a task on the project <strong>{project_name}</strong>.
        Since you don't have a SyncUp account yet, we've created a pending workspace slot for you.
      </p>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
        Click the link below to sign up and join your team:
      </p>
      <a href="{signup_url}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Join & Accept Task on SyncUp
      </a>
    """
    html = _base_template("Welcome to SyncUp!", body)
    _send_email(to_email, f"[SyncUp] Onboarding: Invitation to join project {project_name}", html)
