import { handleMail } from '../functions/_shared/mail.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (['/product', '/product-majdool-premium', '/product-majdool-jumbo', '/product-siwi-premium'].includes(pathname)) {
      // Let the asset binding map /product to product.html. Requesting the .html
      // path directly triggers Cloudflare's canonical redirect back to /product.
      url.pathname = '/product';
      return env.ASSETS.fetch(new Request(url, request));
    }
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
