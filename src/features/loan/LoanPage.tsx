import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { clsx } from "clsx";
import { BUYERS, ltvRule, maxLoan, RULE_BASIS, ZONE_LABEL, zoneOf, type Buyer } from "@shared/loanRules";
import { formatManwon } from "@/lib/format";
import { bugOn } from "@/lib/bugs";
import { Page } from "@/components/page/Page";
import { RegionSelect } from "@/components/form/RegionSelect";
import { METHODS, schedule, won, yearly, type Method } from "./math";

interface Inputs {
  sido: string; // 시도 코드 (선택)
  sgg: string; // 시군구 코드 (선택)
  buyer: Buyer;
  price: string; // 만원
  loan: string; // 만원
  rate: string; // 연 %
  years: string;
  income: string; // 연소득 만원 (선택)
  method: Method;
}

const LIMITS = { priceMax: 1_000_000, rateMax: 20, yearsMax: 50 };

/** 입력을 숫자로 바꾸고 칸마다 문제를 찾는다. 문제가 있으면 계산하지 않는다 */
function check(v: Inputs) {
  const n = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/,/g, "")));
  const price = n(v.price);
  const loan = n(v.loan);
  const rate = n(v.rate);
  const years = n(v.years);
  const income = v.income.trim() ? n(v.income) : 0;
  const errors: Partial<Record<keyof Inputs, string>> = {};
  if (!(price > 0) || price > LIMITS.priceMax) errors.price = "매매가는 0보다 크고 100억 원 이하로 입력해 주세요.";
  if (!(loan > 0)) errors.loan = "대출 금액을 입력해 주세요.";
  else if (price > 0 && loan > price) errors.loan = "대출 금액은 매매가보다 클 수 없어요.";
  if (!(rate >= 0) || rate > LIMITS.rateMax) errors.rate = `금리는 0~${LIMITS.rateMax}% 사이로 입력해 주세요.`;
  if (!Number.isInteger(years) || years < 1 || years > LIMITS.yearsMax) errors.years = `기간은 1~${LIMITS.yearsMax}년 사이 정수로 입력해 주세요.`;
  if (v.income.trim() && !(income > 0)) errors.income = "연소득은 0보다 큰 숫자로 입력해 주세요.";
  return { price, loan, rate, years, income, errors };
}

const isBuyer = (s: string | null): s is Buyer => BUYERS.some((b) => b.value === s);

/**
 * 대출 계산. 지역 · 구매자 구분으로 LTV 한도를 보여 주고, 매매가 · 대출 금액 · 금리 · 기간 · 상환 방식으로 월 상환액과 총 이자, 연도별 상환표를 계산한다.
 * 단지 상세에서 ?price=(만원)&sido=&sgg= 로 들어오면 매매가와 지역이 채워지고 대출 금액은 그 지역 한도로 들어간다. 지역이 없으면 매매가의 60%.
 * 계산은 화면 안에서만 한다.
 */
