import React from 'react';

function makeIcon(name: string) {
  const Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg aria-label={name} {...props} />
  );
  Icon.displayName = name;
  return Icon;
}

export const Loader2 = makeIcon('Loader2');
export const CheckCircle = makeIcon('CheckCircle');
export const AlertCircle = makeIcon('AlertCircle');
export const KeyRound = makeIcon('KeyRound');

export const Mail = makeIcon('Mail');
export const CheckCircle2 = makeIcon('CheckCircle2');
export const Bell = makeIcon('Bell');
export const MessageSquare = makeIcon('MessageSquare');
export const Calendar = makeIcon('Calendar');
export const FileText = makeIcon('FileText');
export const Settings = makeIcon('Settings');
export const MoreHorizontal = makeIcon('MoreHorizontal');
export const Home = makeIcon('Home');
export const ClipboardList = makeIcon('ClipboardList');
export const Users = makeIcon('Users');
export const User = makeIcon('User');
export const LogOut = makeIcon('LogOut');

export default {
  Loader2,
  CheckCircle,
  AlertCircle,
  KeyRound,
  Mail,
  CheckCircle2,
  Bell,
  MessageSquare,
  Calendar,
  FileText,
  Settings,
  MoreHorizontal,
  Home,
  ClipboardList,
  Users,
  User,
  LogOut,
};
