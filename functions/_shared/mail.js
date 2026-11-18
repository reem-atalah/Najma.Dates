import catalog from '../../product-catalog.js';
import shipping from '../../shipping-rates.js';
import { Resend } from 'resend';

const sender = 'reem.atalah1@gmail.com';
const recipients = [
  'yousefera2@gmail.com',
  'reem.atalah1@gmail.com',
  'emadatala@yahoo.com',
  'workraghoda@gmail.com',
  'nadaatala1345@gmail.com'
];
const contactTopics = ['استفسار عن طلب', 'استفسار عن منتج', 'التوصيل', 'موضوع آخر'];
const priceOptions = new Map(Object.values(catalog).map((product) => {
  const options = product.options.flatMap((option) => option.children || [option]);
  return [product.name, new Map(options.map((option) => [option.label, option]))];
}));
const requestCounts = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

function cleanText(value, label, maxLength, required = true) {
  if (typeof value !== 'string') throw new Error(`${label} is invalid.`);
  const cleaned = value.replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if ((required && !cleaned) || cleaned.length > maxLength) throw new Error(`${label} is invalid.`);
  return cleaned;
}

function validateOrder(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Order details are invalid.');
  if (payload.consent !== true) throw new Error('Consent is required.');
  const name = cleanText(payload.name, 'Name', 80);
  const phone = String(payload.phone || '').replace(/\D/g, '');
  if (!/^(?:01[0125]\d{8}|201[0125]\d{8}|1[0125]\d{8})$/.test(phone)) throw new Error('Phone number is invalid.');
  const address = cleanText(payload.address, 'Address', 240);
  const region = cleanText(payload.region, 'Delivery region', 40);
  const selectedRegion = shipping.regions[region];
  if (!selectedRegion) throw new Error('Delivery region is invalid.');
  const note = cleanText(payload.note || '', 'Note', 160, false);
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 10) throw new Error('Cart contents are invalid.');
  const items = payload.items.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Cart item is invalid.');
    const itemName = cleanText(item.name, 'Product', 80);
    const variant = cleanText(item.variant || '', 'Option', 80, false);
    const option = priceOptions.get(itemName)?.get(variant);
    if (!option || item.price !== option.price) throw new Error('Product option or price is invalid.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error('Product quantity is invalid.');
    return { name: itemName, variant, price: option.price, weightGrams: option.weightGrams, quantity: item.quantity };
  });
  const weightGrams = items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = shipping.calculateShipping(region, weightGrams, subtotal);
  return { name, phone, address, regionLabel: selectedRegion.label, note, items, weightGrams, subtotal, shippingFee, total: subtotal + shippingFee };
}

function validateContact(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Contact details are invalid.');
  if (payload.consent !== true) throw new Error('Consent is required.');
  const name = cleanText(payload.name, 'Name', 80);
  const email = cleanText(payload.email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email address is invalid.');
  const topic = cleanText(payload.topic, 'Topic', 40);
  if (!contactTopics.includes(topic)) throw new Error('Contact topic is invalid.');
  return { name, email, topic, message: cleanText(payload.message, 'Message', 2000) };
}

function isRateLimited(ip) {
  const now = Date.now();
  const current = (requestCounts.get(ip) || []).filter((timestamp) => now - timestamp < 15 * 60 * 1000);
  if (current.length >= 5) return true;
  current.push(now);
  requestCounts.set(ip, current);
  return false;
}

export async function handleMail(request, env, type) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'This website is not allowed to use the order service.' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Content-Type must be application/json.' }, 415);
  if (Number(request.headers.get('Content-Length')) > 16 * 1024) return json({ error: 'Request body is too large.' }, 413);
  if (isRateLimited(request.headers.get('CF-Connecting-IP') || 'unknown')) return json({ error: 'Too many submissions. Please try again later.' }, 429);

  let payload;
  try { payload = await request.json(); } catch { return json({ error: 'Invalid JSON request.' }, 400); }
  let email;
  try {
    if (type === 'orders') {
      const order = validateOrder(payload);
      const products = order.items.map((item) => `- ${item.name}${item.variant ? ` (${item.variant})` : ''} × ${item.quantity}: ${item.price * item.quantity} جنيه`).join('\n');
      email = {
        subject: 'طلب جديد من متجر نجمة التمور',
        text: ['طلب جديد من متجر نجمة التمور', `الاسم: ${order.name}`, `الهاتف: ${order.phone}`, `منطقة التوصيل: ${order.regionLabel}`, `العنوان: ${order.address}`, `وزن الطلب: ${(order.weightGrams / 1000).toLocaleString('ar-EG')} كجم`, 'المنتجات:', products, `قيمة المنتجات: ${order.subtotal} جنيه`, `الشحن: ${order.shippingFee === 0 ? 'مجاني' : `${order.shippingFee} جنيه`}`, `الإجمالي شامل الشحن: ${order.total} جنيه`, order.note ? `ملاحظة: ${order.note}` : ''].filter(Boolean).join('\n')
      };
    } else {
      const contact = validateContact(payload);
      email = {
        subject: 'رسالة جديدة من صفحة التواصل - نجمة التمور',
        replyTo: contact.email,
        text: ['رسالة جديدة من صفحة التواصل', `الاسم: ${contact.name}`, `البريد الإلكتروني: ${contact.email}`, `الموضوع: ${contact.topic}`, '', contact.message].join('\n')
      };
    }
  } catch (error) { return json({ error: error.message }, 400); }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM) return json({ error: 'Email service is not configured.' }, 503);
  const resend = new Resend(env.RESEND_API_KEY);
  let result;
  try {
    result = await resend.emails.send({ from: env.RESEND_FROM, to: [sender], bcc: recipients, ...email });
  } catch (error) {
    console.error('Resend network request failed.', error);
    return json({ error: 'Email delivery failed. Please try again later.' }, 502);
  }
  if (result.error) {
    console.error('Resend delivery failed.', result.error);
    return json({ error: 'Email delivery failed. Please try again later.' }, 502);
  }
  return json({ ok: true });
}
