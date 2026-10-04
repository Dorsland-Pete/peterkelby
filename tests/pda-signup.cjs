const assert = require('node:assert/strict');
const {handler} = require('../netlify/functions/pda-signup.js');
const event = (body, httpMethod='POST') => ({httpMethod,body:JSON.stringify(body),headers:{origin:'https://peterkelby.com'}});
(async()=>{
  assert.equal((await handler(event({},'GET'))).statusCode,503);
  process.env.ACTIVE_CAMPAIGN_API_URL='https://test-account.api-us1.com';
  process.env.ACTIVE_CAMPAIGN_API_KEY='test-only';
  assert.equal((await handler(event({},'GET'))).statusCode,200);
  for (const body of [{},{firstName:'Test',email:'invalid'},{firstName:'Test',email:'reader@example.com',website:'bot'}]) assert.equal((await handler(event(body))).statusCode,400);
  assert.equal((await handler({...event({}),headers:{origin:'https://untrusted.example'}})).statusCode,403);
  for (const book of ['tt01','tt02','unknown-book','__proto__','']) {
    const calls=[];
    global.fetch=async (url,options={})=>{
      calls.push({url,options});
      let data={};
      if(url.includes('/tags?')) {const name=new URL(url).searchParams.get('filters[search][eq]');data={tags:[{id:name==='PDA'?'1':name==='tt01'?'2':'3',tag:name}]};}
      else if(url.includes('/contacts?')) data={contacts:[{id:'7',email:'reader@example.com'}]};
      else if(url.endsWith('/contactTags') && !options.method) data={contactTags:[{tag:'99'},{tag:'1'}]};
      return {ok:true,json:async()=>data,text:async()=>"_show_thank_you('8', 'Thanks');"};
    };
    assert.equal((await handler(event({firstName:'Reader',email:'reader@example.com',book}))).statusCode,200);
    const assignments=calls.filter(c=>c.options.method==='POST');
    assert.equal(assignments.length,['tt01','tt02'].includes(book)?1:0);
    assert.ok(calls.every(c=>c.options.method!=='DELETE' && !c.url.includes('contactLists')));
    assert.ok(calls.some(c=>c.url.includes('proc.php?') && new URL(c.url).searchParams.get('f')==='8'));
  }
  global.fetch=async url=>({ok:true,json:async()=>({tags:[{tag:'PDA',id:'1'}]}),text:async()=>"_show_error('8', 'Rejected');"});
  assert.equal((await handler(event({firstName:'Reader',email:'reader@example.com'}))).statusCode,502);
  console.log('Passed: config gating, validation, origins, book mapping, preserved tags/list status, form acceptance and rejection. No live contacts or emails created.');
})();
