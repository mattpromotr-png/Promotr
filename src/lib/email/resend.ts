import "server-only";

type BookingEmail = {
  bookingId: string;
  email: string;
  guestName: string;
  bookingDate: string;
  tableName: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] || character,
  );
}

export async function sendBookingManagementEmail(details: BookingEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !appUrl)
    return { sent: false, reason: "not_configured" } as const;

  const { createBookingManageToken } =
    await import("@/lib/bookings/manage-token");
  const token = createBookingManageToken(details.bookingId);
  const manageUrl = `${appUrl}/book/manage/${details.bookingId}?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `promotr-booking-${details.bookingId}`,
    },
    body: JSON.stringify({
      from,
      to: [details.email],
      subject: `Manage your Promotr booking for ${details.bookingDate}`,
      text: `Hi ${details.guestName}, your table booking for ${details.bookingDate} is recorded. Manage or cancel it using this private link: ${manageUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17131f"><h1>Your Promotr booking</h1><p>Hi ${escapeHtml(details.guestName)},</p><p>Your booking for <strong>${escapeHtml(details.bookingDate)}</strong> at <strong>${escapeHtml(details.tableName)}</strong> is recorded.</p><p><a href="${manageUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Manage booking</a></p><p style="font-size:12px;color:#6b6475">Keep this private link secure. Changes remain subject to table availability and venue policy.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
  return { sent: true } as const;
}
