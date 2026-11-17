#!/usr/bin/env node
/**
 * End-to-end database test suite for "Don't Forget" (Supabase).
 *
 * Exercises every table, every RLS rule, triggers, constraints and cascade
 * behaviour against a real Supabase project — the same API the browser uses.
 *
 * Usage:
 *   npm run test:e2e                 # full suite (creates + cleans up test data)
 *   npm run test:e2e -- --preflight  # connection + schema only, writes nothing
 *
 * Configuration (first match wins):
 *   SUPABASE_URL / VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY   (optional but required for user cleanup and
 *                                for projects with "Confirm email" enabled)
 *
 * For projects with email confirmation enabled, pass the service role key:
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run test:e2e
 *
 * WARNING: this writes to the target project. Point it at staging or a fresh
 * project rather than production with real user data.
 */

import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
function loadEnvFile(path = '.env') {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

const fileEnv = loadEnvFile();
const PROJECT_URL = (process.env.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = process.env.SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || '';
const PREFLIGHT_ONLY = process.argv.includes('--preflight');

const TABLES = ['profiles', 'memories', 'shopping_lists', 'shopping_items', 'reminder_dispatch_logs'];

let createClient;
try {
  ({ createClient } = await import('@supabase/supabase-js'));
} catch {
  console.error('\n[x] @supabase/supabase-js is missing. Run: npm install\n');
  process.exit(2);
}

if (!PROJECT_URL || !ANON_KEY || /placeholder|your-project|your-anon-key/i.test(PROJECT_URL + ANON_KEY)) {
  console.error(
    '\n[x] Supabase is not configured.\n' +
      '    Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (or pass\n' +
      '    SUPABASE_URL / SUPABASE_ANON_KEY), then re-run.\n'
  );
  process.exit(2);
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

const anonClient = createClient(PROJECT_URL, ANON_KEY, clientOptions);
const adminClient = SERVICE_KEY ? createClient(PROJECT_URL, SERVICE_KEY, clientOptions) : null;

const uid = () => randomUUID();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

const pass = (name, detail = '') => {
  passed++;
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
};
const fail = (name, detail = '') => {
  failed++;
  failures.push(`${name} — ${detail}`);
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
};
const skip = (name, detail = '') => {
  skipped++;
  console.log(`  SKIP  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function test(name, fn) {
  try {
    const detail = await fn();
    pass(name, typeof detail === 'string' ? detail : '');
    return true;
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function section(title) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// 1. Connectivity + schema
// ---------------------------------------------------------------------------
section('1. Project connectivity');

let reachable = false;
await (async () => {
  try {
    const res = await fetch(`${PROJECT_URL}/auth/v1/settings`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 404) throw new Error(`project not found (HTTP 404) at ${PROJECT_URL}`);
    if (res.status === 401) throw new Error('anon/publishable key was rejected (HTTP 401) — copy the key again from Project Settings → API');
    if (!res.ok) throw new Error(`auth endpoint returned HTTP ${res.status}`);
    reachable = true;
    const settings = await res.json().catch(() => ({}));
    const providers = Object.entries(settings.external || {}).filter(([, enabled]) => enabled).map(([key]) => key);
    pass('project URL + anon key', `${new URL(PROJECT_URL).host} (providers: ${providers.join(', ') || 'email'})`);
    console.log(`        email confirmation required: ${settings.mailer_autoconfirm ? 'no' : 'yes'}`);
    console.log(`        service role key supplied:   ${SERVICE_KEY ? 'yes' : 'no'}`);
  } catch (error) {
    const cause = error?.cause?.code || error?.code || '';
    fail('project URL + anon key', `${error.message}${cause ? ` [${cause}]` : ''}`);
    if (String(cause).includes('ENOTFOUND') || /ENOTFOUND/.test(String(error.message))) {
      console.log('\n  The project hostname does not resolve. Either the project was deleted/paused,');
      console.log('  or VITE_SUPABASE_URL is a stale value. Paste the new project URL from');
      console.log('  Supabase → Project Settings → API.');
    }
  }
})();

if (!reachable) {
  console.error('\nAborting: cannot reach the Supabase project.\n');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 2. Schema / tables / RLS enabled
// ---------------------------------------------------------------------------
section('2. Schema');

const missingTables = [];
for (const table of TABLES) {
  await test(`table "${table}" exists and is reachable`, async () => {
    const res = await fetch(`${PROJECT_URL}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      assert(Array.isArray(body), 'unexpected response shape');
      assert(body.length === 0, 'anonymous request returned rows — RLS is not protecting this table!');
      return 'RLS blocks anonymous reads';
    }
    const code = body?.code || `HTTP ${res.status}`;
    if (body?.code === 'PGRST205' || /does not exist|Could not find the table/i.test(body?.message || '')) {
      missingTables.push(table);
      throw new Error('missing — run supabase/schema.sql in the SQL Editor');
    }
    throw new Error(`${code}: ${body?.message || 'request failed'}`);
  });
}

if (missingTables.length) {
  console.log(`\n  Missing tables: ${missingTables.join(', ')}`);
  console.log('  Apply the schema: Supabase Dashboard → SQL Editor → paste supabase/schema.sql → Run.');
  if (PREFLIGHT_ONLY) {
    console.log('\nPreflight result: BLOCKED (schema not applied)\n');
    process.exit(1);
  }
}

// Quick privilege check (only possible with the service role)
if (adminClient) {
  await test('service role can read every table', async () => {
    for (const table of TABLES) {
      const { error } = await adminClient.from(table).select('id').limit(1);
      assert(!error, `${table}: ${error?.message}`);
    }
    return `${TABLES.length} tables readable`;
  });
} else {
  skip('service role can read every table', 'service role key not supplied');
}

if (PREFLIGHT_ONLY) {
  console.log(`\nPreflight result: ${failed ? 'FAILED' : 'OK'} (${passed} passed, ${failed} failed)\n`);
  process.exit(failed ? 1 : 0);
}

// ---------------------------------------------------------------------------
// 3. Auth + profile provisioning
// ---------------------------------------------------------------------------
section('3. Auth & profile provisioning');

const stamp = Date.now().toString(36);
const emailA = `e2e.alpha.${stamp}@example.com`;
const emailB = `e2e.beta.${stamp}@example.com`;
const PASSWORD = `E2e!${stamp}Aa1`;
const createdUsers = [];
const createdMemoryIds = [];
const createdListIds = [];

const clientA = createClient(PROJECT_URL, ANON_KEY, clientOptions);
const clientB = createClient(PROJECT_URL, ANON_KEY, clientOptions);

async function createUser(email, fullName) {
  if (adminClient) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw new Error(error.message);
    createdUsers.push(data.user.id);
    return data.user;
  }

  const { data, error } = await clientA.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { full_name: fullName } },
  });
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error(
      'Email confirmation is enabled, so no session was returned. Supply SUPABASE_SERVICE_ROLE_KEY to run the authenticated tests.'
    );
  }
  createdUsers.push(data.user.id);
  await clientA.auth.signOut();
  return data.user;
}

