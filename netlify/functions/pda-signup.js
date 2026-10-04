'use strict';
const BOOK_TAGS = require('../../config/pda-book-tags.json');
const apiHost = () => (process.env.ACTIVE_CAMPAIGN_API_URL || '').replace(/\/+$/, '');
const FORM_URL = 'https://dorsland37461.activehosted.com/proc.php';
const reply = (statusCode, data) => ({statusCode, headers: {'Content-Type':'application/json', 'Cache-Control':'no-store'}, body:JSON.stringify(data)});
const ready = () => /^https:\/\/[a-z0-9-]+\.api-us[0-9]+\.com$/.test(apiHost()) && Boolean(process.env.ACTIVE_CAMPAIGN_API_KEY);
async function api(path, options = {}) {
  const response = await fetch(`${apiHost()}/api/3${path}`, {...options, headers:{'Api-Token':process.env.ACTIVE_CAMPAIGN_API_KEY, 'Content-Type':'application/json'}, signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error('ActiveCampaign unavailable');
  return response.json();
}
async function tagId(name) {
  const result = await api(`/tags?${new URLSearchParams({'filters[search][eq]':name,limit:'100'})}`);
  const existing = result.tags?.find(tag => tag.tag === name);
  if (existing) return String(existing.id);
  const created = await api('/tags', {method:'POST',body:JSON.stringify({tag:{tag:name,tagType:'contact',description:'Puzzle Discovery Academy signup'}})});
  if (!created.tag?.id) throw new Error('Missing tag');
  return String(created.tag.id);
}
exports.handler = async event => {
  if (event.httpMethod === 'GET') return reply(ready() ? 200 : 503, {ready:ready()});
  if (event.httpMethod !== 'POST') return reply(405,{message:'Method not allowed.'});
  const origin = event.headers?.origin;
  if (origin && !['https://peterkelby.com','https://www.peterkelby.com','https://peterkelby.netlify.app'].includes(origin)) return reply(403,{message:'Please use the signup page on peterkelby.com.'});
  if (!ready()) return reply(503,{message:'Signup is temporarily unavailable. Please try again later.'});
  let data;
  try {
    if (!event.body || event.body.length > 4096) return reply(400,{message:'Invalid request.'});
    data = JSON.parse(event.body);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
  } catch {return reply(400,{message:'Invalid request.'});}
  if (data.website) return reply(400,{message:'Unable to submit this form.'});
  const firstName = typeof data.firstName === 'string' ? data.firstName.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const book = typeof data.book === 'string' ? data.book.trim() : '';
  if (!firstName || firstName.length > 100 || /[\r\n]/.test(firstName) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400,{message:'Please enter your first name and a valid email address.'});
  if (book.length > 250 || /[\x00-\x1f\x7f]/.test(book)) return reply(400,{message:'The book reference is invalid.'});
  let accepted = false;
  try {
    // Resolve tags before requesting a confirmation email. No list status is
    // changed through the API: Form 8 owns double opt-in and resubscriptions.
    const tags = [];
    const bookTag = Object.hasOwn(BOOK_TAGS, book) ? BOOK_TAGS[book] : '';
    for (const name of new Set(['PDA', ...(bookTag ? [bookTag] : [])])) tags.push(await tagId(name));
    const params = new URLSearchParams({u:'8',f:'8',s:'',c:'0',m:'0',act:'sub',v:'2',or:'bc946f25-41fb-4aa6-87f1-d721f0b9015f',firstname:firstName,email,jsonp:'true'});
    const response = await fetch(`${FORM_URL}?${params}`, {signal:AbortSignal.timeout(12000)});
    const result = await response.text();
    // The form's public embed returns JavaScript. Recognise its success callback
    // without evaluating remote code or treating an HTTP 200 as acceptance.
    if (!response.ok || !/^(?:\s*window\.)?\s*_show_thank_you\s*\(\s*['"]8['"]\s*,/.test(result.trim())) throw new Error('Form not accepted');
    accepted = true;
    let contact;
    for (let attempt = 0; attempt < 4; attempt++) {
      const found = await api(`/contacts?${new URLSearchParams({email})}`);
      contact = found.contacts?.find(item => item.email?.toLowerCase() === email);
      if (contact?.id) break;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
    if (!contact?.id) throw new Error('Contact not available');
    await api(`/contacts/${contact.id}`, {method:'PUT',body:JSON.stringify({contact:{firstName}})});
    const current = await api(`/contacts/${contact.id}/contactTags`);
    for (const tag of tags) {
      if (!current.contactTags?.some(item => String(item.tag) === tag)) {
        await api('/contactTags',{method:'POST',body:JSON.stringify({contactTag:{contact:String(contact.id),tag}})});
      }
    }
    return reply(200,{success:true});
  } catch {
    // Never log form bodies, email addresses, credentials or upstream URLs.
    return reply(502,{message:accepted ? 'Your signup was received, but we could not finish saving your book selection. Please try again. You may already have a confirmation email.' : 'We could not complete your signup. Please try again in a moment.'});
  }
};
