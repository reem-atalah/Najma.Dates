import { handleMail } from '../functions/_shared/mail.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === '/product') {
      const variants = {
        'jumbo-1k': '/product-majdool-premium',
        'jumbo-1kg': '/product-majdool-premium',
        'large-1kg': '/product-majdool-premium',
        'family-large': '/product-majdool-premium',
        'family-jumbo': '/product-majdool-premium',
        '800g': '/product-majdool-jumbo',
        'jumbo-saver': '/product-majdool-jumbo',
        '5kg': '/product-siwi-premium',
        '3kg': '/product-siwi-premium',
        '1400g': '/product-siwi-premium',
        '700g': '/product-siwi-premium'
      };
      const variant = url.searchParams.get('variant')
        || [...url.searchParams.keys()].find((key) => key !== 'product');
      const destination = variants[variant];
      if (destination) {
        url.pathname = destination;
        return Response.redirect(url, 302);
      }
    }
    if (['/product', '/product-majdool-premium', '/product-majdool-jumbo', '/product-siwi-premium'].includes(pathname)) {
      url.pathname = '/product.html';
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
