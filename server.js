const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const nodemailer = require('nodemailer');
const productCatalog = require('./product-catalog');

const root = __dirname;
const emailSender = 'najma.dates@gmail.com';
const emailRecipients = [
  'yousefera2@gmail.com',
  'reem.attallah1@gmail.com',
  'emadatala@yahoo.com',
  'workraghoda@gmail.com',
  'nadaatala1345@gmail.com'
];
const contactTopics = ['استفسار عن طلب', 'استفسار عن منتج', 'التوصيل', 'موضوع آخر'];
const productPrices = new Map(Object.values(productCatalog).map((product) => {
  const options = product.options
    ? product.options.flatMap((option) => option.children || [option])
    : [{ label: '', price: product.price }];
  return [product.name, new Map(options.map((option) => [option.label, option.price]))];
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
  if (payload.consent !== true) throw new TypeError('Consent is required.');

  const name = cleanText(payload.name, 'Name', 80);
  const phone = String(payload.phone || '').replace(/\D/g, '');
  if (!/^(?:01[0125]\d{8}|201[0125]\d{8}|1[0125]\d{8})$/.test(phone)) {
    throw new TypeError('Phone number is invalid.');
  }
  const address = cleanText(payload.address, 'Address', 240);
  const note = cleanText(payload.note || '', 'Note', 160, false);
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
    throw new TypeError('Requested amount is invalid.');
  }
  if (!['kg', 'g'].includes(payload.unit)) throw new TypeError('Requested unit is invalid.');
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 10) {
    throw new TypeError('Cart contents are invalid.');
  }

  const items = payload.items.map((item) => {
    if (!item || typeof item !== 'object') throw new TypeError('Cart item is invalid.');
    const itemName = cleanText(item.name, 'Product', 80);
    const variant = cleanText(item.variant || '', 'Option', 80, false);
    const price = productPrices.get(itemName)?.get(variant);
    if (price === undefined || item.price !== price) throw new TypeError('Product option or price is invalid.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new TypeError('Product quantity is invalid.');
    }
    return { name: itemName, variant, price, quantity: item.quantity };
  });

  return {
    name,
    phone,
    address,
    note,
    amount,
    unit: payload.unit,
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
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

function getMailConfig() {
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_APP_PASSWORD;
  if (username !== emailSender || !password) return null;
  return { username, password };
}

let mailTransport;
let mailTransportPassword;
function getMailTransport(config) {
  if (!mailTransport || mailTransportPassword !== config.password) {
    mailTransport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: config.username, pass: config.password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true
    });
    mailTransportPassword = config.password;
  }
  return mailTransport;
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
    console.error('Email delivery failed.', { code: error.code || 'unknown' });
    respondJson(response, 502, { error: 'Email delivery failed. Please try again later.' });
  }
}

function createServer({ sendMail: sendMailOverride } = {}) {
  const sendMail = sendMailOverride || (async (message) => {
    const config = getMailConfig();
    if (!config) throw Object.assign(new Error('Email service is not configured.'), { status: 503 });
    await getMailTransport(config).sendMail(message);
  });
  const orderMessage = async (payload) => {
    const order = validateOrder(payload);
    const products = order.items.map((item) => {
      const option = item.variant ? ` (${item.variant})` : '';
      return `- ${item.name}${option} × ${item.quantity}: ${item.price * item.quantity} جنيه`;
    }).join('\n');
    return {
      from: emailSender,
      to: emailSender,
      bcc: emailRecipients,
      subject: 'طلب جديد من متجر نجمة التمور',
      text: [
        'طلب جديد من متجر نجمة التمور',
        `الاسم: ${order.name}`,
        `الهاتف: ${order.phone}`,
        `العنوان: ${order.address}`,
        `الكمية المطلوبة: ${order.amount} ${order.unit === 'kg' ? 'كجم' : 'جم'}`,
        'المنتجات:',
        products,
        `الإجمالي: ${order.total} جنيه`,
        order.note ? `ملاحظة: ${order.note}` : ''
      ].filter(Boolean).join('\n')
    };
  };
  const contactMessage = async (payload) => {
    const contact = validateContact(payload);
    return {
      from: emailSender,
      to: emailSender,
      bcc: emailRecipients,
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
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
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
