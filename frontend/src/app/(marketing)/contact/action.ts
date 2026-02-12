"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type ContactState = {
  success: boolean;
  error: string | null;
};

export async function sendContactEmail(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const company = (formData.get("company") as string) || "";
  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;

  if (!name || !email || !subject || !message) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const firstName = name.split(" ")[0];

  try {
    await resend.emails.send({
      from: "DispoSight <no-reply@disposight.com>",
      to: "support@disposight.com",
      replyTo: email,
      subject: `[Contact] ${subject}`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:24px 32px 16px 32px;border-bottom:1px solid #E4E4E7;">
          <span style="font-size:18px;font-weight:700;color:#09090B;letter-spacing:-0.3px;">DispoSight</span>
          <span style="font-size:13px;color:#71717A;margin-left:12px;">Contact Form</span>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:700;color:#09090B;">${subject}</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background-color:#FAFAFA;border-radius:6px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #E4E4E7;">
              <span style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;">From</span><br>
              <span style="font-size:14px;color:#09090B;font-weight:500;">${name}</span>
            </td></tr>
            <tr><td style="padding:12px 16px;${company ? "border-bottom:1px solid #E4E4E7;" : ""}">
              <span style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
              <a href="mailto:${email}" style="font-size:14px;color:#2563EB;text-decoration:none;">${email}</a>
            </td></tr>${company ? `
            <tr><td style="padding:12px 16px;">
              <span style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;">Company</span><br>
              <span style="font-size:14px;color:#09090B;font-weight:500;">${company}</span>
            </td></tr>` : ""}
          </table>
          <p style="margin:0;font-size:15px;color:#3F3F46;line-height:1.7;white-space:pre-line;">${message}</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #E4E4E7;background-color:#FAFAFA;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background-color:#2563EB;border-radius:6px;">
              <a href="mailto:${email}" style="display:inline-block;padding:10px 24px;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;">Reply to ${firstName}</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    });

    return { success: true, error: null };
  } catch {
    return {
      success: false,
      error: "Failed to send message. Please try again or email us directly at support@disposight.com.",
    };
  }
}
