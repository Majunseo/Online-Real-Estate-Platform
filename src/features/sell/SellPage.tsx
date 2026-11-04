import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Home, Trash2 } from "lucide-react";
import { DESCRIPTION_MAX, validateListing, type ListingErrors, type ListingInput } from "@shared/forms";
import type { ComplexDetail, Listing } from "@shared/types";
import { ApiError, getJson, postJson, sendJson } from "@/lib/api";
import { formatDate, formatManwon, toPyeong } from "@/lib/format";
import { Field } from "@/components/form/Field";
import { SelectField, TextAreaField } from "@/components/form/Controls";
import { Notice, Page, RequireLogin } from "@/components/page/Page";
import { useInboxCount } from "@/features/inbox/InboxCount";

interface Picked {
  id: string;
  name: string;
  address: string;
}

/** 내 집 내놓기: 내 아파트를 매물로 등록하고, 등록한 매물을 보고 지운다 (로그인 필요) */
export function SellPage() {
  return (
    <Page title="내 집 내놓기" description="단지와 동 · 호, 희망 가격을 등록해 두고 최근 실거래가와 비교해 보세요. 등록한 매물은 나만 볼 수 있어요." width="max-w-[1000px]">
      <RequireLogin what="내 집 내놓기">
        <SellBody />
      </RequireLogin>
    </Page>
  );
}

