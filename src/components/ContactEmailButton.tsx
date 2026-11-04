import React, { useState, useRef, useEffect } from 'react';
import { 
  Mail, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface ContactEmailButtonProps {
  email?: string;
  subject?: string;
  body?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  showEmailAddress?: boolean;
}

export const ContactEmailButton: React.FC<ContactEmailButtonProps> = ({
  email = 'shpetxst@gmail.com',
  subject = 'Inquiry - SHPE Texas State University',
  body = 'Hello SHPE Texas State Team,\n\n',
  label = 'Contact via Email',
  className = '',
  size = 'md',
  variant = 'primary',
  showEmailAddress = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = email;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getGmailUrl = () => {
    const encodedEmail = encodeURIComponent(email);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedEmail}&su=${encodedSubject}&body=${encodedBody}`;
  };

  const getOutlookOfficeUrl = () => {
    const encodedEmail = encodeURIComponent(email);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    // Texas State university Microsoft 365 Outlook deep-link compose URL
    return `https://outlook.office.com/mail/deeplink/compose?to=${encodedEmail}&subject=${encodedSubject}&body=${encodedBody}`;
  };

  const getOutlookLiveUrl = () => {
    const encodedEmail = encodeURIComponent(email);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodedEmail}&subject=${encodedSubject}&body=${encodedBody}`;
  };

  const getMailtoUrl = () => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  // Size styling
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  // Variant styling
  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm border border-transparent',
    secondary: 'bg-primary-100 hover:bg-primary-200 text-primary-900 border border-primary-200',
    outline: 'bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 hover:border-primary-500 shadow-xs',
    ghost: 'bg-transparent hover:bg-gray-100 text-primary-700 hover:text-primary-900',
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center space-x-2 font-bold rounded-xl transition-all cursor-pointer group ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        aria-expanded={isOpen}
      >
        <Mail className="w-4 h-4 text-accent-300 group-hover:scale-110 transition-transform flex-shrink-0" />
        <span className="truncate">{label}</span>
        {showEmailAddress && (
          <span className="text-xs font-mono opacity-80 hidden sm:inline">
            ({email})
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 opacity-80 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Interactive Contact Options Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-200/80 p-3 z-50 animate-scale-up text-left">
          <div className="px-3 py-2 border-b border-gray-100 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                Send Email To
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="text-[11px] font-bold text-primary-600 hover:text-primary-800 flex items-center space-x-1"
                title="Copy email to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-xs font-mono font-bold text-gray-900 break-all select-all mt-0.5">
              {email}
            </div>
          </div>

          <div className="space-y-1">
            {/* 1. Gmail Web */}
            <a
              href={getGmailUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-primary-50 text-gray-800 hover:text-primary-900 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 group-hover:text-primary-800">
                    Open in Gmail
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Launch mail.google.com compose window
                  </div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-600" />
            </a>

            {/* 2. Texas State / Microsoft 365 Outlook */}
            <a
              href={getOutlookOfficeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 text-gray-800 hover:text-blue-900 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 7.643v10.286A2.071 2.071 0 0 1 21.929 20H8.071A2.071 2.071 0 0 1 6 17.929V15.5l8.286-4.571L6 6.357V4.071A2.071 2.071 0 0 1 8.071 2h13.858A2.071 2.071 0 0 1 24 4.071v3.572zM0 13.5l6-3.333v7.666L0 14.5v-1zM0 8.5l6-3.333v3.333L0 11.833V8.5z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 group-hover:text-blue-800 flex items-center gap-1">
                    <span>Texas State Outlook</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">Bobcat Mail</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Launch outlook.office.com webmail
                  </div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
            </a>

            {/* 3. Personal Outlook.com */}
            <a
              href={getOutlookLiveUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 text-gray-800 hover:text-sky-900 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 group-hover:text-sky-800">
                    Personal Outlook / Hotmail
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Launch outlook.live.com webmail
                  </div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-sky-600" />
            </a>

            {/* 4. Default Mail App (Mailto) */}
            <a
              href={getMailtoUrl()}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 text-gray-800 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">
                    Default Email App
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Apple Mail, Thunderbird, Windows Mail
                  </div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </a>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 px-2 flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Pre-filled subject line
            </span>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="font-bold text-primary-700 hover:underline"
            >
              {copied ? 'Copied!' : 'Copy Address'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactEmailButton;
