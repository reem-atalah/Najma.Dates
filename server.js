const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { Resend } = require('resend');
const productCatalog = require('./product-catalog');
const shipping = require('./shipping-rates');

const root = __dirname;

function loadEnvFile() {
  let contents;
  try {
    contents = fs.readFileSync(path.join(root, '.env'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  contents.split(/\r?\n/).forEach((line) => {
    const entry = line.trim();
    if (!entry || entry.startsWith('#')) return;
    const match = entry.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) return;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  });
}

loadEnvFile();

const emailRecipients = [
  'emadatala@yahoo.com',
  'workraghoda@gmail.com',
  'nadaatala1345@gmail.com'
];
const contactTopics = ['استفسار عن طلب', 'استفسار عن منتج', 'التوصيل', 'موضوع آخر'];
const productPrices = new Map(Object.values(productCatalog).map((product) => {
  const options = product.options
    ? product.options.flatMap((option) => option.children || [option])
    : [{ label: '', price: product.price, weightGrams: product.weightGrams }];
  return [product.name, new Map(options.map((option) => [option.label, option]))];
}));
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};
const requestCounts = new Map();
const maxRequestBytes = 16 * 1024;
const maxRequestsPerWindow = 5;
const rateLimitWindowMs = 15 * 60 * 1000;

function respondJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(value));
}

function getAllowedOrigin(origin) {
  if (!origin) return null;
  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return null;
  }
  if (parsedOrigin.protocol === 'https:' && parsedOrigin.hostname.endsWith('.pages.dev')) {
    return origin;
  }
  if (process.env.NODE_ENV !== 'production'
    && parsedOrigin.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname)) {
    return origin;
  }
  const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configuredOrigins.includes(origin) ? origin : null;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > maxRequestBytes) {
        tooLarge = true;
        body = '';
      }
    });
    request.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Invalid JSON request.'), { status: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function cleanText(value, label, maxLength, required = true) {
  if (typeof value !== 'string') throw new TypeError(`${label} is invalid.`);
  const cleaned = value.replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if ((required && !cleaned) || cleaned.length > maxLength) {
    throw new TypeError(`${label} is invalid.`);
  }
  return cleaned;
}

function validateOrder(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Order details are invalid.');
  }
  const name = cleanText(payload.name, 'Name', 80);
  const orderNumber = cleanText(payload.orderNumber || '', 'Order number', 40);
  const phone = String(payload.phone || '').replace(/\D/g, '');
  if (!/^(?:01[0125]\d{8}|201[0125]\d{8}|1[0125]\d{8})$/.test(phone)) {
    throw new TypeError('Phone number is invalid.');
  }
  const address = cleanText(payload.address, 'Address', 240);
  const region = cleanText(payload.region, 'Delivery region', 40);
  const selectedRegion = shipping.regions[region];
  if (!selectedRegion) throw new TypeError('Delivery region is invalid.');
  const note = cleanText(payload.note || '', 'Note', 160, false);
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 10) {
    throw new TypeError('Cart contents are invalid.');
  }

  const items = payload.items.map((item) => {
    if (!item || typeof item !== 'object') throw new TypeError('Cart item is invalid.');
    const itemName = cleanText(item.name, 'Product', 80);
    const variant = cleanText(item.variant || '', 'Option', 80, false);
    const option = productPrices.get(itemName)?.get(variant);
    if (!option || option.soldOut || item.price !== option.price) throw new TypeError('Product option is unavailable or its price is invalid.');
    if (!Number.isInteger(option.weightGrams) || option.weightGrams < 1) {
      throw new TypeError('Product weight is not configured.');
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new TypeError('Product quantity is invalid.');
    }
    return { name: itemName, variant, price: option.price, weightGrams: option.weightGrams, quantity: item.quantity };
  });

  const weightGrams = items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = shipping.calculateShipping(region, weightGrams, subtotal);
  return {
    name,
    orderNumber,
    phone,
    address,
    region,
    regionLabel: selectedRegion.label,
    note,
    items,
    weightGrams,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee
  };
}

function validateContact(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Contact details are invalid.');
  }
  if (payload.consent !== true) throw new TypeError('Consent is required.');
  const name = cleanText(payload.name, 'Name', 80);
  const email = cleanText(payload.email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TypeError('Email address is invalid.');
  const topic = cleanText(payload.topic, 'Topic', 40);
  if (!contactTopics.includes(topic)) throw new TypeError('Contact topic is invalid.');
  const message = cleanText(payload.message, 'Message', 2000);
  return { name, email, topic, message };
}

async function sendWithResend(message) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    throw Object.assign(new Error('Email service is not configured.'), { status: 503 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  let result;
  try {
    result = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: message.to,
      bcc: message.bcc,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text
    })
  } catch (cause) {
    const causeMessage = cause instanceof Error ? cause.message : 'Unknown network error.';
    const error = new Error(`Resend network request failed: ${causeMessage}`);
    error.cause = cause;
    throw error;
  }
  if (result.error) {
    const error = new Error(result.error.message || 'Resend could not send the email.');
    error.code = result.error.name;
    throw error;
  }
}

function describeMailError(error, depth = 0) {
  if (!error || depth > 2) return undefined;
  const details = {};
  for (const key of ['name', 'message', 'code', 'command', 'errno', 'syscall', 'address', 'port', 'responseCode', 'response', 'stack']) {
    if (error[key] !== undefined) details[key] = error[key];
  }
  if (error.cause) details.cause = describeMailError(error.cause, depth + 1);
  if (Array.isArray(error.errors)) {
    details.errors = error.errors.slice(0, 3).map((nestedError) => describeMailError(nestedError, depth + 1));
  }
  return details;
}

