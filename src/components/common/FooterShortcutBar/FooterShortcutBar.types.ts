export type UserRole = 'system_admin' | 'tenant_admin' | 'general_user';

export interface FooterShortcutBarProps {
  role: UserRole;
  className?: string;
  testId?: string;
}
