export type MagicLinkErrorType =
  | 'error_input'
  | 'error_network'
  | 'error_auth'
  | 'error_unexpected';

export interface MagicLinkError {
  code: string;
  message: string;
  type: MagicLinkErrorType;
}

export interface MagicLinkFormProps {
  /** レイアウト調整用の追加クラス（任意） */
  className?: string;

  /** MagicLink 送信完了時の通知コールバック（任意） */
  onSent?: () => void;

  /** 重要なエラー発生時の通知コールバック（任意） */
  onError?: (error: MagicLinkError) => void;

  redirectTo?: string;

  /** サインイン完了後にクライアント側で遷移させたいパス（任意） */
  signedInRedirectTo?: string;
}

export type MagicLinkFormState =
  | 'idle'
  | 'sending'
  | 'sent'
  | 'error_input'
  | 'error_network'
  | 'error_auth'
  | 'error_unexpected';
