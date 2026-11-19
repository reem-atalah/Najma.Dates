import catalog from '../../product-catalog.js';
import shipping from '../../shipping-rates.js';
import { Resend } from 'resend';

const sender = 'reem.atalah1@gmail.com';
const recipients = [
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function orderEmailHtml(order, logoUrl, customer = false) {
  const rows = order.items.map((item) => `<tr><td style="padding:13px 10px;border-bottom:1px solid #eee8dc;color:#263d2e">${escapeHtml(item.name)}${item.variant ? `<br><span style="color:#817968;font-size:12px">${escapeHtml(item.variant)}</span>` : ''}</td><td style="padding:13px 10px;border-bottom:1px solid #eee8dc;text-align:center;color:#5b574e">${item.quantity}</td><td style="padding:13px 10px;border-bottom:1px solid #eee8dc;text-align:left;white-space:nowrap;color:#263d2e">${(item.price * item.quantity).toLocaleString('ar-EG')} جنيه</td></tr>`).join('');
  const customerDetails = customer ? '' : `<tr><td style="padding:8px 0;color:#817968">الاسم</td><td style="padding:8px 0;text-align:left;color:#263d2e">${escapeHtml(order.name)}</td></tr><tr><td style="padding:8px 0;color:#817968">الهاتف</td><td style="padding:8px 0;text-align:left;color:#263d2e">${escapeHtml(order.phone)}</td></tr>${order.email ? `<tr><td style="padding:8px 0;color:#817968">البريد الإلكتروني</td><td style="padding:8px 0;text-align:left;color:#263d2e">${escapeHtml(order.email)}</td></tr>` : ''}<tr><td style="padding:8px 0;color:#817968">منطقة التوصيل</td><td style="padding:8px 0;text-align:left;color:#263d2e">${escapeHtml(order.regionLabel)}</td></tr><tr><td style="padding:8px 0;color:#817968">العنوان</td><td style="padding:8px 0;text-align:left;color:#263d2e">${escapeHtml(order.address)}</td></tr>${order.note ? `<tr><td style="padding:8px 0;color:#817968">ملاحظة</td><td style="padding:8px 0;text-align:left;color:#263d2e">${escapeHtml(order.note)}</td></tr>` : ''}`;
  const greeting = customer ? `شكرًا لثقتكم بنا${order.name ? ` يا ${escapeHtml(order.name)}` : ''}. استلمنا طلبكم، وهذه تفاصيله:` : 'وصل طلب جديد إلى متجر نجمة التمور.';
  return `<div dir="rtl" style="margin:0;background:#f7f4ec;padding:30px 12px;font-family:Arial,Tahoma,sans-serif;color:#263d2e"><div style="max-width:620px;margin:0 auto;background:#fffefa;border:1px solid #e9e1d2"><div style="padding:28px 30px 22px;text-align:center;border-bottom:1px solid #eee8dc"><img src="${escapeHtml(logoUrl)}" alt="نجمة التمور" width="126" style="display:block;width:126px;height:auto;margin:0 auto 16px"><div style="color:#a57640;font-size:10px;letter-spacing:3px">NAJMA DATES · نجمة التمور</div></div><div style="padding:30px"><div style="width:36px;border-top:2px solid #c8a55f;margin:0 0 17px"></div><h1 style="font-family:Georgia,serif;font-weight:400;font-size:27px;line-height:1.4;margin:0 0 12px;color:#263d2e">${customer ? 'تفاصيل طلبكم' : 'طلب جديد'}</h1><p style="margin:0 0 25px;color:#686b5c;line-height:1.9;font-size:14px">${greeting}</p>${customerDetails ? `<h2 style="font-size:15px;margin:0 0 8px;color:#263d2e">بيانات الطلب</h2><table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:25px">${customerDetails}</table>` : ''}<h2 style="font-size:15px;margin:0 0 8px;color:#263d2e">المنتجات</h2><table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f7f4ec"><th style="padding:10px;text-align:right;font-weight:600">المنتج</th><th style="padding:10px;text-align:center;font-weight:600">الكمية</th><th style="padding:10px;text-align:left;font-weight:600">السعر</th></tr></thead><tbody>${rows}</tbody></table><table role="presentation" style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13px"><tr><td style="padding:7px 0;color:#817968">قيمة المنتجات</td><td style="padding:7px 0;text-align:left">${order.subtotal.toLocaleString('ar-EG')} جنيه</td></tr><tr><td style="padding:7px 0;color:#817968">الشحن</td><td style="padding:7px 0;text-align:left">${order.shippingFee === 0 ? 'مجاني' : `${order.shippingFee.toLocaleString('ar-EG')} جنيه`}</td></tr><tr><td style="padding:13px 0;border-top:1px solid #d9cba9;font-weight:700;font-size:15px">الإجمالي</td><td style="padding:13px 0;border-top:1px solid #d9cba9;text-align:left;font-weight:700;font-size:15px;color:#9a673e">${order.total.toLocaleString('ar-EG')} جنيه</td></tr></table><p style="margin:25px 0 0;padding-top:18px;border-top:1px solid #eee8dc;color:#817968;font-size:12px;line-height:1.8">${customer ? 'سنعاود التواصل معكم لتأكيد الطلب. لأي استفسار، يسعدنا تواصلكم معنا.' : `وزن الطلب: ${(order.weightGrams / 1000).toLocaleString('ar-EG')} كجم`}</p></div><div style="padding:17px 25px;background:#263d2e;color:#f8f6ea;text-align:center;font-size:11px;letter-spacing:.5px">طعام طيب نزرعه بعناية · من مزرعتنا إلى مائدتكم</div></div></div>`;
}

function validateOrder(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Order details are invalid.');
  const name = cleanText(payload.name, 'Name', 80);
  const phone = String(payload.phone || '').replace(/\D/g, '');
  if (!/^(?:01[0125]\d{8}|201[0125]\d{8}|1[0125]\d{8})$/.test(phone)) throw new Error('Phone number is invalid.');
  const address = cleanText(payload.address, 'Address', 240);
  const email = cleanText(payload.email || '', 'Email', 254, false).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email address is invalid.');
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
  return { name, phone, email, address, regionLabel: selectedRegion.label, note, items, weightGrams, subtotal, shippingFee, total: subtotal + shippingFee };
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
  let orderConfirmation;
  try {
    if (type === 'orders') {
      const order = validateOrder(payload);
      orderConfirmation = order;
      const logoUrl = new URL('/logo%20bg%20removed.png', request.url).href;
      const products = order.items.map((item) => `- ${item.name}${item.variant ? ` (${item.variant})` : ''} × ${item.quantity}: ${item.price * item.quantity} جنيه`).join('\n');
      email = {
        subject: 'طلب جديد من متجر نجمة التمور',
        replyTo: order.email || undefined,
        html: orderEmailHtml(order, logoUrl),
        text: ['طلب جديد من متجر نجمة التمور', `الاسم: ${order.name}`, `الهاتف: ${order.phone}`, order.email ? `البريد الإلكتروني: ${order.email}` : '', `منطقة التوصيل: ${order.regionLabel}`, `العنوان: ${order.address}`, `وزن الطلب: ${(order.weightGrams / 1000).toLocaleString('ar-EG')} كجم`, 'المنتجات:', products, `قيمة المنتجات: ${order.subtotal} جنيه`, `الشحن: ${order.shippingFee === 0 ? 'مجاني' : `${order.shippingFee} جنيه`}`, `الإجمالي شامل الشحن: ${order.total} جنيه`, order.note ? `ملاحظة: ${order.note}` : ''].filter(Boolean).join('\n')
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
  if (type === 'orders' && orderConfirmation?.email) {
    try {
      const logoUrl = new URL('/logo%20bg%20removed.png', request.url).href;
      const confirmation = await resend.emails.send({ from: env.RESEND_FROM, to: [orderConfirmation.email], subject: 'تفاصيل طلبكم من نجمة التمور', html: orderEmailHtml(orderConfirmation, logoUrl, true), text: `شكرًا لثقتكم بنا. استلمنا طلبكم بإجمالي ${orderConfirmation.total} جنيه شامل الشحن. سنعاود التواصل معكم لتأكيد الطلب.` });
      if (confirmation.error) console.error('Customer order confirmation failed.', confirmation.error);
    } catch (error) {
      console.error('Customer order confirmation failed.', error);
    }
  }
  return json({ ok: true });
}
