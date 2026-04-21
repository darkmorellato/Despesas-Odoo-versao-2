import React from 'react';

export const SettingsIcon3D: React.FC = () => (
  <div className="relative w-12 h-12 -m-1 group cursor-pointer transition-transform hover:rotate-45 duration-700 ease-in-out">
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg filter">
      <defs>
        <linearGradient id="gearMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="50%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
        <linearGradient id="gearInner" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#f3f4f6" />
        </linearGradient>
      </defs>
      <g transform="translate(38, 38)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
          <rect key={deg} x="-6" y="-38" width="12" height="76" rx="2" fill="url(#gearMetal)" transform={`rotate(${deg})`} />
        ))}
        <circle cx="0" cy="0" r="28" fill="url(#gearMetal)" stroke="#9ca3af" strokeWidth="1"/>
        <circle cx="0" cy="0" r="18" fill="transparent" stroke="url(#gearInner)" strokeWidth="4" />
        <circle cx="0" cy="0" r="12" fill="#F3F4F6" />
      </g>
      <g transform="translate(75, 75)">
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <rect key={deg} x="-5" y="-24" width="10" height="48" rx="2" fill="url(#gearMetal)" transform={`rotate(${deg})`} />
        ))}
        <circle cx="0" cy="0" r="18" fill="url(#gearMetal)" stroke="#9ca3af" strokeWidth="1"/>
        <circle cx="0" cy="0" r="10" fill="transparent" stroke="url(#gearInner)" strokeWidth="3" />
        <circle cx="0" cy="0" r="6" fill="#F3F4F6" />
      </g>
    </svg>
  </div>
);