export function LoanPage() {
  const [params] = useSearchParams();
  const fromPrice = Number(params.get("price")) > 0 ? Number(params.get("price")) : 60_000;
  const fromSido = /^\d{2}$/.test(params.get("sido") ?? "") ? params.get("sido")! : "";
  const fromSgg = fromSido && /^\d{5}$/.test(params.get("sgg") ?? "") && params.get("sgg")!.startsWith(fromSido) ? params.get("sgg")! : "";
  const fromBuyer = isBuyer(params.get("buyer")) ? (params.get("buyer") as Buyer) : "none";
  let firstZone = zoneOf(fromSido || null, fromSgg || null);
  if (bugOn("F4") && fromSido === "41" && firstZone?.zone === "regulated") firstZone = { zone: "metro", uncertain: false }; // [F4]
  const firstLoan = firstZone ? maxLoan(fromPrice, ltvRule(firstZone.zone, fromBuyer, fromPrice)) : Math.round(fromPrice * 0.6);

  const [v, setV] = useState<Inputs>({
    sido: fromSido,
    sgg: fromSgg,
    buyer: fromBuyer,
    price: String(fromPrice),
    loan: String(firstLoan),
    rate: "4.0",
    years: "30",
    income: "",
    method: "equal-payment",
  });
  const set = (k: keyof Inputs, value: string) => setV((prev) => ({ ...prev, [k]: value }));

  const c = check(v);
  const ok = Object.keys(c.errors).length === 0;
  const s = useMemo(() => (ok ? schedule(c.loan * 10_000, c.rate, c.years, v.method) : null), [ok, c.loan, c.rate, c.years, v.method]);
  const ltv = ok ? (c.loan / c.price) * 100 : 0;
  // DSR(이 대출만): 첫해 원리금 ÷ 연소득
  const dsr = ok && s && c.income > 0 ? (yearly(s)[0].payment / (c.income * 10_000)) * 100 : null;

  // 지역 · 구매자 구분에 따른 한도
  let zone = zoneOf(v.sido || null, v.sgg || null);
  // [F4] 결함: 경기도 안 규제지역(과천 · 분당 · 수지 …)을 수도권 비규제로 본다
  if (bugOn("F4") && v.sido === "41" && zone?.zone === "regulated") zone = { zone: "metro", uncertain: false };
  const rule = zone && c.price > 0 ? ltvRule(zone.zone, v.buyer, c.price) : null;
  const limit = rule ? maxLoan(c.price, rule) : null;
  const overLimit = limit !== null && c.loan > limit;

  // 지역 · 구매자 구분을 바꾸면 대출 금액을 그 한도로 맞춘다 (매매가를 고칠 때는 손대지 않는다)
  const limitKey = `${v.sido}|${v.sgg}|${v.buyer}`;
  const [lastKey, setLastKey] = useState(limitKey);
  useEffect(() => {
    if (limitKey === lastKey) return;
    setLastKey(limitKey);
    if (limit !== null) setV((prev) => ({ ...prev, loan: String(limit) }));
  }, [limitKey, lastKey, limit]);

  return (
    <Page title="대출 계산" description="지역과 매매가, 대출 조건을 넣으면 LTV 한도와 매달 갚을 금액, 총 이자를 계산해요." width="max-w-[1100px]">
      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        <form className="space-y-4 rounded-2xl border border-line p-5" onSubmit={(e) => e.preventDefault()} noValidate aria-label="대출 조건">
          <div>
            <p className="text-[16px] font-bold">집이 있는 지역</p>
            <div className="mt-1.5">
              <RegionSelect sido={v.sido} sgg={v.sgg} onChange={(sd, g) => setV((p) => ({ ...p, sido: sd, sgg: g }))} />
            </div>
            <p className="mt-1 text-[14px] text-muted">규제지역(서울 전역 · 경기 12곳)은 LTV 가 40%예요. 고르면 한도를 계산해요.</p>
          </div>
          <div>
            <label htmlFor="loan-buyer" className="text-[16px] font-bold">
              구매자 구분
            </label>
            <select id="loan-buyer" value={v.buyer} onChange={(e) => set("buyer", e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border-[1.5px] border-muted/60 bg-surface px-3 text-[17px] focus:border-brand focus:outline-none">
              {BUYERS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <NumberField id="loan-price" label="매매가" unit="만 원" value={v.price} onChange={(x) => set("price", x)} error={c.errors.price} hint={c.price > 0 ? formatManwon(c.price) : undefined} />

          {rule && limit !== null && (
            <div className={clsx("rounded-xl px-4 py-3 text-[14px]", rule.ltv === 0 ? "bg-tag/10" : "bg-brand-soft")} aria-live="polite">
              <p className="font-bold text-ink">
                {ZONE_LABEL[rule.zone]}
                {zone?.uncertain && " (시군구를 고르면 규제지역인지 알 수 있어요)"} · LTV {Math.round(rule.ltv * 100)}%{rule.cap !== null && rule.cap > 0 && ` · 한도 ${formatManwon(rule.cap)}`}
              </p>
              <p className="mt-0.5 text-[16px]">
                최대 대출 <b>{limit > 0 ? formatManwon(limit) : "0원"}</b>
              </p>
              <p className="mt-1 text-muted">{rule.note}</p>
              {limit > 0 && c.loan !== limit && (
                <button type="button" onClick={() => set("loan", String(limit))} className="mt-1.5 font-bold text-brand hover:underline">
                  이 한도로 대출 금액 채우기
                </button>
              )}
            </div>
          )}

          <NumberField
            id="loan-amount"
            label="대출 금액"
            unit="만 원"
            value={v.loan}
            onChange={(x) => set("loan", x)}
            error={c.errors.loan}
            warn={overLimit ? `이 지역 한도 ${formatManwon(limit!)}보다 많아요. 은행에서 이만큼은 빌리기 어려워요.` : undefined}
            hint={c.loan > 0 && c.price > 0 ? `${formatManwon(c.loan)} · LTV ${((c.loan / c.price) * 100).toFixed(1)}%` : undefined}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="loan-rate" label="연 금리" unit="%" step="0.1" value={v.rate} onChange={(x) => set("rate", x)} error={c.errors.rate} />
            <NumberField id="loan-years" label="기간" unit="년" value={v.years} onChange={(x) => set("years", x)} error={c.errors.years} />
          </div>
          <fieldset>
            <legend className="text-[16px] font-bold">상환 방식</legend>
            <div className="mt-2 space-y-2">
              {METHODS.map((m) => (
                <label key={m.value} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] px-3 py-2.5", v.method === m.value ? "border-brand bg-brand-soft" : "border-line")}>
                  <input type="radio" name="method" value={m.value} checked={v.method === m.value} onChange={() => setV((p) => ({ ...p, method: m.value }))} className="mt-1 accent-brand" />
                  <span>
                    <span className="block font-bold">{m.label}</span>
                    <span className="text-[14px] text-muted">{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <NumberField id="loan-income" label="연소득 (선택)" unit="만 원" value={v.income} onChange={(x) => set("income", x)} error={c.errors.income} hint="넣으면 이 대출의 DSR을 계산해요" />
        </form>

        <section aria-label="계산 결과" aria-live="polite">
          {!s ? (
            <p className="rounded-2xl bg-band px-6 py-16 text-center text-muted">왼쪽 입력을 확인해 주세요.</p>
          ) : (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Stat label={v.method === "equal-payment" ? "월 상환액" : "첫 달 상환액"} value={won(s.firstPayment)} strong />
                <Stat label={v.method === "bullet" ? "마지막 달 (원금 포함)" : "마지막 달 상환액"} value={won(s.lastPayment)} />
                <Stat label="총 이자" value={won(s.totalInterest)} />
                <Stat label="총 상환액" value={won(s.totalPayment)} />
                <Stat label={rule ? `LTV (한도 ${Math.round(rule.ltv * 100)}%)` : "LTV (대출 ÷ 매매가)"} value={`${ltv.toFixed(1)}%`} warn={overLimit} />
                <Stat label="DSR (이 대출만, 첫해)" value={dsr === null ? "연소득을 넣어 주세요" : `${dsr.toFixed(1)}%`} warn={dsr !== null && dsr > 40} />
              </dl>
              {dsr !== null && dsr > 40 && <p className="mt-2 text-[14px] text-tag">DSR 이 40%를 넘어요. 은행 규제 한도(40%) 안이어야 대출이 나와요.</p>}
              <h2 className="mt-8 text-[20px] font-bold">연도별 상환표</h2>
              <div className="mt-3 max-h-[360px] overflow-auto rounded-xl border border-line">
                <table className="w-full text-right text-[15px]">
                  <thead className="sticky top-0 bg-band text-[14px] text-muted">
                    <tr>
                      {["연차", "갚은 금액", "원금", "이자", "남은 원금"].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 font-semibold first:text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearly(s).map((y) => (
                      <tr key={y.year} className="border-t border-line">
                        <td className="px-3 py-2 text-left">{y.year}년차</td>
                        <td className="px-3 py-2">{won(y.payment)}</td>
                        <td className="px-3 py-2">{won(y.principal)}</td>
                        <td className="px-3 py-2">{won(y.interest)}</td>
                        <td className="px-3 py-2">{won(y.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[14px] text-muted">
                LTV 한도는 {RULE_BASIS}이고, 실제 한도와 금리는 은행 심사 · 소득 · DSR 에 따라 더 줄 수 있어요. 금리에 따라 얼마나 바뀌는지는{" "}
                <Link to={`/loan/rates?amount=${c.loan}&years=${c.years}`} className="font-bold text-brand hover:underline">
                  금리별 상환액
                </Link>
                에서 비교해 보세요.
              </p>
            </>
          )}
        </section>
      </div>
    </Page>
  );
}

function NumberField({ id, label, unit, value, onChange, error, warn, hint, step }: { id: string; label: string; unit: string; value: string; onChange: (v: string) => void; error?: string; warn?: string; hint?: string; step?: string }) {
  const describedBy = error ? `${id}-error` : warn ? `${id}-warn` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-[16px] font-bold">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step ?? "1"}
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx("h-12 w-full rounded-xl border-[1.5px] pl-4 pr-16 text-[17px] focus:outline-none", error ? "border-tag" : warn ? "border-tag/60 focus:border-tag" : "border-muted/60 focus:border-brand")}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-muted">{unit}</span>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[14px] text-tag">
          {error}
        </p>
      ) : warn ? (
        <p id={`${id}-warn`} className="mt-1 text-[14px] text-tag">
          {warn}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-[14px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function Stat({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className={clsx("rounded-xl px-4 py-3", strong ? "bg-brand text-white" : warn ? "bg-tag/10" : "bg-band")}>
      <dt className={clsx("text-[14px]", strong ? "text-white/85" : "text-muted")}>{label}</dt>
      <dd className={clsx("mt-0.5 text-[22px] font-extrabold", warn && "text-tag")}>{value}</dd>
    </div>
  );
}
