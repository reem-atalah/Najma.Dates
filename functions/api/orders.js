import { handleMail } from '../_shared/mail.js';

export function onRequest(context) {
  return handleMail(context.request, context.env, 'orders');
}
