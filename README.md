# Najma Dates storefront

This project runs as a Cloudflare Worker with static assets. The Worker serves the storefront and handles `/api/orders` and `/api/contact`; both APIs send mail through the Resend Node.js SDK.

## Cloudflare Worker build settings

For this repository layout, configure the Worker build as follows:

- Root directory: `/Najma.Dates` (if this folder is at the repository root)
- Build command: `npm install`
- Deploy command: `npm run deploy`

Do not use `npm start` as the deploy command. It starts a local Node.js server that stays open, so Cloudflare waits for it until the build times out. The `deploy` script runs Wrangler and publishes the Worker described in `wrangler.jsonc`.

The Worker name in `wrangler.jsonc` must exactly match the Worker name in the Cloudflare dashboard. It is currently set to `najma-dates`; if your Worker has another name, update the `name` value in `wrangler.jsonc` to match before deploying.

## Resend secrets

1. Verify your sending domain in Resend and use its DNS instructions. Keep existing mailbox MX records unless Resend explicitly tells you to change them.
2. In the Worker dashboard, add these under **Settings → Variables and Secrets** as runtime secrets/variables:
   - `RESEND_API_KEY`: your Resend API key.
   - `RESEND_FROM`: a sender address on the domain verified in Resend, such as `Najma Dates <orders@your-verified-domain>`.
3. Remove the old `SMTP_USER` and `SMTP_APP_PASSWORD` build variables; this Worker uses Resend instead.
4. Deploy, then submit a test contact message and order and confirm receipt in the team inboxes.

Do not put the Resend API key in browser code or commit it. Resend sends the email; Cloudflare Workers serves the site and runs the APIs.

## Local development

Use Node.js 22.12 or newer. Set `RESEND_API_KEY` and `RESEND_FROM` in a private `.env` file for the local Node server, then run `npm install` and `npm start`. To run the Worker locally with Wrangler, use `npm run dev` and provide the secrets through Wrangler's local development variables.

The API validates order options and prices, validates contact data, rate-limits submissions, sends plain-text email, and does not keep a customer database. The cart email flow is not connected to payment processing; search and newsletter remain front-end demonstrations.
