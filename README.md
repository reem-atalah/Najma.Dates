# NjamaDates storefront

A responsive storefront for Najma Dates with product options, an interactive cart, order emails, and a contact form.

## Run locally

Use Node.js 22.9 or newer. Set the Gmail App Password privately in `.env`, install dependencies, and start the server:

```powershell
npm install
npm start
```

Open `http://localhost:3000`. Do not open the HTML files directly; the Node server provides the same-origin order and contact APIs.

## Configure Gmail sending

The server sends both order and contact emails from `reem.atalah1@gmail.com`. Orders and contact messages are delivered to the five team email addresses configured on the server. The team addresses are placed in BCC so recipients do not see one another's addresses. Contact messages use the customer's email as `Reply-To`.

1. Sign in to `reem.atalah1@gmail.com` and enable 2-Step Verification.
2. Create a Google App Password for this application. Gmail SMTP rejects the normal account password; use the 16-character App Password. If Google does not offer App Passwords for this account, use an approved mail provider or hosting email service instead.
3. In the project folder, set `SMTP_USER=reem.atalah1@gmail.com` and `SMTP_APP_PASSWORD` in `.env`. Use the 16-character Google App Password, with no spaces. The server also accepts the source Flask project's `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SERVER`, and `MAIL_PORT` names; Gmail SMTP is the default host and port 587 uses STARTTLS. SMTP connects over IPv4 by default for networks without working IPv6; set `SMTP_LOCAL_ADDRESS` only if your host requires a specific outbound IPv4 address.
4. Restart `npm start` after changing `.env`. Never commit `.env`, put the password in browser code, or share it in chat.
5. For deployment, use a Node.js host with HTTPS and set `SMTP_USER=reem.atalah1@gmail.com` and `SMTP_APP_PASSWORD` in the host's secret/environment-variable settings. Do not upload `.env`. The site and API must use the same origin.
6. Submit a test order and contact message, and verify delivery to the intended inboxes before accepting real customer details.

The server validates order options and prices, validates contact data, rate-limits submissions, sends plain-text email, and does not keep a customer database. Email providers and recipient mail services still process and may retain messages according to their own policies; use HTTPS in production and limit access to the team inboxes. Review Gmail sending limits and Google Workspace policy before relying on Gmail for business-volume email.

The cart email flow is not connected to payment processing. Search and newsletter remain front-end demonstrations.
