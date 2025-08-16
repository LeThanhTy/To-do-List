const $ = (sel, ctx=document)=>ctx.querySelector(sel);
const $$ = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));

const API = {
  async list(){ return request('/api/todos'); },
  async add(title){ return request('/api/todos', {method:'POST', body:{title}}); },
  async update(id, patch){ return request(`/api/todos?id=${id}`, {method:'PUT', body:patch}); },
  async remove(id){ return request(`/api/todos?id=${id}`, {method:'DELETE'}); },
  async clearCompleted(){ return request('/api/todos?completed=true', {method:'DELETE'}); }
};

// If API fails (e.g., missing Redis envs), we fallback to localStorage so the app is usable.
const storageKey = 'todos';
const useLocal = { value:false };

async function request(url, opt={}){
  const headers = { 'Content-Type':'application/json' };
  const body = opt.body ? JSON.stringify(opt.body) : undefined;
  try {
    const res = await fetch(url, { method:opt.method||'GET', headers, body });
    if(!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (e){
    console.warn('API unavailable, using localStorage fallback. Reason:', e.message);
    useLocal.value = true;
    return localBackend(url, opt);
  }
}

function readLocal(){ return JSON.parse(localStorage.getItem(storageKey)||'[]'); }
function writeLocal(v){ localStorage.setItem(storageKey, JSON.stringify(v)); }

async function localBackend(url, opt={}){
  const u = new URL(url, location.origin);
  let todos = readLocal();
  if (opt.method==='POST'){
    const id = crypto.randomUUID();
    const title = opt.body?.title?.trim();
    if(title){ todos.push({id,title,completed:false,createdAt:Date.now()}); writeLocal(todos); }
  } else if (opt.method==='PUT'){
    const id = u.searchParams.get('id');
    const idx = todos.findIndex(t=>t.id===id);
    if(idx>-1){ todos[idx] = { ...todos[idx], ...opt.body }; writeLocal(todos); }
  } else if (opt.method==='DELETE'){
    const id = u.searchParams.get('id');
    if (id){ todos = todos.filter(t=>t.id!==id); writeLocal(todos); }
    else if (u.searchParams.get('completed')==='true'){
      todos = todos.filter(t=>!t.completed); writeLocal(todos);
    }
  }
  return todos;
}

const listEl = $('#todo-list');
const form = $('#todo-form');
const input = $('#todo-input');
const leftCount = $('#left-count');
const clearCompletedBtn = $('#clear-completed');
const template = $('#item-template');
let filter = 'all';

function render(todos){
  listEl.innerHTML='';
  todos
    .filter(t=>filter==='all'||(filter==='active'&&!t.completed)||(filter==='completed'&&t.completed))
    .sort((a,b)=>a.completed-b.completed || b.createdAt-a.createdAt)
    .forEach(todo=>{
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.id = todo.id;
      if(todo.completed) node.classList.add('completed');
      $('.title', node).value = todo.title;
      $('.toggle', node).checked = !!todo.completed;

      $('.toggle', node).addEventListener('change', async (e)=>{
        const updated = await (useLocal.value? localBackend(`/api/todos?id=${todo.id}`, {method:'PUT', body:{completed:e.target.checked}}): API.update(todo.id,{completed:e.target.checked}));
        render(updated);
      });
      $('.title', node).addEventListener('change', async (e)=>{
        const title = e.target.value.trim(); if(!title) return;
        const updated = await (useLocal.value? localBackend(`/api/todos?id=${todo.id}`, {method:'PUT', body:{title}}): API.update(todo.id,{title}));
        render(updated);
      });
      $('.delete', node).addEventListener('click', async ()=>{
        const updated = await (useLocal.value? localBackend(`/api/todos?id=${todo.id}`, {method:'DELETE'}): API.remove(todo.id));
        render(updated);
      });

      listEl.appendChild(node);
    });
  const left = todos.filter(t=>!t.completed).length;
  leftCount.textContent = left;
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const title = input.value.trim(); if(!title) return;
  const updated = await (useLocal.value? localBackend('/api/todos', {method:'POST', body:{title}}): API.add(title));
  input.value='';
  render(updated);
});

$$('.filters .chip').forEach(btn=>btn.addEventListener('click', async ()=>{
  $$('.filters .chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  filter = btn.dataset.filter || filter;
  const todos = await (useLocal.value? localBackend('/api/todos'): API.list());
  render(todos);
}));

clearCompletedBtn.addEventListener('click', async ()=>{
  const todos = await (useLocal.value? localBackend('/api/todos?completed=true', {method:'DELETE'}): API.clearCompleted());
  render(todos);
});

// Initial load
(API.list().catch(()=>localBackend('/api/todos'))).then(render);