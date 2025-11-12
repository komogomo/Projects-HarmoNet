import React from 'react';
import { MagicLinkForm } from './MagicLinkForm';
import { StaticI18nProvider, useStaticI18n } from '@/components/common/StaticI18nProvider/StaticI18nProvider';
import { userEvent, within } from '@storybook/test';

function LocaleSwitcher() {
  const { currentLocale, setLocale } = useStaticI18n();
  const Button = ({ code, label }: { code: string; label: string }) => (
    <button
      type="button"
      onClick={() => setLocale(code)}
      disabled={currentLocale === code}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid #e5e7eb',
        background: currentLocale === code ? '#111827' : '#ffffff',
        color: currentLocale === code ? '#ffffff' : '#111827',
        cursor: currentLocale === code ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
      <Button code="ja" label="JA" />
      <Button code="en" label="EN" />
      <Button code="zh" label="ZH" />
    </div>
  );
}

const meta = {
  title: 'Auth/MagicLinkForm',
  component: MagicLinkForm,
  decorators: [
    (Story: any) => (
      <StaticI18nProvider>
        <div className="p-4">
          <LocaleSwitcher />
          <Story />
        </div>
      </StaticI18nProvider>
    ),
  ],
};
export default meta;

export const Idle = {
  render: () => <MagicLinkForm />,
};

async function patchSupabaseAuth(overrides: any) {
  const mod = await import('../../../../lib/supabaseClient');
  const auth = (mod as any).supabase.auth;
  const original = {
    signInWithOtp: auth.signInWithOtp.bind(auth),
    signInWithIdToken: auth.signInWithIdToken?.bind(auth),
  };
  if (overrides.signInWithOtp) auth.signInWithOtp = overrides.signInWithOtp;
  if (overrides.signInWithIdToken) auth.signInWithIdToken = overrides.signInWithIdToken;
  return () => {
    auth.signInWithOtp = original.signInWithOtp;
    if (original.signInWithIdToken) auth.signInWithIdToken = original.signInWithIdToken;
  };
}

function setNoRedirect(on = true) {
  (window as any).__NO_REDIRECT__ = on;
  return () => { delete (window as any).__NO_REDIRECT__; };
}

export const Sending = {
  render: () => <MagicLinkForm />,
  play: async ({ canvasElement }: any) => {
    const restore = await patchSupabaseAuth({
      signInWithOtp: () => new Promise(() => {}), // keep sending state
    });
    const restoreNoRedirect = setNoRedirect(true);
    const c = within(canvasElement);
    const input = await c.findByPlaceholderText(/name@example.com/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'name@example.com');
    const form = input.closest('form');
    const button = (form?.querySelector('button[type="submit"]') || form?.querySelector('button')) as HTMLButtonElement | null;
    if (!button) throw new Error('submit button not found');
    await userEvent.click(button);
    setTimeout(() => { restore(); restoreNoRedirect(); }, 0);
  },
};

export const Sent = {
  render: () => <MagicLinkForm />,
  play: async ({ canvasElement }: any) => {
    (window as any).__CORBADO_MODE = 'fail';
    const restore = await patchSupabaseAuth({
      signInWithOtp: async () => ({ data: {}, error: null }),
    });
    const restoreNoRedirect = setNoRedirect(true);
    const c = within(canvasElement);
    const input = await c.findByPlaceholderText(/name@example.com/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'name@example.com');
    const form = input.closest('form');
    const button = (form?.querySelector('button[type="submit"]') || form?.querySelector('button')) as HTMLButtonElement | null;
    if (!button) throw new Error('submit button not found');
    await userEvent.click(button);
    setTimeout(() => { restore(); restoreNoRedirect(); delete (window as any).__CORBADO_MODE; }, 0);
  },
};

export const PasskeySuccess = {
  render: () => <MagicLinkForm passkeyEnabled />,
  play: async ({ canvasElement }: any) => {
    (window as any).__CORBADO_MODE = 'success';
    const restore = await patchSupabaseAuth({
      signInWithIdToken: async () => ({ data: {}, error: null }),
    });
    const restoreNoRedirect = setNoRedirect(true);
    const c = within(canvasElement);
    const input = await c.findByPlaceholderText(/name@example.com/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'name@example.com');
    const form = input.closest('form');
    const button = (form?.querySelector('button[type="submit"]') || form?.querySelector('button')) as HTMLButtonElement | null;
    if (!button) throw new Error('submit button not found');
    await userEvent.click(button);
    setTimeout(() => { restore(); restoreNoRedirect(); delete (window as any).__CORBADO_MODE; }, 0);
  },
};
