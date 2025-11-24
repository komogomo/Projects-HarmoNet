import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BoardTopPage from "../BoardTopPage";

const pushMock = jest.fn();

const useSearchParamsMock = jest.fn(() => new URLSearchParams());

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

jest.mock("@/src/components/common/StaticI18nProvider/StaticI18nProvider", () => ({
  useStaticI18n: () => ({
    t: (key: string) => key,
    locale: "ja",
    currentLocale: "ja",
    setLocale: () => {},
  }),
}));

jest.mock("@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts", () => ({
  HomeFooterShortcuts: () => <div data-testid="mock-home-footer-shortcuts" />,
}));

describe("BoardTopPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  test("デフォルトで 'all' タブがアクティブであること", () => {
    render(<BoardTopPage />);

    const allTab = screen.getByTestId("board-top-tab-all");
    expect(allTab.className).toContain("bg-blue-50");
  });

  test("タブ切替に応じて件数が変わること", () => {
    render(<BoardTopPage />);

    // デフォルト: all タブ → 1 件
    expect(screen.getAllByTestId("board-top-post-card")).toHaveLength(1);

    // important タグ → 1 件
    fireEvent.click(screen.getByTestId("board-top-tab-important"));
    expect(screen.getAllByTestId("board-top-post-card")).toHaveLength(1);

    // rules タグ → 0 件 + 空状態
    fireEvent.click(screen.getByTestId("board-top-tab-rules"));
    expect(screen.queryAllByTestId("board-top-post-card")).toHaveLength(0);
    expect(screen.getByTestId("board-top-empty-state")).toBeInTheDocument();
  });

  test("FAB 押下で /board/new に遷移しようとすること", () => {
    render(<BoardTopPage />);

    fireEvent.click(screen.getByTestId("board-top-fab"));
    expect(pushMock).toHaveBeenCalledWith("/board/new");
  });

  test("クエリパラメータ tab=important のとき important タブが初期アクティブになる", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("tab=important"));

    render(<BoardTopPage />);

    const importantTab = screen.getByTestId("board-top-tab-important");
    expect(importantTab.className).toContain("bg-blue-50");
  });
});
