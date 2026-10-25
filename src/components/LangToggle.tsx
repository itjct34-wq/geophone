import React from 'react';
import { Languages } from 'lucide-react';
import { useI18n } from '../i18n';

/** Small English ⇄ اردو switch. Shows the language it will switch TO. */
export const LangToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { toggle, t } = useI18n();
  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 h-8 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white ${className ?? ''}`}
      aria-label="Switch language / زبان تبدیل کریں"
    >
      <Languages className="h-3.5 w-3.5" aria-hidden="true" />
      {t('langName')}
    </button>
  );
};
