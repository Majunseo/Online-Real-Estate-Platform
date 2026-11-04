import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * 지도 영역의 오류 울타리. 네이버 지도 스크립트가 (키 인증 실패 등으로) 오류를 던져도 페이지 전체가 꺼지지 않고
 * 이 영역만 fallback(지역 단추 · "지도를 불러오지 못했어요" 안내)으로 바뀐다.
 */
export class MapErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[지도] 오류가 나서 대신 안내 화면을 보여 줘요", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
