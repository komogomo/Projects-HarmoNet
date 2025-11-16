export type PasskeyAuthErrorType =
  | 'error_network'
  | 'error_denied'
  | 'error_origin'
  | 'error_auth'
  | 'error_unexpected';

export interface PasskeyAuthError {
  code: string;
  message: string;
  type: PasskeyAuthErrorType;
}

export interface PasskeyAuthTriggerProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: PasskeyAuthError) => void;
  testId?: string;
}

export type PasskeyAuthState =
  | 'idle'
  | 'processing'
  | 'success'
  | 'error_network'
  | 'error_denied'
  | 'error_origin'
  | 'error_auth'
  | 'error_unexpected';
