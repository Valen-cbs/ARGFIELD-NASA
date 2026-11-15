type Provider = { name: string; key: string; model: string; url: string };

export function configuredProviders(env: NodeJS.ProcessEnv = process.env): Provider[] {
  // Keep the request order fixed: the generic AI_* variables remain supported
  // for existing deployments, but only when they are explicitly assigned to Groq.
  const genericKey = env.AI_PROVIDER === 'groq' ? (env.AI_API_KEY ?? '') : '';
  const genericModel = env.AI_PROVIDER === 'groq' ? (env.AI_MODEL ?? '') : '';
  const providers = [
    { name: 'groq', key: env.GROQ_API_KEY || genericKey, model: env.GROQ_MODEL || genericModel || 'openai/gpt-oss-20b', url: 'https://api.groq.com/openai/v1/chat/completions' },
    { name: 'gemini', key: env.GEMINI_API_KEY || (env.AI_PROVIDER === 'gemini' ? (env.AI_API_KEY ?? '') : ''), model: env.GEMINI_MODEL || (env.AI_PROVIDER === 'gemini' ? (env.AI_MODEL ?? '') : '') || 'gemini-3.5-flash-lite', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' }
  ] satisfies Provider[];
  return providers.filter(provider => Boolean(provider.key));
}

/** One attempt per provider; failures and provider bodies never reach logs or clients. */
export async function generateSummary(providers: Provider[], prompt: string, context: string, fetchImpl: typeof fetch = fetch): Promise<{ resumen: string }> {
  for (const provider of providers) {
    try {
      const response = await fetchImpl(provider.url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + provider.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: provider.model, temperature: 0, max_tokens: 240,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: prompt }, { role: 'user', content: context }] }),
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) { await response.body?.cancel(); continue; }
      const payload = await response.json();
      const result = JSON.parse(payload.choices?.[0]?.message?.content ?? '{}');
      if (typeof result.resumen !== 'string' || !result.resumen.trim() || result.resumen.length > 1600 || result.resumen.trim().split(/\s+/).length > 110) continue;
      return { resumen: result.resumen };
    } catch { /* Try the configured backup, without exposing credentials or upstream errors. */ }
  }
  throw new Error('No hay un proveedor de análisis disponible.');
}
