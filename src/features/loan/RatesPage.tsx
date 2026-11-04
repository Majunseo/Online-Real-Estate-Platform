import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { clsx } from "clsx";
import { formatManwon } from "@/lib/format";
import { Page } from "@/components/page/Page";
import { schedule, won } from "./math";

const RATES = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0];
const YEARS = [10, 20, 30, 40];

/**
 * 금리별 월 상환액 (원리금균등). 은행 금리를 보여 주는 화면이 아니라, 같은 대출에서 금리가 바뀌면
 * 월 상환액과 총 이자가 얼마나 달라지는지 비교하는 표다. 실시간 금리 자료는 없다.
 */
export function RatesPage() {
  const [params] = useSearchParams();
  const [amount, setAmount] = useState(Number(params.get("amount")) > 0 ? Number(params.get("amount")) : 30_000);
  const [years, setYears] = useState(YEARS.includes(Number(params.get("years"))) ? Number(params.get("years")) : 30);
  const rows = RATES.map((rate) => ({ rate, s: schedule(amount * 10_000, rate, years, "equal-payment") }));
  const base = rows.find((r) => r.rate === 4.0)!.s.firstPayment;

  return (
    <Page title="금리별 월 상환액" description="같은 대출이라도 금리가 0.5%p 오르면 매달 갚는 돈이 얼마나 늘어나는지 비교해요. (원리금균등 기준)">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-[16px] font-bold">대출 금액</span>
          <select value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1.5 block h-12 rounded-xl border-[1.5px] border-muted/60 px-3 text-[17px]">
            {[10_000, 20_000, 30_000, 40_000, 50_000, 70_000, 100_000, ...(params.get("amount") ? [Number(params.get("amount"))] : [])]
              .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
              .sort((a, b) => a - b)
              .map((v) => (
                <option key={v} value={v}>
                  {formatManwon(v)}
                </option>
              ))}
          </select>
        </label>
        <div role="radiogroup" aria-label="기간" className="flex rounded-xl border-[1.5px] border-muted/60 p-1">
          {YEARS.map((y) => (
            <button key={y} type="button" role="radio" aria-checked={y === years} onClick={() => setYears(y)} className={clsx("rounded-lg px-4 py-1.5 text-[15px] font-bold", y === years ? "bg-brand text-white" : "hover:bg-band")}>
              {y}년
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] text-right text-[16px]">
          <caption className="sr-only">
            {formatManwon(amount)} · {years}년 금리별 상환액
          </caption>
          <thead className="bg-band text-[14px] text-muted">
            <tr>
              {["연 금리", "월 상환액", "4.0% 대비", "총 이자"].map((h) => (
                <th key={h} scope="col" className="px-4 py-2.5 font-semibold first:text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ rate, s }) => {
              const diff = s.firstPayment - base;
              return (
                <tr key={rate} className={clsx("border-t border-line", rate === 4.0 && "bg-brand-soft font-bold")}>
                  <td className="px-4 py-2.5 text-left">{rate.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 font-bold">{won(s.firstPayment)}</td>
                  <td className={clsx("px-4 py-2.5", diff > 0 ? "text-tag" : diff < 0 ? "text-brand" : "text-muted")}>{diff === 0 ? "기준" : `${diff > 0 ? "+" : "−"}${won(Math.abs(diff))}`}</td>
                  <td className="px-4 py-2.5">{won(s.totalInterest)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[14px] text-muted">
        표의 금리는 비교를 위한 값이에요. 실제 금리는 은행에 문의해 주세요. 상환 방식을 바꿔 계산하려면{" "}
        <Link to={`/loan?price=${Math.round(amount / 0.6)}`} className="font-bold text-brand hover:underline">
          대출 계산
        </Link>
        으로 가세요.
      </p>
    </Page>
  );
}
