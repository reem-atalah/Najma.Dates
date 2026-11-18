import { handleMail } from '../functions/_shared/mail.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/orders') return handleMail(request, env, 'orders');
    if (pathname === '/api/contact') return handleMail(request, env, 'contact');
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
    return env.ASSETS.fetch(request);
  }
};
