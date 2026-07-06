'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { groupN8nWebhookFields, N8N_WEBHOOK_FIELDS } from '@/lib/n8n-config';

type SecretField = { set: boolean; masked: string };

type ApiTokenSecretView = {
  key: string;
  label: string;
  placeholder: string;
  set: boolean;
  masked: string;
};

type IntegrationSettings = {
  metaAccessToken: SecretField;
  metaAdAccountId: string;
  metaPageId: string;
  elevenLabsApiKey: SecretField;
  wordpressSiteUrl: string;
  wordpressUsername: string;
  wordpressAppPassword: SecretField;
  n8nApiKey: SecretField;
  n8nApiBaseUrl: string;
  n8nBlogWorkflowId: string;
  n8nBlogWorkflowName: string;
  n8nWebhooks: Record<string, string>;
};

const emptyForm = {
  metaAccessToken: '',
  metaAdAccountId: '',
  metaPageId: '',
  elevenLabsApiKey: '',
  wordpressSiteUrl: '',
  wordpressUsername: '',
  wordpressAppPassword: '',
  n8nApiKey: '',
  n8nApiBaseUrl: '',
  n8nBlogWorkflowId: '',
  n8nBlogWorkflowName: '',
};

function SecretHint({ field }: { field: SecretField }) {
  if (!field.set) {
    return <p className="text-xs text-[var(--text-muted)]">Not configured</p>;
  }
  return (
    <p className="text-xs text-[var(--text-muted)]">
      Saved: <span className="font-mono">{field.masked}</span> — leave blank to keep current value
    </p>
  );
}

function emptyWebhookForm(): Record<string, string> {
  return Object.fromEntries(N8N_WEBHOOK_FIELDS.map((f) => [f.key, '']));
}