function isRateLimited(ipAddress) {
  const now = Date.now();
  requestCounts.forEach((timestamps, address) => {
    const activeTimestamps = timestamps.filter((timestamp) => now - timestamp < rateLimitWindowMs);
    if (activeTimestamps.length) requestCounts.set(address, activeTimestamps);
    else requestCounts.delete(address);
  });
  const requests = (requestCounts.get(ipAddress) || []).filter((timestamp) => now - timestamp < rateLimitWindowMs);
  if (requests.length >= maxRequestsPerWindow) {
    requestCounts.set(ipAddress, requests);
    return true;
  }
  requests.push(now);
  requestCounts.set(ipAddress, requests);
  return false;
}

async function handleMailRequest(request, response, sendMail, createMessage) {
  if (isRateLimited(request.socket.remoteAddress || 'unknown')) {
    respondJson(response, 429, { error: 'Too many submissions. Please try again later.' });
    return;
  }

  let message;
  try {
    message = await createMessage(await readRequestBody(request));
  } catch (error) {
    if (response.destroyed || response.writableEnded) return;
    respondJson(response, error.status || 400, { error: error.message });
    return;
  }

  try {
    await sendMail(message);
    respondJson(response, 200, { ok: true });
  } catch (error) {
    if (response.destroyed || response.writableEnded) return;
    if (error.status) {
      respondJson(response, error.status, { error: error.message });
      return;
    }
    console.error('Email delivery failed.', JSON.stringify(describeMailError(error)));
    const detail = String(error.message || 'Email delivery failed.')
      .replace(/re_[A-Za-z0-9_-]+/g, '[redacted]')
      .slice(0, 240);
    respondJson(response, 502, { error: detail });
  }
}

function createServer({ sendMail: sendMailOverride } = {}) {
  const sendMail = sendMailOverride || sendWithResend;
  const orderMessage = async (payload) => {
    const order = validateOrder(payload);
    const products = order.items.map((item) => {
      const option = item.variant ? ` (${item.variant})` : '';
      return `- ${item.name}${option} × ${item.quantity}: ${item.price * item.quantity} جنيه`;
    }).join('\n');
    return {
      to: emailRecipients[0],
      bcc: emailRecipients.slice(1),
      subject: `طلب جديد ${order.orderNumber} من متجر نجمة التمور`,
      text: [
        `رقم الطلب: ${order.orderNumber}`,
        'طلب جديد من متجر نجمة التمور',
        `الاسم: ${order.name}`,
        `الهاتف: ${order.phone}`,
        `منطقة التوصيل: ${order.regionLabel}`,
        `العنوان: ${order.address}`,
        `وزن الطلب: ${(order.weightGrams / 1000).toLocaleString('en-US')} كجم`,
        'المنتجات:',
        products,
        `قيمة المنتجات: ${order.subtotal} جنيه`,
        `الشحن: ${order.shippingFee === 0 ? 'مجاني' : `${order.shippingFee} جنيه`}`,
        `الإجمالي شامل الشحن: ${order.total} جنيه`,
        order.note ? `ملاحظة: ${order.note}` : ''
      ].filter(Boolean).join('\n')
    };
  };
  const contactMessage = async (payload) => {
    const contact = validateContact(payload);
    return {
      to: emailRecipients[0],
      bcc: emailRecipients.slice(1),
      replyTo: contact.email,
      subject: 'رسالة جديدة من صفحة التواصل - نجمة التمور',
      text: [
        'رسالة جديدة من صفحة التواصل',
        `الاسم: ${contact.name}`,
        `البريد الإلكتروني: ${contact.email}`,
        `الموضوع: ${contact.topic}`,
        '',
        contact.message
      ].join('\n')
    };
  };

  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    if (requestUrl.pathname === '/api/orders' || requestUrl.pathname === '/api/contact') {
      const origin = request.headers.origin;
      const allowedOrigin = getAllowedOrigin(origin);
      if (origin && !allowedOrigin) {
        respondJson(response, 403, { error: 'This website is not allowed to use the order service.' });
        return;
      }
      if (allowedOrigin) {
        response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        response.setHeader('Vary', 'Origin');
      }
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'Cache-Control': 'no-store' });
        response.end();
        return;
      }
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        respondJson(response, 405, { error: 'Method not allowed.' });
        return;
      }
      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
        respondJson(response, 415, { error: 'Content-Type must be application/json.' });
        return;
      }
      const createMessage = requestUrl.pathname === '/api/orders' ? orderMessage : contactMessage;
      await handleMailRequest(request, response, sendMail, createMessage);
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD, POST');
      respondJson(response, 405, { error: 'Method not allowed.' });
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const cleanProductPaths = new Set(['/product-majdool-premium', '/product-majdool-jumbo', '/product-siwi-premium']);
    const requestedPath = pathname === '/' ? '/index.html'
      : cleanProductPaths.has(pathname) ? '/product.html' : pathname;
    const filePath = path.resolve(root, `.${requestedPath}`);
    const extension = path.extname(filePath).toLowerCase();
    const forbiddenFiles = new Set(['.env', '.env.example', 'package.json', 'server.js', 'README.md']);
    if (
      !filePath.startsWith(`${root}${path.sep}`)
      || forbiddenFiles.has(path.basename(filePath))
      || !mimeTypes[extension]
    ) {
      response.writeHead(404).end();
      return;
    }
    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
        return;
      }
      response.writeHead(200, {
        'Content-Type': mimeTypes[extension],
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => {
    console.log(`NajmaDates storefront listening on port ${server.address().port}.`);
  });
}

module.exports = { createServer, validateContact, validateOrder };
