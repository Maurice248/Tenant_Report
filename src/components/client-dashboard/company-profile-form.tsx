'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ImageIcon, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type CompanyProfile = {
  name: string;
  logoUrl: string | null;
  slug: string;
};

async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const res = await fetch('/api/companies/upload-logo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType: file.type }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Logo upload failed');
  }

  const uploadRes = await fetch(data.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || data.contentType },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('Failed to upload logo file');
  }

  return data.publicUrl as string;
}

export function CompanyProfileForm({ readOnly = false }: { readOnly?: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [name, setName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/companies/profile');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load company profile');
      setProfile(data);
      setName(data.name);
      setLogoPreview(data.logoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Logo must be an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be smaller than 2 MB.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      let logoUrl: string | null | undefined;

      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      const payload: { name: string; logoUrl?: string | null } = { name: name.trim() };
      if (logoUrl !== undefined) {
        payload.logoUrl = logoUrl;
      }

      const res = await fetch('/api/companies/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save company profile');

      setProfile(data);
      setName(data.name);
      setLogoPreview(data.logoUrl);
      setLogoFile(null);
      setSuccess('Company profile saved.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading company profile...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Company</CardTitle>
        <CardDescription>Set your company name and logo for the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        {readOnly && (
          <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-muted)]">
            Only company admins can edit company profile settings.
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        <fieldset disabled={readOnly} className="disabled:opacity-80">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Property Management"
              required
              minLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Company logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)]">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-1" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-[var(--text-muted)]" />
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]">
                <Upload className="h-4 w-4" />
                Upload logo
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
            </div>
          </div>

          {profile?.slug && (
            <p className="text-xs text-[var(--text-muted)]">Workspace ID: {profile.slug}</p>
          )}

          {!readOnly && (
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save company profile'
              )}
            </Button>
          )}
        </form>
        </fieldset>
      </CardContent>
    </Card>
  );
}