export function IntegrationsForm({ readOnly = false }: { readOnly?: boolean }) {
  const router = useRouter();
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [webhookForm, setWebhookForm] = useState<Record<string, string>>(emptyWebhookForm);
  const [apiTokenSecrets, setApiTokenSecrets] = useState<ApiTokenSecretView[]>([]);
  const [apiTokenForm, setApiTokenForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const webhookGroups = useMemo(() => groupN8nWebhookFields(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/companies/integrations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load integrations');

      const tokenRes = await fetch('/api/tokens/secret');
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error || 'Failed to load API tokens');

      setSettings(data);
      setApiTokenSecrets(tokenData.tokens ?? []);
      setApiTokenForm(Object.fromEntries((tokenData.tokens ?? []).map((t: ApiTokenSecretView) => [t.key, ''])));
      setForm({
        metaAccessToken: '',
        metaAdAccountId: data.metaAdAccountId || '',
        metaPageId: data.metaPageId || '',
        elevenLabsApiKey: '',
        wordpressSiteUrl: data.wordpressSiteUrl || '',
        wordpressUsername: data.wordpressUsername || '',
        wordpressAppPassword: '',
        n8nApiKey: '',
        n8nApiBaseUrl: data.n8nApiBaseUrl || '',
        n8nBlogWorkflowId: data.n8nBlogWorkflowId || '',
        n8nBlogWorkflowName: data.n8nBlogWorkflowName || '',
      });
      setWebhookForm(
        Object.fromEntries(
          N8N_WEBHOOK_FIELDS.map((f) => [f.key, data.n8nWebhooks?.[f.key] || ''])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: Record<string, unknown> = {
      metaAdAccountId: form.metaAdAccountId,
      metaPageId: form.metaPageId,
      wordpressSiteUrl: form.wordpressSiteUrl,
      wordpressUsername: form.wordpressUsername,
      n8nApiBaseUrl: form.n8nApiBaseUrl,
      n8nBlogWorkflowId: form.n8nBlogWorkflowId,
      n8nBlogWorkflowName: form.n8nBlogWorkflowName,
    };

    if (form.metaAccessToken.trim()) payload.metaAccessToken = form.metaAccessToken.trim();
    if (form.elevenLabsApiKey.trim()) payload.elevenLabsApiKey = form.elevenLabsApiKey.trim();
    if (form.wordpressAppPassword.trim()) {
      payload.wordpressAppPassword = form.wordpressAppPassword.trim();
    }
    if (form.n8nApiKey.trim()) payload.n8nApiKey = form.n8nApiKey.trim();

    const n8nWebhooks: Record<string, string> = {};
    for (const field of N8N_WEBHOOK_FIELDS) {
      const value = webhookForm[field.key]?.trim();
      if (value) n8nWebhooks[field.key] = value;
    }
    payload.n8nWebhooks = n8nWebhooks;

    const tokenPayload: Record<string, string> = {};
    for (const token of apiTokenSecrets) {
      const value = apiTokenForm[token.key]?.trim();
      if (value) tokenPayload[token.key] = value;
    }

    try {
      const res = await fetch('/api/companies/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save integrations');

      const tokenRes = await fetch('/api/tokens/secret', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenPayload),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error || 'Failed to save API tokens');

      setSettings(data);
      setApiTokenSecrets(tokenData.tokens ?? []);
      setApiTokenForm(Object.fromEntries((tokenData.tokens ?? []).map((t: ApiTokenSecretView) => [t.key, ''])));
      setForm((prev) => ({
        ...prev,
        metaAccessToken: '',
        elevenLabsApiKey: '',
        wordpressAppPassword: '',
        n8nApiKey: '',
      }));
      setWebhookForm(
        Object.fromEntries(
          N8N_WEBHOOK_FIELDS.map((f) => [f.key, data.n8nWebhooks?.[f.key] || ''])
        )
      );
      setSuccess('Integration settings saved.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integrations');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading integrations…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {readOnly && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-muted)]">
          Only company admins can edit integration settings.
        </div>
      )}

      <fieldset disabled={readOnly} className="space-y-6 disabled:opacity-80">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" />
            Meta Ads
          </CardTitle>
          <CardDescription>
            Credentials for launching campaigns, live ads, reports, and location search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaAccessToken">Access token</Label>
            <Input
              id="metaAccessToken"
              type="password"
              autoComplete="off"
              placeholder={settings?.metaAccessToken.set ? '••••••••' : 'EAAG…'}
              value={form.metaAccessToken}
              onChange={(e) => setForm((f) => ({ ...f, metaAccessToken: e.target.value }))}
            />
            {settings && <SecretHint field={settings.metaAccessToken} />}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="metaAdAccountId">Ad account ID</Label>
              <Input
                id="metaAdAccountId"
                placeholder="10152738476174098"
                value={form.metaAdAccountId}
                onChange={(e) => setForm((f) => ({ ...f, metaAdAccountId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaPageId">Facebook page ID</Label>
              <Input
                id="metaPageId"
                placeholder="750158511525291"
                value={form.metaPageId}
                onChange={(e) => setForm((f) => ({ ...f, metaPageId: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ElevenLabs</CardTitle>
          <CardDescription>API key for AI voiceover selection in ad creation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="elevenLabsApiKey">API key</Label>
          <Input
            id="elevenLabsApiKey"
            type="password"
            autoComplete="off"
            placeholder={settings?.elevenLabsApiKey.set ? '••••••••' : 'sk_…'}
            value={form.elevenLabsApiKey}
            onChange={(e) => setForm((f) => ({ ...f, elevenLabsApiKey: e.target.value }))}
          />
          {settings && <SecretHint field={settings.elevenLabsApiKey} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">WordPress</CardTitle>
          <CardDescription>Blog publishing credentials for your WordPress site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wordpressSiteUrl">Site URL</Label>
            <Input
              id="wordpressSiteUrl"
              type="url"
              placeholder="https://blog.example.com"
              value={form.wordpressSiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, wordpressSiteUrl: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wordpressUsername">Username</Label>
              <Input
                id="wordpressUsername"
                autoComplete="off"
                value={form.wordpressUsername}
                onChange={(e) => setForm((f) => ({ ...f, wordpressUsername: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wordpressAppPassword">Application password</Label>
              <Input
                id="wordpressAppPassword"
                type="password"
                autoComplete="new-password"
                placeholder={settings?.wordpressAppPassword.set ? '••••••••' : ''}
                value={form.wordpressAppPassword}
                onChange={(e) => setForm((f) => ({ ...f, wordpressAppPassword: e.target.value }))}
              />
              {settings && <SecretHint field={settings.wordpressAppPassword} />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Workflow className="h-5 w-5" />
            n8n Automation
          </CardTitle>
          <CardDescription>
            API key, workflow settings, and webhook URLs for all dashboard automations. Stored per
            company — no .env required at runtime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="n8nApiKey">n8n API key</Label>
            <Input
              id="n8nApiKey"
              type="password"
              autoComplete="off"
              placeholder={settings?.n8nApiKey.set ? '••••••••' : 'n8n_api_…'}
              value={form.n8nApiKey}
              onChange={(e) => setForm((f) => ({ ...f, n8nApiKey: e.target.value }))}
            />
            {settings && <SecretHint field={settings.n8nApiKey} />}
          </div>
          <div className="space-y-2">
            <Label htmlFor="n8nApiBaseUrl">n8n API base URL</Label>
            <Input
              id="n8nApiBaseUrl"
              type="url"
              placeholder="https://n8n.example.com"
              value={form.n8nApiBaseUrl}
              onChange={(e) => setForm((f) => ({ ...f, n8nApiBaseUrl: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="n8nBlogWorkflowId">Blog workflow ID</Label>
              <Input
                id="n8nBlogWorkflowId"
                placeholder="Kgt5aL2eaVYIyNMo"
                value={form.n8nBlogWorkflowId}
                onChange={(e) => setForm((f) => ({ ...f, n8nBlogWorkflowId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n8nBlogWorkflowName">Blog workflow name</Label>
              <Input
                id="n8nBlogWorkflowName"
                placeholder="Tenant Report Blog Automation"
                value={form.n8nBlogWorkflowName}
                onChange={(e) => setForm((f) => ({ ...f, n8nBlogWorkflowName: e.target.value }))}
              />
            </div>
          </div>

          {[...webhookGroups.entries()].map(([group, fields]) => (
            <div key={group} className="space-y-3 border-t border-[var(--border)] pt-4">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">{group} webhooks</h4>
              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label htmlFor={`webhook-${field.key}`} className="text-sm">
                      {field.label}
                    </Label>
                    <Input
                      id={`webhook-${field.key}`}
                      type="url"
                      placeholder={`https://…/${field.key.includes('BLOG') ? 'webhook/blog-automation' : 'webhook/…'}`}
                      value={webhookForm[field.key] || ''}
                      onChange={(e) =>
                        setWebhookForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API tokens</CardTitle>
          <CardDescription>
            Third-party API keys and secrets used by n8n workflows. ElevenLabs is configured above.
            Leave blank to keep the current saved value.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiTokenSecrets.map((token) => (
            <div key={token.key} className="space-y-2">
              <Label htmlFor={`token-${token.key}`}>{token.label}</Label>
              <Input
                id={`token-${token.key}`}
                type="password"
                autoComplete="off"
                placeholder={token.set ? '••••••••' : token.placeholder}
                value={apiTokenForm[token.key] ?? ''}
                onChange={(e) =>
                  setApiTokenForm((prev) => ({ ...prev, [token.key]: e.target.value }))
                }
              />
              {token.set ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Saved: <span className="font-mono">{token.masked}</span> — leave blank to keep
                  current value
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Not configured</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {!readOnly && (
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save integrations'}
        </Button>
      )}
      </fieldset>
    </form>
  );
}
