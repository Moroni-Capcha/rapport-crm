import { Handshake } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../ui/primitives';
import { useT } from '../../lib/i18n';

/** Pantalla de acceso de la demo: cualquier contraseña entra */
export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const t = useT();
  const [email, setEmail] = useState('andrea@rapport.agency');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(onLogin, 450); // simula la llamada al servidor
  };

  const inputCls =
    'h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-[13.5px] text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-ink/25';

  return (
    <div className="flex h-full items-center justify-center bg-canvas p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--color-ink)_6%,transparent),transparent)]" />
      <form onSubmit={submit} className="animate-pop relative w-full max-w-[380px] rounded-2xl border border-line bg-surface p-7 shadow-2xl shadow-shade/40">
        <span className="flex size-10 items-center justify-center rounded-xl border border-line-strong bg-gradient-to-b from-surface-3 to-surface-2">
          <Handshake className="size-5 text-fg" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg">{t('Entrar a Rapport')}</h1>
        <p className="mt-1 text-[13px] text-fg-subtle">{t('CRM y pipeline de ventas de la agencia.')}</p>

        <div className="mt-6 space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Email</span>
            <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">{t('Contraseña')}</span>
            <input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </label>
        </div>

        <Button type="submit" variant="primary" className="mt-6 h-10 w-full" disabled={loading}>
          {loading ? t('Entrando…') : t('Entrar')}
        </Button>
        <p className="mt-4 rounded-lg border border-dashed border-line px-3 py-2 text-center text-[11.5px] text-fg-subtle">
          {t('Demo: los datos son de ejemplo y cualquier contraseña funciona.')}
        </p>
      </form>
    </div>
  );
}
