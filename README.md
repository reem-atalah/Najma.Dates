# Najma Dates storefront

The storefront is a static Cloudflare Pages site. Order and contact messages are handled by Pages Functions and sent through Resend, so the browser calls the same Cloudflare domain and does not wait for a sleeping Render service.

## Deploy on Cloudflare Pages

Create or update a Pages project using this folder (`Najma.Dates`) as its project root. Set the build command to blank and the build output directory to `.`. The `functions/` directory must be at the project root so Cloudflare deploys `/api/orders` and `/api/contact` with the static files.

## Configure Resend

1. Add and verify the sending domain in Resend. Use the DNS records Resend provides for that domain; keep the existing MX records for your mailbox unless Resend's instructions specifically require a change.
2. Create a Resend API key.
3. In Cloudflare Pages, open **Settings → Variables and Secrets** and add these as production secrets/variables:
   - `RESEND_API_KEY`: the Resend API key.
   - `RESEND_FROM`: a sender address on the domain verified in Resend, for example `Najma Dates <orders@your-verified-domain>`.
4. Redeploy the Pages project after adding the values.
5. Submit a test contact message and order, and verify that the team inboxes receive them.

Do not put the Resend key in browser code or commit it to the project. Resend only sends email; Cloudflare Pages hosts the website and runs the API functions.

## Local development

Run `npm install`, then `npm start` with Node.js 22.9 or newer to serve the storefront and its API locally. Set `RESEND_API_KEY` and `RESEND_FROM` in a private `.env` file. The local Node server and deployed Pages Functions use the Resend Node.js SDK and the same settings.

The API validates order options and prices, validates contact data, rate-limits submissions, and sends plain-text email. It does not keep a customer database. The cart email flow is not connected to payment processing, and search and newsletter remain front-end demonstrations.
