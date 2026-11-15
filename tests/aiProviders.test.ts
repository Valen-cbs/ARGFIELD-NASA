import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredProviders, generateSummary } from '../server/aiProviders';
const providers = configuredProviders({ AI_PROVIDER: 'groq', AI_API_KEY: 'test-primary', AI_FALLBACK_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-backup' });
const ok = () => Response.json({ choices: [{ message: { content: JSON.stringify({ resumen: 'Resumen de prueba.' }) } }] });
test('primary success does not call backup', async () => {
  let calls = 0;
  await generateSummary(providers, 'prompt', 'context', (async () => { calls++; return ok(); }) as typeof fetch);
  assert.equal(calls, 1);
});
test('quota, network and malformed output use backup with its own credentials and model', async () => {
  for (const failure of ['quota', 'network', 'json']) {
    let calls = 0;
    const result = await generateSummary(providers, 'prompt', 'context', (async (url, options) => {
      calls++;
      if (calls === 1) {
        if (failure === 'network') throw Error('network');
        return failure === 'quota' ? new Response('', { status: 429 }) : Response.json({});
      }
      assert.match(String(url), /generativelanguage.googleapis.com/);
      assert.equal((options!.headers as Record<string,string>).Authorization, 'Bearer test-backup');
      assert.equal(JSON.parse(options!.body as string).model, 'gemini-3.5-flash-lite');
      return ok();
    }) as typeof fetch);
    assert.equal(calls, 2);
    assert.equal(result.resumen, 'Resumen de prueba.');
  }
});
test('all failures produce a generic error and bounded attempts', async () => {
  let calls = 0;
  await assert.rejects(generateSummary(providers, 'prompt', 'context', (async () => { calls++; throw Error('secret upstream error'); }) as typeof fetch), /^Error: No hay un proveedor/);
  assert.equal(calls, 2);
});
