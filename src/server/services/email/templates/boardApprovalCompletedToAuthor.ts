export interface BoardApprovalCompletedToAuthorEmailTemplateParams {
  fullName: string;
  tenantName?: string | null;
  postTitle: string;
  boardPostUrl: string;
}

export const buildBoardApprovalCompletedToAuthorEmailTemplate = (
  params: BoardApprovalCompletedToAuthorEmailTemplateParams,
): { subject: string; text: string } => {
  const { fullName, tenantName, postTitle, boardPostUrl } = params;

  const appLabel =
    tenantName && tenantName.trim().length > 0
      ? `HarmoNet (${tenantName})`
      : 'HarmoNet';

  const subject = '【HarmoNet】投稿の承認が完了しました';

  const normalizedFullName = fullName.trim();
  const greetingLine = normalizedFullName.length > 0 ? `${normalizedFullName} 様` : null;

  const textLines = [
    ...(greetingLine ? [greetingLine, ''] : []),
    `${appLabel} にて、あなたの投稿が承認されました。`,
    '',
    `投稿タイトル: ${postTitle}`,
    '',
    '投稿内容は下記より確認できます。',
    boardPostUrl,
    '',
    '※本メールに心当たりがない場合は、このメールを破棄してください。',
  ];

  return {
    subject,
    text: textLines.join('\n'),
  };
};
