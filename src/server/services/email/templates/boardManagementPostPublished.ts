export interface BoardManagementPostPublishedEmailTemplateParams {
  tenantName?: string | null;
  postTitle: string;
  categoryName?: string | null;
  boardPostUrl: string;
}

export const buildBoardManagementPostPublishedEmailTemplate = (
  params: BoardManagementPostPublishedEmailTemplateParams,
): { subject: string; text: string } => {
  const { tenantName, postTitle, categoryName, boardPostUrl } = params;

  const appLabel =
    tenantName && tenantName.trim().length > 0
      ? `HarmoNet (${tenantName})`
      : 'HarmoNet';

  const subject = '【HarmoNet】管理組合から新しいお知らせが投稿されました';

  const textLines = [
    `${appLabel} よりお知らせです。`,
    '',
    '管理組合から新しいお知らせが投稿されました。',
    '',
    ...(categoryName && categoryName.trim().length > 0
      ? [`カテゴリ: ${categoryName}`, '']
      : []),
    `タイトル: ${postTitle}`,
    '',
    '内容は下記より確認できます。',
    boardPostUrl,
    '',
    '※本メールに心当たりがない場合は、このメールを破棄してください。',
  ];

  return {
    subject,
    text: textLines.join('\n'),
  };
};