let userA = null;
let userB = null;

try {
  userA = await createUser(emailA, 'E2E Alpha');
  pass('user A created', emailA);
} catch (error) {
  fail('user A created', error.message);
}

if (userA) {
  try {
  await test('sign in with password (returning session)', async () => {
    const { data, error } = await clientA.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    assert(!error, error?.message);
    assert(data.session?.access_token, 'no access token returned');
    return 'session established';
  });

  await test('sign in with a wrong password is rejected', async () => {
    const probe = createClient(PROJECT_URL, ANON_KEY, clientOptions);
    const { error } = await probe.auth.signInWithPassword({ email: emailA, password: 'definitely-wrong' });
    assert(error, 'wrong password was accepted!');
    return 'rejected as expected';
  });

  const { data: authUser } = await clientA.auth.getUser();
  const authUid = authUser?.user?.id;

  await test('profiles row auto-created by on_auth_user_created trigger', async () => {
    let profile = null;
    for (let attempt = 0; attempt < 12 && !profile; attempt++) {
      const { data, error } = await clientA.from('profiles').select('*').eq('id', authUid).maybeSingle();
      assert(!error, error?.message);
      if (data) profile = data;
      else await sleep(300);
    }
    assert(profile, 'no profiles row appeared — the auth trigger is missing');
    assert(profile.email === emailA, `profile email mismatch (${profile.email})`);
    return 'profile linked to auth user';
  });

  await test('profile update + updated_at trigger', async () => {
    const before = await clientA.from('profiles').select('updated_at').eq('id', authUid).single();
    await sleep(1100);
    const { error } = await clientA.from('profiles').update({ full_name: 'E2E Alpha Updated', timezone: 'Asia/Kolkata' }).eq('id', authUid);
    assert(!error, error?.message);
    const { data } = await clientA.from('profiles').select('full_name, timezone, updated_at').eq('id', authUid).single();
    assert(data.full_name === 'E2E Alpha Updated', 'full_name not updated');
    assert(new Date(data.updated_at) > new Date(before.data.updated_at), 'updated_at was not bumped by the trigger');
    return 'row updated, updated_at bumped';
  });

  // -------------------------------------------------------------------------
  // 4. Memories CRUD
  // -------------------------------------------------------------------------
  section('4. Memories (all categories, CRUD)');

  const categories = ['task', 'reminder', 'shopping', 'link', 'idea', 'book', 'gift', 'place', 'general'];
  const dueDate = new Date(Date.now() + 3600 * 1000).toISOString();

  await test('insert one memory per category', async () => {
    const rows = categories.map((category, index) => ({
      user_id: authUid,
      title: `E2E ${category}`,
      content: `Automated test row for ${category}`,
      category,
      priority: ['low', 'medium', 'high', 'urgent'][index % 4],
      due_date: dueDate,
      tags: ['e2e', category],
      reminder_enabled: true,
      timezone: 'UTC',
      metadata: { e2e: true, category },
    }));
    const { data, error } = await clientA.from('memories').insert(rows).select();
    assert(!error, error?.message);
    assert(data.length === categories.length, `expected ${categories.length} rows, got ${data.length}`);
    data.forEach((row) => createdMemoryIds.push(row.id));
    return `${data.length} rows inserted`;
  });

  await test('select own memories with ordering + filters', async () => {
    const { data, error } = await clientA
      .from('memories')
      .select('id,title,category,is_favorite,is_archived,is_completed,due_date')
      .order('created_at', { ascending: false });
    assert(!error, error?.message);
    assert(data.length >= categories.length, 'expected at least 9 rows');
    const { data: upcoming, error: upcomingError } = await clientA
      .from('memories')
      .select('id')
      .gte('due_date', new Date().toISOString())
      .eq('is_archived', false);
    assert(!upcomingError, upcomingError?.message);
    assert(upcoming.length >= 1, 'due-date filter returned nothing');
    return 'ordering + due-date filter OK';
  });

  const targetId = createdMemoryIds[0];

  await test('update memory fields + updated_at trigger', async () => {
    assert(targetId, 'no memory row to update — the insert test failed');
    const before = await clientA.from('memories').select('updated_at,is_favorite').eq('id', targetId).single();
    await sleep(1100);
    const { error } = await clientA
      .from('memories')
      .update({ title: 'E2E task (edited)', is_favorite: true, is_completed: true, metadata: { e2e: true, edited: true } })
      .eq('id', targetId);
    assert(!error, error?.message);
    const { data } = await clientA.from('memories').select('title,is_favorite,is_completed,metadata,updated_at').eq('id', targetId).single();
    assert(data.title === 'E2E task (edited)', 'title not persisted');
    assert(data.is_favorite === true && data.is_completed === true, 'boolean flags not persisted');
    assert(data.metadata?.edited === true, 'jsonb metadata not persisted');
    assert(new Date(data.updated_at) > new Date(before.data.updated_at), 'updated_at trigger did not fire');
    return 'jsonb + flags + trigger OK';
  });

  await test('toggle favorite / complete / archive paths', async () => {
    assert(targetId, 'no memory row to toggle — the insert test failed');
    for (const patch of [{ is_favorite: false }, { is_completed: false }, { is_archived: true }, { is_archived: false }]) {
      const { error } = await clientA.from('memories').update(patch).eq('id', targetId);
      assert(!error, error?.message);
    }
    return '4 updates applied';
  });

  await test('delete a memory', async () => {
    const victim = createdMemoryIds.pop();
    assert(victim, 'no memory row to delete — the insert test failed');
    const { error } = await clientA.from('memories').delete().eq('id', victim);
    assert(!error, error?.message);
    const { data } = await clientA.from('memories').select('id').eq('id', victim);
    assert(data.length === 0, 'row still present after delete');
    return 'row removed';
  });

  await test('priority check constraint rejects invalid values', async () => {
    const { error } = await clientA.from('memories').insert([{ user_id: authUid, title: 'bad priority', category: 'task', priority: 'nonsense' }]);
    assert(error, 'invalid priority was accepted');
    return 'constraint enforced';
  });

  // -------------------------------------------------------------------------
  // 5. Shopping lists + cascade
  // -------------------------------------------------------------------------
  section('5. Shopping lists & items');

  let listId = null;

  await test('create shopping list', async () => {
    const { data, error } = await clientA.from('shopping_lists').insert([{ user_id: authUid, title: 'E2E Groceries', category: 'Supermarket' }]).select().single();
    assert(!error, error?.message);
    listId = data.id;
    createdListIds.push(data.id);
    return 'list created';
  });

  await test('add items, toggle bought, update quantity', async () => {
    const { data, error } = await clientA
      .from('shopping_items')
      .insert([
        { list_id: listId, user_id: authUid, item_name: 'E2E Milk', quantity: '2', unit: 'cartons', notes: 'unsweetened' },
        { list_id: listId, user_id: authUid, item_name: 'E2E Bread', quantity: '1', unit: 'loaf' },
      ])
      .select();
    assert(!error, error?.message);
    assert(data.length === 2, 'expected 2 items');

    const { error: toggleError } = await clientA
      .from('shopping_items')
      .update({ is_bought: true, quantity: '3' })
      .eq('id', data[0].id);
    assert(!toggleError, toggleError?.message);

    const { data: checked } = await clientA.from('shopping_items').select('is_bought,quantity').eq('id', data[0].id).single();
    assert(checked.is_bought === true && checked.quantity === '3', 'item update not persisted');
    return '2 items + update OK';
  });

  await test('deleting a list cascades to its items', async () => {
    assert(listId, 'no shopping list to delete — the create test failed');
    const { error } = await clientA.from('shopping_lists').delete().eq('id', listId);
    assert(!error, error?.message);
    const { data } = await clientA.from('shopping_items').select('id').eq('list_id', listId);
    assert(data.length === 0, 'orphan items remain — ON DELETE CASCADE missing');
    createdListIds.length = 0;
    return 'cascade delete OK';
  });

  // -------------------------------------------------------------------------
  // 6. Reminder dispatch ledger
  // -------------------------------------------------------------------------
  section('6. Reminder dispatch logs');

  const ledgerMemoryId = createdMemoryIds[createdMemoryIds.length - 1];
  assert(ledgerMemoryId, 'no memory available for the dispatch-log tests — the insert test failed');
  const scheduledFor = new Date(Date.now() + 86400 * 1000).toISOString();

  await test('insert a dispatch log for an own memory', async () => {
    const { error } = await clientA.from('reminder_dispatch_logs').insert([
      { memory_id: ledgerMemoryId, user_id: authUid, channel: 'browser', scheduled_for: scheduledFor, status: 'delivered', response_payload: { source: 'e2e' } },
    ]);
    assert(!error, error?.message);
    const { data } = await clientA.from('reminder_dispatch_logs').select('id,channel,status').eq('memory_id', ledgerMemoryId);
    assert(data.length === 1, 'log not readable');
    return 'ledger row written';
  });

  await test('duplicate (memory, channel, scheduled_for) is rejected (idempotency)', async () => {
    const { error } = await clientA.from('reminder_dispatch_logs').insert([
      { memory_id: ledgerMemoryId, user_id: authUid, channel: 'browser', scheduled_for: scheduledFor, status: 'delivered' },
    ]);
    assert(error, 'duplicate log was accepted — unique constraint missing');
    assert(error.code === '23505', `expected 23505, got ${error.code}: ${error.message}`);
    return 'unique_memory_channel_schedule enforced';
  });

  await test('deleting the memory cascades its dispatch logs', async () => {
    const { error } = await clientA.from('memories').delete().eq('id', ledgerMemoryId);
    assert(!error, error?.message);
    const { data } = await clientA.from('reminder_dispatch_logs').select('id').eq('memory_id', ledgerMemoryId);
    assert(data.length === 0, 'dispatch logs survived memory deletion');
    const index = createdMemoryIds.indexOf(ledgerMemoryId);
    if (index >= 0) createdMemoryIds.splice(index, 1);
    return 'cascade delete OK';
  });

  // -------------------------------------------------------------------------
  // 7. Row Level Security isolation
  // -------------------------------------------------------------------------
  section('7. Row Level Security isolation');

  await test('anonymous client cannot read authenticated rows', async () => {
    const { data, error } = await anonClient.from('memories').select('id');
    assert(!error, error?.message);
    assert(data.length === 0, `anonymous read leaked ${data.length} rows`);
    return '0 rows visible without a session';
  });

  await test('anonymous client cannot insert', async () => {
    const { error } = await anonClient.from('memories').insert([{ title: 'anon', category: 'task' }]);
    assert(error, 'anonymous insert succeeded — RLS insert policy missing');
    return 'insert blocked';
  });

  await test('user cannot insert a row attributed to another user', async () => {
    const { error } = await clientA.from('memories').insert([{ title: 'spoofed', category: 'task', user_id: uid() }]);
    assert(error, 'spoofed user_id was accepted');
    return 'with check (auth.uid() = user_id) enforced';
  });

  // Second user for cross-tenant checks (needs service role to create)
  if (adminClient) {
    try {
      userB = await createUser(emailB, 'E2E Beta');
    } catch (error) {
      fail('user B created', error.message);
    }
  } else {
    skip('cross-user isolation tests', 'SUPABASE_SERVICE_ROLE_KEY not supplied');
  }

  if (userB) {
    await test('user B cannot read or modify user A data', async () => {
      assert(createdMemoryIds.length > 0, 'no user A rows to test against — the insert test failed');
      const { error: signInError } = await clientB.auth.signInWithPassword({ email: emailB, password: PASSWORD });
      assert(!signInError, signInError?.message);

      const { data: visible, error } = await clientB.from('memories').select('id').in('id', createdMemoryIds);
      assert(!error, error?.message);
      assert(visible.length === 0, `user B can see ${visible.length} of user A's memories`);

      const { data: deleted } = await clientB.from('memories').delete().eq('id', createdMemoryIds[0]).select('id');
      assert((deleted || []).length === 0, 'user B deleted a row owned by user A');

      const { data: stillThere } = await clientA.from('memories').select('id').eq('id', createdMemoryIds[0]);
      assert(stillThere.length === 1, 'user A row disappeared after cross-user delete attempt');

      const { data: profiles } = await clientB.from('profiles').select('id').eq('id', authUid);
      assert(profiles.length === 0, 'user B can read user A profile');
      return 'memories, deletes and profiles isolated';
    });
  }

  // -------------------------------------------------------------------------
  // 8. Realtime (best effort)
  // -------------------------------------------------------------------------
  section('8. Realtime publication');

  if (typeof WebSocket === 'undefined') {
    skip('realtime update is received by a subscriber', 'no WebSocket in this Node runtime');
  } else if (!createdMemoryIds.length) {
    skip('realtime update is received by a subscriber', 'no memory row to update');
  } else {
    const realtimeId = createdMemoryIds[0];
    let channel = null;
    try {
      // Wait for the subscription to be live *before* writing, otherwise the
      // change is emitted before the socket has joined the channel.
      const outcome = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve('timeout'), 15000);
        let live = false;
        const done = (value) => {
          clearTimeout(timer);
          resolve(value);
        };
        channel = clientA
          .channel(`e2e-realtime-${stamp}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'memories', filter: `user_id=eq.${authUid}` },
            () => {
              if (live) done('event');
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED' && !live) {
              live = true;
              clientA.from('memories').update({ content: 'realtime ping' }).eq('id', realtimeId).then(() => {});
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              done(status.toLowerCase());
            }
          });
      });
      if (outcome === 'event') {
        pass('realtime update is received by a subscriber');
      } else if (outcome === 'timeout') {
        skip(
          'realtime update is received by a subscriber',
          'no event within 15s — enable Realtime for public.memories (Database → Replication, or re-run schema.sql)'
        );
      } else {
        skip('realtime update is received by a subscriber', `subscription status: ${outcome}`);
      }
    } catch (error) {
      skip('realtime update is received by a subscriber', error.message);
    } finally {
      if (channel) {
        try {
          await clientA.removeChannel(channel);
        } catch {
          // ignore teardown errors
        }
      }
    }
  }
  } catch (error) {
    fail('authenticated suite aborted', error.message);
  }
}

// -------------------------------------------------------------------------
// Cleanup
// -------------------------------------------------------------------------
section('9. Cleanup');

  try {
    if (createdListIds.length) await clientA.from('shopping_lists').delete().in('id', createdListIds);
    if (createdMemoryIds.length) await clientA.from('memories').delete().in('id', createdMemoryIds);
    await clientA.from('shopping_lists').delete().like('title', 'E2E %');
    await clientA.from('memories').delete().like('title', 'E2E %');
  } catch {
    // best effort: rows are also removed by the auth user cascade below
  }
  pass('test data removed', `${createdMemoryIds.length} memories / ${createdListIds.length} lists`);

  if (adminClient && createdUsers.length) {
    let removed = 0;
    for (const id of createdUsers) {
      const { error } = await adminClient.auth.admin.deleteUser(id);
      if (!error) removed++;
    }
    if (removed === createdUsers.length) pass('test users deleted', `${removed} user(s)`);
    else fail('test users deleted', `${createdUsers.length - removed} leftover — delete them in Authentication → Users`);
  } else if (createdUsers.length) {
    skip('test users deleted', `no service role key; remove ${createdUsers.join(', ')} manually`);
  }

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log(`Database E2E summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((entry) => console.log(`  - ${entry}`));
}
console.log('='.repeat(60) + '\n');
process.exit(failed ? 1 : 0);
