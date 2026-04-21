import React from 'react';
import { Icon } from './Icon';

interface IconComponentProps {
  className?: string;
  title?: string;
}

export const Plus: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>' />
);

export const Edit: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' />
);

export const Trash2: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>' />
);

export const Download: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>' />
);

export const Settings: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' />
);

export const FileSpreadsheet: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h2"></path><path d="M8 17h2"></path><path d="M14 13h2"></path><path d="M14 17h2"></path>' />
);

export const RotateCcw: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>' />
);

export const Calendar: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>' />
);

export const Tag: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>' />
);

export const User: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>' />
);

export const DollarSign: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>' />
);

export const Store: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>' />
);

export const Printer: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>' />
);

export const Check: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="20 6 9 17 4 12"></polyline>' />
);

export const X: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>' />
);

export const AlertCircle: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' />
);

export const Save: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>' />
);

export const Upload: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>' />
);

export const AlertTriangle: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>' />
);

export const Search: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>' />
);

export const Copy: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' />
);

export const Home: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>' />
);

export const ChevronLeft: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="15 18 9 12 15 6"></polyline>' />
);

export const ChevronRight: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="9 18 15 12 9 6"></polyline>' />
);

export const ChevronDown: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="6 9 12 15 18 9"></polyline>' />
);

export const Clock: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' />
);

export const CheckSquare: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' />
);

export const Bell: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' />
);

export const ZoomIn: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line>' />
);

export const ZoomOut: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line>' />
);

export const Cloud: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>' />
);

export const CloudUpload: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line>' />
);

export const HardDrive: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line>' />
);

export const Wifi: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>' />
);

export const WifiOff: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>' />
);

export const Globe: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>' />
);

export const TrendingUp: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>' />
);

export const TrendingDown: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline>' />
);

export const BarChart2: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>' />
);

export const PieChart: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>' />
);

export const CloudOff: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><line x1="1" y1="1" x2="23" y2="23"></line>' />
);

export const RefreshCw: React.FC<IconComponentProps> = (props) => (
  <Icon {...props} path='<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>' />
);
