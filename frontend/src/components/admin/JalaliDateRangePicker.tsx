"use client";

import { useEffect, useState } from "react";
import { FiArrowLeft, FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

type RangeTarget = "from" | "to";

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const weekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const persianParts = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric", timeZone: "Asia/Tehran" });
const persianLong = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tehran" });

function fa(value: string | number) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function jalaliParts(date: Date) {
  const result = { year: 0, month: 0, day: 0 };
  persianParts.formatToParts(date).forEach((part) => {
    if (part.type === "year" || part.type === "month" || part.type === "day") result[part.type] = Number(part.value);
  });
  return result;
}

function isoDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function isoToDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function todayIso() {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" }).formatToParts(new Date());
  const values: Record<string, string> = {};
  parts.forEach((part) => { if (["year", "month", "day"].includes(part.type)) values[part.type] = part.value; });
  return `${values.year}-${values.month}-${values.day}`;
}

function findGregorianDate(year: number, month: number, day = 1) {
  const monthOffset = month <= 6 ? (month - 1) * 31 : 186 + (month - 7) * 30;
  const center = Date.UTC(year + 621, 2, 20 + monthOffset + day - 1, 12);
  for (let delta = -25; delta <= 25; delta += 1) {
    const date = new Date(center + delta * 86_400_000);
    const parts = jalaliParts(date);
    if (parts.year === year && parts.month === month && parts.day === day) return date;
  }
  return new Date(center);
}

function jalaliNumeric(value: string) {
  const date = isoToDate(value);
  if (!date) return "";
  const parts = jalaliParts(date);
  return `${fa(parts.year)}/${fa(String(parts.month).padStart(2, "0"))}/${fa(String(parts.day).padStart(2, "0"))}`;
}

function jalaliLong(value: string) {
  const date = isoToDate(value);
  return date ? persianLong.format(date) : "";
}

export function JalaliDateRangePicker({ from, to, onChange }: Props) {
  const [target, setTarget] = useState<RangeTarget | null>(null);
  const [today] = useState(todayIso);
  const initialParts = jalaliParts(isoToDate(from || to || today) ?? new Date());
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);

  useEffect(() => {
    if (!target) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setTarget(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [target]);

  const open = (nextTarget: RangeTarget) => {
    const base = isoToDate(nextTarget === "from" ? from : to) ?? isoToDate(from || to || today) ?? new Date();
    const parts = jalaliParts(base);
    setViewYear(parts.year);
    setViewMonth(parts.month);
    setTarget(nextTarget);
  };

  const shiftMonth = (delta: number) => {
    setViewMonth((current) => {
      const next = current + delta;
      if (next < 1) { setViewYear((year) => year - 1); return 12; }
      if (next > 12) { setViewYear((year) => year + 1); return 1; }
      return next;
    });
  };

  const choose = (value: string) => {
    if (target === "from") {
      onChange(value, to && value > to ? "" : to);
      const parts = jalaliParts(isoToDate(value) as Date);
      setViewYear(parts.year);
      setViewMonth(parts.month);
      setTarget("to");
      return;
    }
    if (from && value < from) onChange(value, from);
    else onChange(from, value);
    setTarget(null);
  };

  const first = findGregorianDate(viewYear, viewMonth);
  const gridStart = new Date(first.getTime() - ((first.getUTCDay() + 1) % 7) * 86_400_000);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * 86_400_000);
    return { date, iso: isoDate(date), parts: jalaliParts(date) };
  });
  const years = Array.from({ length: 13 }, (_, index) => viewYear - 6 + index);

  return (
    <section className="jalali-range" aria-label="انتخاب بازه زمانی گزارش">
      <div className="jalali-range-head">
        <div><strong>بازه زمانی گزارش</strong><span>تقویم رسمی ایران</span></div>
        {(from || to) && <button type="button" className="jalali-clear-inline" onClick={() => onChange("", "")}>پاک کردن بازه</button>}
      </div>
      <div className="range-dates">
        <DateField label="از تاریخ" value={from} onClick={() => open("from")} />
        <span className="range-connector" aria-hidden="true"><FiArrowLeft /></span>
        <DateField label="تا تاریخ" value={to} onClick={() => open("to")} />
      </div>
      <p className="jalali-range-hint">روز شروع و پایان در گزارش محاسبه می‌شوند.</p>

      {target && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTarget(null); }}>
          <section className="modal jalali-dialog" role="dialog" aria-modal="true" aria-labelledby="jalali-title">
            <header><h2 id="jalali-title">{target === "from" ? "انتخاب تاریخ شروع" : "انتخاب تاریخ پایان"}</h2><button type="button" aria-label="بستن تقویم" onClick={() => setTarget(null)}><FiX /></button></header>
            <div className="jalali-picker">
              <div className="jalali-selection" aria-live="polite">
                <div className={from ? "selected" : ""}><small>شروع</small><strong>{from ? jalaliNumeric(from) : "—"}</strong></div>
                <span><FiArrowLeft /></span>
                <div className={to ? "selected" : ""}><small>پایان</small><strong>{to ? jalaliNumeric(to) : "—"}</strong></div>
              </div>
              <div className="jalali-toolbar">
                <button type="button" className="icon-button" aria-label="ماه قبل" onClick={() => shiftMonth(-1)}><FiChevronRight /></button>
                <div className="jalali-month-year">
                  <select aria-label="ماه شمسی" value={viewMonth} onChange={(event) => setViewMonth(Number(event.target.value))}>{months.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}</select>
                  <select aria-label="سال شمسی" value={viewYear} onChange={(event) => setViewYear(Number(event.target.value))}>{years.map((year) => <option value={year} key={year}>{fa(year)}</option>)}</select>
                </div>
                <button type="button" className="icon-button" aria-label="ماه بعد" onClick={() => shiftMonth(1)}><FiChevronLeft /></button>
              </div>
              <div className="jalali-weekdays" role="row">{weekdays.map((weekday) => <span role="columnheader" key={weekday}>{weekday}</span>)}</div>
              <div className="jalali-grid" role="grid" aria-label={`${months[viewMonth - 1]} ${fa(viewYear)}`}>
                {days.map(({ iso, parts }) => {
                  const classes = ["jalali-day"];
                  if (parts.year !== viewYear || parts.month !== viewMonth) classes.push("outside");
                  if (from && to && iso > from && iso < to) classes.push("in-range");
                  if (iso === from) classes.push("range-start");
                  if (iso === to) classes.push("range-end");
                  if (iso === today) classes.push("today");
                  return <button type="button" className={classes.join(" ")} aria-label={jalaliLong(iso)} aria-pressed={iso === from || iso === to} aria-current={iso === today ? "date" : undefined} onClick={() => choose(iso)} key={iso}>{fa(parts.day)}</button>;
                })}
              </div>
              <div className="jalali-picker-actions">
                <button type="button" className="text-button" onClick={() => onChange("", "")}>پاک کردن بازه</button>
                <button type="button" className="button" onClick={() => choose(today)}>امروز</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function DateField({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return <button type="button" className={`jalali-field ${value ? "has-value" : ""}`} aria-label={`${label}${value ? `، ${jalaliLong(value)}` : ""}`} onClick={onClick}><span className="jalali-field-icon"><FiCalendar /></span><span className="jalali-field-copy"><small>{label}</small><strong>{value ? jalaliNumeric(value) : "انتخاب تاریخ"}</strong></span><FiChevronDown /></button>;
}
