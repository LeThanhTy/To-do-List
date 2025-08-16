/**
 * Vercel serverless API for Todos.
 * - If UPSTASH_REDIS_* envs exist, uses Redis (persistent).
 * - Otherwise falls back to in-memory array (ephemeral on serverless).
 */

import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

let mem = []; // in-memory fallback
const KEY = 'todos';

function json(res, status=200){
  return new Response(JSON.stringify(res), { status, headers: { 'Content-Type':'application/json' } });
}

async function getTodos(){
  if (redis){ return await redis.get(KEY) || []; }
  return mem;
}
async function setTodos(val){
  if (redis){ await redis.set(KEY, val); return val; }
  mem = val; return mem;
}

export default async function handler(req){
  const { searchParams } = new URL(req.url);
  const method = req.method;

  if (method === 'GET'){
    const todos = await getTodos();
    return json(todos);
  }
  if (method === 'POST'){
    const body = await req.json();
    const title = String(body?.title||'').trim();
    if(!title) return json({error:'TITLE_REQUIRED'}, 400);
    const todos = await getTodos();
    const todo = { id: (globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)), title, completed:false, createdAt: Date.now() };
    todos.push(todo);
    await setTodos(todos);
    return json(todos);
  }
  if (method === 'PUT'){
    const id = searchParams.get('id');
    if(!id) return json({error:'ID_REQUIRED'}, 400);
    const patch = await req.json();
    const todos = await getTodos();
    const idx = todos.findIndex(t=>t.id===id);
    if(idx===-1) return json({error:'NOT_FOUND'}, 404);
    todos[idx] = { ...todos[idx], ...patch };
    await setTodos(todos);
    return json(todos);
  }
  if (method === 'DELETE'){
    const id = searchParams.get('id');
    const completed = searchParams.get('completed') === 'true';
    let todos = await getTodos();
    if (id){
      todos = todos.filter(t=>t.id!==id);
    } else if (completed){
      todos = todos.filter(t=>!t.completed);
    } else {
      todos = [];
    }
    await setTodos(todos);
    return json(todos);
  }
  return json({error:'METHOD_NOT_ALLOWED'}, 405);
}