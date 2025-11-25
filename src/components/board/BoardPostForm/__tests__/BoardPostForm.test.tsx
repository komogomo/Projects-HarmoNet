import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import BoardPostForm from '../BoardPostForm';

const pushMock = jest.fn();
const backMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

jest.mock('@/src/components/common/StaticI18nProvider/StaticI18nProvider', () => ({
  useStaticI18n: () => ({
    t: (key: string) => key,
    locale: 'ja',
    currentLocale: 'ja',
    setLocale: () => {},
  }),
}));

jest.mock('@/src/lib/logging/log.util', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe('BoardPostForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    backMock.mockClear();
    (globalThis as any).fetch = jest.fn();
  });

  test('フォームの主要要素がレンダリングされる', () => {
    render(
      <BoardPostForm
        tenantId="tenant-1"
        viewerUserId="user-1"
        viewerRole="user"
        isManagementMember={false}
        categories={[
          { key: 'important', label: '重要なお知らせ' },
          { key: 'question', label: '質問・相談' },
        ]}
      />,
    );

    expect(screen.getByTestId('board-post-form')).toBeInTheDocument();
    expect(screen.getByTestId('board-post-form-category')).toBeInTheDocument();
    expect(screen.getByTestId('board-post-form-title')).toBeInTheDocument();
    expect(screen.getByTestId('board-post-form-content')).toBeInTheDocument();
    expect(screen.getByTestId('board-post-form-submit-button')).toBeInTheDocument();
    expect(screen.getByTestId('board-post-form-attachment-input')).toBeInTheDocument();
  });

  test('不許可拡張子の添付ファイルを選択すると添付エラーと添付用サマリが表示される', () => {
    const fetchMock = global.fetch as jest.Mock;

    render(
      <BoardPostForm
        tenantId="tenant-1"
        viewerUserId="user-1"
        viewerRole="user"
        isManagementMember={false}
        categories={[
          { key: 'important', label: '重要なお知らせ' },
          { key: 'question', label: '質問・相談' },
        ]}
      />,
    );

    const fileInput = screen.getByTestId('board-post-form-attachment-input') as HTMLInputElement;
    const invalidFile = new File(['dummy'], 'malware.exe', { type: 'application/octet-stream' });

    fireEvent.change(fileInput, {
      target: { files: [invalidFile] },
    });

    fireEvent.click(screen.getByTestId('board-post-form-submit-button'));

    expect(screen.getByText('board.postForm.error.attachment.invalidType')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('添付ファイルが最大数を超えて選択された場合にエラーが表示される', () => {
    render(
      <BoardPostForm
        tenantId="tenant-1"
        viewerUserId="user-1"
        viewerRole="user"
        isManagementMember={false}
        categories={[
          { key: 'important', label: '重要なお知らせ' },
          { key: 'question', label: '質問・相談' },
        ]}
      />,
    );

    const fileInput = screen.getByTestId('board-post-form-attachment-input') as HTMLInputElement;

    const initialFiles = [
      new File(['dummy'], 'file1.pdf', { type: 'application/pdf' }),
      new File(['dummy'], 'file2.pdf', { type: 'application/pdf' }),
      new File(['dummy'], 'file3.pdf', { type: 'application/pdf' }),
      new File(['dummy'], 'file4.pdf', { type: 'application/pdf' }),
      new File(['dummy'], 'file5.pdf', { type: 'application/pdf' }),
    ];

    fireEvent.change(fileInput, {
      target: { files: initialFiles },
    });

    const extraFile = new File(['dummy'], 'file6.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, {
      target: { files: [extraFile] },
    });

    expect(
      screen.getByText('board.postForm.error.attachment.tooMany'),
    ).toBeInTheDocument();
    expect(screen.queryByText('file6.pdf')).not.toBeInTheDocument();
  });

  test('許可された添付ファイルを選択すると確認ダイアログのプレビューにファイル名が表示される', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ postId: 'post-123' }),
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <BoardPostForm
        tenantId="tenant-1"
        viewerUserId="user-1"
        viewerRole="user"
        isManagementMember={false}
        categories={[
          { key: 'important', label: '重要なお知らせ' },
          { key: 'question', label: '質問・相談' },
        ]}
      />,
    );

    fireEvent.change(screen.getByTestId('board-post-form-category'), {
      target: { value: 'question' },
    });

    fireEvent.click(screen.getByTestId('board-post-form-displayname-nickname'));

    fireEvent.change(screen.getByTestId('board-post-form-title'), {
      target: { value: 'タイトル' },
    });

    fireEvent.change(screen.getByTestId('board-post-form-content'), {
      target: { value: '本文テキスト' },
    });

    const fileInput = screen.getByTestId('board-post-form-attachment-input') as HTMLInputElement;
    const validFile = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, {
      target: { files: [validFile] },
    });

    fireEvent.click(screen.getByTestId('board-post-form-submit-button'));

    const dialog = await screen.findByTestId('board-post-form-confirm');
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText('board.postForm.confirm.preview.attachment'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('document.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('board-post-form-confirm-ok'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/board');
    });
  });

  test('モデレーションで mask が返ってきた場合、伏字内容と専用ボタンが表示される', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        errorCode: 'ai_moderation_masked',
        maskedTitle: '***タイトル***',
        maskedContent: '***本文***',
      }),
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <BoardPostForm
        tenantId="tenant-1"
        viewerUserId="user-1"
        viewerRole="user"
        isManagementMember={false}
        categories={[
          { key: 'important', label: '重要なお知らせ' },
          { key: 'question', label: '質問・相談' },
        ]}
      />,
    );

    fireEvent.change(screen.getByTestId('board-post-form-category'), {
      target: { value: 'question' },
    });

    fireEvent.click(screen.getByTestId('board-post-form-displayname-nickname'));

    fireEvent.change(screen.getByTestId('board-post-form-title'), {
      target: { value: 'タイトル' },
    });

    fireEvent.change(screen.getByTestId('board-post-form-content'), {
      target: { value: '本文テキスト' },
    });

    fireEvent.click(screen.getByTestId('board-post-form-submit-button'));

    expect(await screen.findByTestId('board-post-form-confirm')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('board-post-form-confirm-ok'));

    expect(await screen.findByTestId('board-post-form-error-summary')).toBeInTheDocument();
    expect(
      screen.getByText('board.postForm.error.submit.moderation.masked'),
    ).toBeInTheDocument();

    const titleInput = screen.getByTestId('board-post-form-title') as HTMLInputElement;
    const contentTextarea = screen.getByTestId('board-post-form-content') as HTMLTextAreaElement;
    expect(titleInput.value).toBe('***タイトル***');
    expect(contentTextarea.value).toBe('***本文***');

    expect(screen.getByTestId('board-post-form-submit-masked-button')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  test('mask 後に「この伏字済み内容で投稿」を押すと forceMasked=true で送信される', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          errorCode: 'ai_moderation_masked',
          maskedTitle: '***タイトル***',
          maskedContent: '***本文***',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ postId: 'post-456' }),
      });
    (globalThis as any).fetch = fetchMock;

    render(
      <BoardPostForm
        tenantId="tenant-1"
        viewerUserId="user-1"
        viewerRole="user"
        isManagementMember={false}
        categories={[
          { key: 'important', label: '重要なお知らせ' },
          { key: 'question', label: '質問・相談' },
        ]}
      />,
    );

    fireEvent.change(screen.getByTestId('board-post-form-category'), {
      target: { value: 'question' },
    });

    fireEvent.click(screen.getByTestId('board-post-form-displayname-nickname'));

    fireEvent.change(screen.getByTestId('board-post-form-title'), {
      target: { value: 'タイトル' },
    });

    fireEvent.change(screen.getByTestId('board-post-form-content'), {
      target: { value: '本文テキスト' },
    });

    fireEvent.click(screen.getByTestId('board-post-form-submit-button'));

    expect(await screen.findByTestId('board-post-form-confirm')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('board-post-form-confirm-ok'));

    expect(await screen.findByTestId('board-post-form-submit-masked-button')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('board-post-form-submit-masked-button'));

    expect(await screen.findByTestId('board-post-form-confirm')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('board-post-form-confirm-ok'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(pushMock).toHaveBeenCalledWith('/board');
    });

    const secondCall = fetchMock.mock.calls[1];
    const secondRequestInit = secondCall[1] as RequestInit;
    const body = secondRequestInit.body as any;
    expect(body).toBeDefined();
    expect(typeof body.get).toBe('function');
    expect(body.get('forceMasked')).toBe('true');
  });

  test('未入力で送信すると API は呼ばれない', () => {
    const fetchMock = global.fetch as jest.Mock;

    render(
      <BoardPostForm
        tenantId="tenant-1"
        viewerUserId="user-1"
        viewerRole="user"
        isManagementMember={false}
        categories={[
          { key: 'important', label: '重要なお知らせ' },
          { key: 'question', label: '質問・相談' },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('board-post-form-submit-button'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('有効な入力で送信すると API が呼ばれ、成功時に push される', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ postId: 'post-123' }),
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <BoardPostForm
        tenantId="tenant-1"
        viewerUserId="user-1"
        viewerRole="user"
        isManagementMember={false}
        categories={[
          { key: 'important', label: '重要なお知らせ' },
          { key: 'question', label: '質問・相談' },
        ]}
      />,
    );

    fireEvent.change(screen.getByTestId('board-post-form-category'), {
      target: { value: 'question' },
    });

    fireEvent.click(screen.getByTestId('board-post-form-displayname-nickname'));

    fireEvent.change(screen.getByTestId('board-post-form-title'), {
      target: { value: 'タイトル' },
    });

    fireEvent.change(screen.getByTestId('board-post-form-content'), {
      target: { value: '本文テキスト' },
    });

    fireEvent.click(screen.getByTestId('board-post-form-submit-button'));

    expect(await screen.findByTestId('board-post-form-confirm')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('board-post-form-confirm-ok'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/board');
    });
  });
});
