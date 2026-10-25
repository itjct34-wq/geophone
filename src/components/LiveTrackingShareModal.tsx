import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Share2, X, Copy, Check, Smartphone, ExternalLink, MessageSquare, QrCode, ShieldCheck, Loader2, Mail, Send } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { createShare, shareUrl, type ShareSession } from '../services/shareService';
import { parsePhoneNumber } from '../services/phoneParser';

interface LiveTrackingShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Number the invitation is addressed to (optional, used for WhatsApp/SMS). */
  targetNumber: string;
  /** Called after a link is created so the live list can refresh. */
  onCreated?: (session: ShareSession) => void;
}

export const LiveTrackingShareModal: React.FC<LiveTrackingShareModalProps> = ({
  isOpen,
  onClose,
  targetNumber,
  onCreated,
}) => {
  const { user } = useAuth();
  const [requestedBy, setRequestedBy] = useState('');
  const [label, setLabel] = useState('');
  const [session, setSession] = useState<ShareSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  // Start fresh each time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setSession(null);
    setError('');
    setLabel('');
    setRequestedBy(user?.email.split('@')[0] ?? '');
  }, [isOpen, user]);

  const url = session ? shareUrl(session.token) : '';

  useEffect(() => {
    if (!url) {
      setQr('');
      return;
    }
    QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: '#020617', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);

  if (!isOpen) return null;

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      // Tie the link to the number so its last shared position shows up when the number is looked up
      const parsed = parsePhoneNumber(targetNumber);
      const created = await createShare(label.trim(), requestedBy.trim(), parsed.isValid ? parsed.e164 : undefined);
      setSession(created);
      onCreated?.(created);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setError(
        /row-level security|violates/i.test(raw)
          ? 'This link could not be created. Check that you have paid access, have accepted the Terms at the top of the page, that this number is not blocked, and that you are under today’s link limit.'
          : raw || 'Could not create the link.',
      );
    } finally {
      setBusy(false);
    }
  };

  let digits = targetNumber.replace(/\D/g, '');
  if (digits.startsWith('03')) digits = '92' + digits.slice(1);

  const who = requestedBy.trim() || 'Someone';
  const message = `Hi, it's ${who}. I'd like to see your location on GeoPhone. You choose what to share and can stop at any time: ${url}`;
  const shortLabel = url.replace(/^https?:\/\//, '');
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Hi, it's ${who}. I'd like to see your location on GeoPhone. You choose what to share and can stop at any time.`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`${who} is asking to see your location`)}&body=${encodeURIComponent(message)}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const nativeShare = () => navigator.share({ title: `${who} is asking to see your location`, text: message, url }).catch(() => undefined);
  const whatsappUrl = `https://api.whatsapp.com/send?${digits ? `phone=${digits}&` : ''}text=${encodeURIComponent(message)}`;
  const smsUrl = `sms:${digits}?body=${encodeURIComponent(message)}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Ask someone to share their location" className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-100">Ask someone to share their location</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-slate-100 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>How it works</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              The person opens your link, sees who is asking, and chooses to tap <strong className="text-emerald-400">Share my location</strong> and allow their browser's prompt. Their phone's GPS then sends its position to your map while their page stays open. They can stop at any time, and the link expires after 24 hours. Only share with people who agree.
            </p>
          </div>

          {!session ? (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-slate-300 font-medium">Your name (shown to them)</span>
                <input
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  maxLength={60}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-300 font-medium">Note for you (optional, for example "Ali, delivery")</span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={80}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </label>
              {error && <p role="alert" className="text-rose-400">{error}</p>}
              <button
                onClick={create}
                disabled={busy || !requestedBy.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 rounded-lg transition-colors"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Create link</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* What the person will receive */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">What they will receive</span>
                <div className="max-w-sm ml-auto bg-emerald-900/40 border border-emerald-800/50 rounded-2xl rounded-tr-sm px-3.5 py-2.5 space-y-2">
                  <p className="text-[13px] text-slate-100 leading-snug">
                    Hi, it's {who}. I'd like to see your location on GeoPhone. You choose what to share and can stop at any time:
                  </p>
                  <div className="rounded-lg bg-slate-950/60 border border-slate-700/60 px-3 py-2">
                    <p className="text-[12px] font-semibold text-slate-100">{who} is asking to see your location</p>
                    <p className="text-[11px] text-slate-400">Open the link, see who is asking, and choose exactly what to share.</p>
                    <p className="text-[11px] text-cyan-300 font-mono truncate">{shortLabel}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={smsUrl}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>SMS</span>
                </a>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </a>
                <a
                  href={emailUrl}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </a>
                {canNativeShare && (
                  <button
                    onClick={nativeShare}
                    className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share with another app</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All of these are free: they open your own app with the message ready, and you press send there. The
                app cannot send texts by itself without a paid SMS service.
              </p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-200">Link</span>
                  <button onClick={() => copy(url)} className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[12px] text-cyan-300 break-all">{shortLabel}</div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-5">
                {qr ? (
                  <div className="p-2 bg-white rounded-xl shrink-0">
                    <img src={qr} alt="QR code for the sharing link" className="w-32 h-32 object-contain" />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center shrink-0">
                    <QrCode className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <p className="text-slate-400 leading-relaxed">
                  Someone nearby can scan this with their camera. Their position will appear in <strong className="text-slate-200">Shared locations</strong> on the Live Device GPS tab as soon as they agree.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors">
            {session ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
