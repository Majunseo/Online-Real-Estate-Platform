import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getJson } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";

interface InboxCountState {
  unread: number;
  setUnread: (n: number) => void;
  /** 서버가 메시지를 보냈을 만한 일(매물 등록 · 문의) 뒤에 다시 센다 */
  refresh: () => void;
}

const InboxCountContext = createContext<InboxCountState>({ unread: 0, setUnread: () => {}, refresh: () => {} });

/** 안 읽은 메시지 수. 왼쪽 아이콘 줄의 숫자와 메시지 화면이 같은 값을 본다 */
export function InboxCountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(() => {
    if (!user) return setUnread(0);
    getJson<{ unread: number }>("/api/inbox-count")
      .then((r) => setUnread(r.unread))
      .catch(() => setUnread(0));
  }, [user]);
  useEffect(refresh, [refresh]);
  const value = useMemo(() => ({ unread, setUnread, refresh }), [unread, refresh]);
  return <InboxCountContext.Provider value={value}>{children}</InboxCountContext.Provider>;
}

export const useInboxCount = () => useContext(InboxCountContext);