function SellBody() {
  const [mine, setMine] = useState<Listing[] | null>(null);
  useEffect(() => {
    getJson<{ items: Listing[] }>("/api/listings").then((r) => setMine(r.items));
  }, []);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <ListingForm onCreated={(item) => setMine((prev) => [item, ...(prev ?? [])])} />
      <section aria-labelledby="mine-title">
        <h2 id="mine-title" className="text-[20px] font-bold">
          내가 내놓은 매물 {mine ? `${mine.length}건` : ""}
        </h2>
        <div className="mt-3">
          {!mine ? (
            <p className="text-muted">불러오는 중…</p>
          ) : mine.length === 0 ? (
            <Notice icon={Home} title="아직 등록한 매물이 없어요" />
          ) : (
            <ul className="space-y-3">
              {mine.map((l) => (
                <li key={l.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/complex/${l.complexId}`} className="text-[18px] font-bold hover:underline">
                        {l.complexName}
                      </Link>
                      <p className="text-[14px] text-muted">{l.address}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`${l.complexName} ${l.building}동 ${l.unit}호 매물 지우기`}
                      onClick={async () => {
                        await sendJson("DELETE", `/api/listings/${l.id}`);
                        setMine((prev) => prev?.filter((x) => x.id !== l.id) ?? prev);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-band hover:text-tag"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-2 text-[16px]">
                    {l.building}동 {l.unit}호 · 전용 {l.areaM2}㎡ · {l.floor}층
                  </p>
                  <p className="text-[18px] font-extrabold">{formatManwon(l.price)}</p>
                  <p className="mt-1 text-[13px] text-muted">등록 {formatDate(l.createdAt.slice(0, 10))}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

const EMPTY = { building: "", unit: "", area: "", floor: "", price: "", contact: "", description: "" };

function ListingForm({ onCreated }: { onCreated: (l: Listing) => void }) {
  const [complex, setComplex] = useState<Picked | null>(null);
  const [detail, setDetail] = useState<ComplexDetail | null>(null);
  const areas = detail?.areas ?? [];
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState<ListingErrors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const { refresh } = useInboxCount();

  // 단지를 고르면 그 단지의 거래 내역을 받아 둔다: 면적 고르기 · 층 안내 · 최근 평균가에 쓴다
  useEffect(() => {
    if (!complex) return setDetail(null);
    getJson<ComplexDetail>(`/api/complexes/${encodeURIComponent(complex.id)}`).then(setDetail);
  }, [complex]);

  // 층 상한: 건축물대장의 최고층을 알면 그것으로 막는다. 모르면 거래된 층 중 가장 높은 층으로 안내만 한다
  const registryMax = detail?.complex.building?.maxFloor ?? null;
  const maxSeenFloor = detail?.deals.length ? Math.max(...detail.deals.map((d) => d.floor)) : null;
  const floorNum = Number(f.floor);
  const floorWarning =
    f.floor.trim() && registryMax !== null && floorNum > registryMax
      ? `이 단지의 최고층은 ${registryMax}층이에요 (건축물대장).`
      : f.floor.trim() && registryMax === null && maxSeenFloor !== null && floorNum > maxSeenFloor
        ? `거래 기록상 가장 높은 층(${maxSeenFloor}층)보다 높아요. 층수가 맞는지 확인해 주세요.`
        : null;
  const floorHint = registryMax !== null ? `이 단지 최고 ${registryMax}층 (건축물대장)` : maxSeenFloor !== null ? `거래 기록상 최고 ${maxSeenFloor}층 (실제 최고층은 더 높을 수 있어요)` : undefined;

  // 고른 면적의 최근 3개월 실거래 (계약 해제 제외)
  const areaDeals = detail && f.area ? detail.deals.filter((d) => !d.canceled && Math.round(d.areaM2) === Number(f.area)) : [];
  const average = areaDeals.length ? Math.round(areaDeals.reduce((s, d) => s + d.amount, 0) / areaDeals.length / 100) * 100 : null;

  const input = (): ListingInput => ({
    complexId: complex?.id ?? "",
    building: f.building,
    unit: f.unit,
    areaM2: Number(f.area),
    floor: f.floor.trim() ? Number(f.floor) : NaN,
    price: f.price.trim() ? Number(f.price) : NaN,
    contact: f.contact,
    description: f.description,
  });
  const set = (k: keyof typeof EMPTY, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(null);
    const found = validateListing(input(), registryMax ?? undefined);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return document.getElementById(`sell-${first}`)?.focus();
    setBusy(true);
    try {
      const r = await postJson<{ item: Listing }>("/api/listings", input());
      onCreated(r.item);
      setDone(`${r.item.complexName} ${r.item.building}동 ${r.item.unit}호를 등록했어요. 메시지함에 안내를 보냈어요.`);
      setF(EMPTY);
      setComplex(null);
      refresh();
    } catch (err) {
      if (err instanceof ApiError && err.body.field) setErrors({ [err.body.field]: err.message });
      else setDone(null);
    } finally {
      setBusy(false);
    }
  };

  const price = Number(f.price);
  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-label="매물 등록">
      <ComplexPicker value={complex} onChange={setComplex} error={errors.complexId} />
      <div className="grid grid-cols-2 gap-3">
        <Field id="sell-building" label="동" inputMode="numeric" required value={f.building} onChange={(e) => set("building", e.target.value)} error={errors.building} placeholder="101" />
        <Field id="sell-unit" label="호" inputMode="numeric" required value={f.unit} onChange={(e) => set("unit", e.target.value)} error={errors.unit} placeholder="1203" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="sell-areaM2"
          label="전용면적"
          required
          value={f.area}
          onChange={(e) => set("area", e.target.value)}
          error={errors.areaM2}
          disabled={!areas.length}
          options={[{ value: "", label: complex ? "골라 주세요" : "단지를 먼저 골라 주세요" }, ...areas.map((a) => ({ value: String(a), label: `${a}㎡ (${toPyeong(a)}평)` }))]}
        />
        <Field
          id="sell-floor"
          label="층"
          type="number"
          min={1}
          max={registryMax ?? 99}
          required
          value={f.floor}
          onChange={(e) => set("floor", e.target.value)}
          error={errors.floor ?? floorWarning}
          hint={floorHint}
        />
      </div>
      <Field
        id="sell-price"
        label="희망 가격 (만 원)"
        type="number"
        min={1000}
        required
        value={f.price}
        onChange={(e) => set("price", e.target.value)}
        error={errors.price}
        hint={price > 0 ? formatManwon(price) : "예: 95000 → 9억 5,000"}
      />
      {complex && (
        <p className="-mt-2 rounded-lg bg-band px-4 py-2.5 text-[15px]" aria-live="polite">
          {!f.area
            ? "전용면적을 고르면 최근 3개월 실거래 평균을 보여 드려요."
            : average === null
              ? `전용 ${f.area}㎡는 최근 3개월 거래가 없어요.`
              : (
                  <>
                    최근 3개월 전용 {f.area}㎡ 실거래 평균 <b>{formatManwon(average)}</b> ({areaDeals.length}건) · 가장 최근 <b>{formatManwon(areaDeals[0].amount)}</b> ({formatDate(areaDeals[0].date)}, {areaDeals[0].floor}층)
                  </>
                )}
        </p>
      )}
      <Field id="sell-contact" label="연락처" type="tel" autoComplete="tel" required value={f.contact} onChange={(e) => set("contact", e.target.value)} error={errors.contact} placeholder="010-1234-5678" />
      <TextAreaField
        id="sell-description"
        label="설명 (선택)"
        maxLength={DESCRIPTION_MAX}
        value={f.description}
        onChange={(e) => set("description", e.target.value)}
        error={errors.description}
        hint={`${f.description.length} / ${DESCRIPTION_MAX}자`}
      />
      {done && (
        <p role="status" className="rounded-lg bg-brand-soft px-4 py-3 text-brand-strong">
          {done}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
        {busy ? "등록하는 중…" : "매물 등록하기"}
      </button>
    </form>
  );
}

/** 단지 고르기: 이름 · 동네를 입력하면 후보가 뜨고 하나를 고른다 */
function ComplexPicker({ value, onChange, error }: { value: Picked | null; onChange: (p: Picked | null) => void; error?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Picked[]>([]);
  useEffect(() => {
    if (value || q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => {
      getJson<{ items: Picked[] }>(`/api/complex-search?q=${encodeURIComponent(q.trim())}`).then((r) => setHits(r.items));
    }, 200);
    return () => clearTimeout(t);
  }, [q, value]);

  if (value)
    return (
      <div>
        <p className="text-[16px] font-bold">단지</p>
        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-xl bg-band px-4 py-3">
          <span>
            <b>{value.name}</b>
            <span className="block text-[14px] text-muted">{value.address}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} className="shrink-0 font-bold text-brand hover:underline">
            바꾸기
          </button>
        </div>
      </div>
    );
  return (
    <div className="relative">
      <Field id="sell-complexId" label="단지" required value={q} onChange={(e) => setQ(e.target.value)} error={error} hint="단지 이름이나 동네를 두 글자 이상 입력해 주세요" autoComplete="off" />
      {hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg" aria-label="단지 후보">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => onChange(h)} className="block w-full px-4 py-2.5 text-left hover:bg-band">
                <b>{h.name}</b>
                <span className="block text-[14px] text-muted">{h.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
