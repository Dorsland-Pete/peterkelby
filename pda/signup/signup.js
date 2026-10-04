'use strict';
const query = new URLSearchParams(location.search);
const book = (query.get('book') || '').trim();
// Labels are optional. The server maps approved books using config/pda-book-tags.json.
const books = {tt01: 'Classic Train Tracks', tt02: 'Closed-Loop Train-Tracks'};
document.querySelector('#book').value = book;
if (Object.hasOwn(books, book)) {
  const reference = document.querySelector('#book-reference');
  reference.textContent = `Joining us from ${books[book]}? Welcome!`;
  reference.hidden = false;
}
const form = document.querySelector('#pda-signup');
const button = form.querySelector('button');
const status = document.querySelector('#form-status');
fetch('/.netlify/functions/pda-signup', {signal: AbortSignal.timeout(10000)})
  .then(response => response.ok ? response.json() : Promise.reject())
  .then(data => { if (data.ready) { button.disabled = false; status.textContent = ''; } })
  .catch(() => { status.textContent = 'Signup is temporarily unavailable. Please try again later.'; });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled || !form.reportValidity()) return;
  button.disabled = true;
  button.textContent = 'Sending…';
  status.textContent = '';
  try {
    const response = await fetch('/.netlify/functions/pda-signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(Object.fromEntries(new FormData(form))),
      signal:AbortSignal.timeout(60000)
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Please try again in a moment.');
    form.hidden = true;
    const success = document.querySelector('#signup-success');
    success.hidden = false;
    success.focus();
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' ? 'The request timed out. You may already have a confirmation email; check your inbox before trying again.' : error.message || 'We could not complete your signup. Please try again.';
    button.disabled = false;
    button.textContent = 'Join the Academy';
  }
});
