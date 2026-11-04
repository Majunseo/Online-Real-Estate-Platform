import { quietly, type NaverMaps } from "./naverMaps";

/** 네이버 거리뷰(Panorama) 도우미. 지도 스크립트를 submodules=panorama 로 불러온 뒤에 쓴다 */

export interface Spot {
  lat: number;
  lng: number;
}

const RAD = Math.PI / 180;

/** from 에서 to 쪽 방향 (북쪽 0°, 시계 방향) */
function bearing(from: Spot, to: Spot): number {
  const y = Math.sin((to.lng - from.lng) * RAD) * Math.cos(to.lat * RAD);
  const x = Math.cos(from.lat * RAD) * Math.sin(to.lat * RAD) - Math.sin(from.lat * RAD) * Math.cos(to.lat * RAD) * Math.cos((to.lng - from.lng) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** from 에서 heading(도) 쪽으로 meters 만큼 간 곳 (짧은 거리라 평면으로 계산) */
function move(from: Spot, heading: number, meters: number): Spot {
  const dLat = (meters * Math.cos(heading * RAD)) / 111_320;
  const dLng = (meters * Math.sin(heading * RAD)) / (111_320 * Math.cos(from.lat * RAD));
  return { lat: from.lat + dLat, lng: from.lng + dLng };
}

/** 거리뷰 사진 정보. photodate 는 "2025-05-14 12:30:48" 꼴 (getLocation() 이 준다) */
export interface PanoLocation {
  title?: string;
  photodate?: string;
}

/**
 * target 근처의 거리뷰를 el 에 연다. 처음 사진이 정해지면 target(단지) 쪽을 바라보게 돌린다
 * (그 뒤 이용자가 옮겨 다닐 때는 보던 방향을 그대로 둔다).
 * 근처에 거리뷰 사진이 없으면 onMissing, 사진이 바뀔 때마다 onLocation(촬영일 등).
 */
export function openPanorama(m: NaverMaps, el: HTMLElement, target: Spot, options: object = {}, onMissing?: () => void, onLocation?: (loc: PanoLocation) => void) {
  const pano = new m.Panorama(el, { position: new m.LatLng(target.lat, target.lng), pov: { pan: 0, tilt: 0, fov: 100 }, ...options });
  let aimed = false;
  m.Event.addListener(pano, "pano_status", (status: string) => status !== "OK" && onMissing?.());
  m.Event.addListener(pano, "pano_changed", () => {
    const p = pano.getPosition();
    if (p && !aimed) {
      aimed = true;
      pano.setPov({ pan: bearing({ lat: p.lat(), lng: p.lng() }, target), tilt: 0, fov: 100 });
    }
    onLocation?.(pano.getLocation?.() ?? {});
  });
  return pano;
}

const CAMERA_M = 2.5; // 거리뷰 카메라 높이 (차 지붕 위 정도로 잡는다)
const STEP_MIN_M = 10; // 이보다 가까우면 거의 늘 같은 사진에 머문다
const STEP_RETRY_M = 12; // 같은 사진에 머물면 이만큼 더 멀리 다시 (사진 간격이 10m 안팎이라)
const STEP_RETRIES = 3;
const STEP_MAX_M = 40;
const STEP_SKY_M = 15; // 지평선 위를 누르면 이만큼 앞으로

/**
 * 거리뷰 화면을 누른 쪽으로 이동한다 (끌어서 돌리는 것과는 구분한다: 거의 움직이지 않고 짧게 누른 것만).
 * 누른 점의 좌우 위치로 방향을, 지평선 아래로 내려간 정도로 거리(카메라 높이 ÷ tan 내려본 각)를 잡아
 * 그만큼 떨어진 곳으로 위치를 옮기면, 네이버가 그 근처의 거리뷰 사진으로 바꾼다. 보던 방향은 그대로 둔다.
 * 거리뷰의 화살표 · 확대 단추처럼 사진이 아닌 곳을 누른 것은 건드리지 않는다. 떼어 낼 함수를 돌려준다.
 */
/**
 * 누른 곳이 거리뷰 사진 면인지. 네이버 거리뷰는 브라우저에 따라 canvas(WebGL) 또는 CSS 3D 정육면체(class "cube…" div)로 그린다.
 * 화살표(class "arrow…")는 네이버가 스스로 이동시키므로 빼야 두 번 움직이지 않는다.
 */
function isPhoto(target: EventTarget | null): boolean {
  if (!(target instanceof Element) || target.closest('[class*="arrow"]')) return false;
  return target instanceof HTMLCanvasElement || Boolean(target.closest('[class^="cube"], [class*=" cube"]'));
}

export function enableClickToMove(m: NaverMaps, pano: NaverMaps, el: HTMLElement): () => void {
  let down: { x: number; y: number; t: number } | null = null;
  let keepPov: object | null = null; // 다음 사진이 열리면 다시 맞출 방향
  let retry = 0;
  const changed = m.Event.addListener(pano, "pano_changed", () => {
    if (keepPov) pano.setPov(keepPov);
    keepPov = null;
  });
  const onDown = (e: PointerEvent) => {
    down = e.isPrimary && e.button === 0 ? { x: e.clientX, y: e.clientY, t: Date.now() } : null;
  };
  const onUp = (e: PointerEvent) => {
    const start = down;
    down = null;
    if (!start || !isPhoto(e.target)) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6 || Date.now() - start.t > 500) return; // 끌기
    const rect = el.getBoundingClientRect();
    const pov = pano.getPov?.() as { pan: number; tilt: number; fov: number } | undefined;
    const p = pano.getPosition?.();
    if (!pov || !p || !rect.width || !rect.height) return;
    // 화면 좌우 · 위아래 위치 → 보는 방향 기준 각도 (fov 를 가로 시야로 본다)
    const halfH = Math.tan((pov.fov / 2) * RAD);
    const halfV = halfH * (rect.height / rect.width);
    const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    const heading = (pov.pan + Math.atan(nx * halfH) / RAD + 360) % 360;
    const below = Math.atan(ny * halfV) / RAD - pov.tilt; // 지평선 아래로 내려본 각 (tilt 는 위로 볼수록 +)
    const meters = below > 2 ? Math.min(STEP_MAX_M, Math.max(STEP_MIN_M, CAMERA_M / Math.tan(below * RAD))) : STEP_SKY_M;
    const from = { lat: p.lat(), lng: p.lng() };
    const fromId = pano.getPanoId?.();
    // 가까운 곳을 누르면 네이버가 지금 사진을 그대로 고를 수 있다. 사진이 그대로면 조금씩 더 멀리 다시 옮긴다
    const step = (dist: number, left: number) => {
      const to = move(from, heading, dist);
      keepPov = { ...pov }; // 사진이 바뀌어도 보던 방향 유지
      pano.setPosition(new m.LatLng(to.lat, to.lng));
      if (left > 0) retry = window.setTimeout(() => pano.getPanoId?.() === fromId && step(Math.min(STEP_MAX_M, dist + STEP_RETRY_M), left - 1), 900);
    };
    window.clearTimeout(retry);
    step(meters, STEP_RETRIES);
  };
  el.addEventListener("pointerdown", onDown, true);
  el.addEventListener("pointerup", onUp, true);
  return () => {
    window.clearTimeout(retry);
    quietly(() => m.Event.removeListener(changed));
    el.removeEventListener("pointerdown", onDown, true);
    el.removeEventListener("pointerup", onUp, true);
  };
}
