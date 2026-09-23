/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Calendar } from 'lucide-react';

export interface DateInputHandle {
  focus: () => void;
  select: () => void;
}

interface DateInputWithEnterProps {
  id?: string;
  value: string; // Format "YYYY-MM-DD" or ""
  onChange: (dateStr: string) => void;
  onEnterNext?: () => void;
  className?: string;
  ariaLabel?: string;
}

const DateInputWithEnter = forwardRef<DateInputHandle, DateInputWithEnterProps>(
  ({ id, value, onChange, onEnterNext, className = '' }, ref) => {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    const dayRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const yearRef = useRef<HTMLInputElement>(null);
    const nativePickerRef = useRef<HTMLInputElement>(null);

    // Sync from external value
    useEffect(() => {
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-');
        setDay(d);
        setMonth(m);
        setYear(y);
      } else if (!value) {
        setDay('');
        setMonth('');
        setYear('');
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      focus: () => {
        dayRef.current?.focus();
        dayRef.current?.select();
      },
      select: () => {
        dayRef.current?.select();
      }
    }));

    // Check and notify valid date
    const notifyIfValid = (d: string, m: string, y: string) => {
      if (!d && !m && !y) {
        if (value !== '') onChange('');
        return;
      }
      if (d && m && y && y.length === 4) {
        const dNum = parseInt(d, 10);
        const mNum = parseInt(m, 10);
        const yNum = parseInt(y, 10);
        if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12 && yNum >= 1900 && yNum <= 2100) {
          const testDate = new Date(yNum, mNum - 1, dNum);
          if (testDate.getFullYear() === yNum && testDate.getMonth() === mNum - 1 && testDate.getDate() === dNum) {
            const formatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            onChange(formatted);
            return;
          }
        }
      }
      if (value !== '') {
        onChange('');
      }
    };

    const handleDayBlur = () => {
      if (day) {
        const padded = day.padStart(2, '0');
        setDay(padded);
        notifyIfValid(padded, month, year);
      }
    };

    const handleMonthBlur = () => {
      if (month) {
        const padded = month.padStart(2, '0');
        setMonth(padded);
        notifyIfValid(day, padded, year);
      }
    };

    const handleYearBlur = () => {
      if (year) {
        let finalYear = year;
        if (year.length === 2) {
          finalYear = `20${year}`;
          setYear(finalYear);
        }
        notifyIfValid(day, month, finalYear);
      }
    };

    // Paste handler (e.g. 22/09/2026, 2026-09-22, 22092026)
    const handlePaste = (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text').trim();
      let d = '';
      let m = '';
      let y = '';

      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        [y, m, d] = text.split('-');
      } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(text)) {
        const parts = text.split(/[/-]/);
        d = parts[0].padStart(2, '0');
        m = parts[1].padStart(2, '0');
        y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      } else if (/^\d{8}$/.test(text)) {
        d = text.slice(0, 2);
        m = text.slice(2, 4);
        y = text.slice(4, 8);
      }

      if (d && m && y) {
        e.preventDefault();
        setDay(d);
        setMonth(m);
        setYear(y);
        notifyIfValid(d, m, y);
        onEnterNext?.();
      }
    };

    // Handle Day
    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
      setDay(raw);
      notifyIfValid(raw, month, year);

      // If user typed 2 digits or a digit > 3 (no day starts with 4-9), auto advance to month
      if (raw.length === 2 || (raw.length === 1 && parseInt(raw, 10) > 3)) {
        const padded = raw.padStart(2, '0');
        setDay(padded);
        notifyIfValid(padded, month, year);
        monthRef.current?.focus();
        monthRef.current?.select();
      }
    };

    const handleDayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (day) {
          const padded = day.padStart(2, '0');
          setDay(padded);
          notifyIfValid(padded, month, year);
        }
        monthRef.current?.focus();
        monthRef.current?.select();
      } else if (e.key === '/' || e.key === '-' || e.key === '.') {
        e.preventDefault();
        monthRef.current?.focus();
        monthRef.current?.select();
      } else if (e.key === 'ArrowRight' && dayRef.current?.selectionStart === day.length) {
        monthRef.current?.focus();
        monthRef.current?.select();
      }
    };

    // Handle Month
    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
      setMonth(raw);
      notifyIfValid(day, raw, year);

      // If user typed 2 digits or a digit > 1 (no month starts with 2-9), auto advance to year
      if (raw.length === 2 || (raw.length === 1 && parseInt(raw, 10) > 1)) {
        const padded = raw.padStart(2, '0');
        setMonth(padded);
        notifyIfValid(day, padded, year);
        yearRef.current?.focus();
        yearRef.current?.select();
      }
    };

    const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (month) {
          const padded = month.padStart(2, '0');
          setMonth(padded);
          notifyIfValid(day, padded, year);
        }
        yearRef.current?.focus();
        yearRef.current?.select();
      } else if (e.key === '/' || e.key === '-' || e.key === '.') {
        e.preventDefault();
        yearRef.current?.focus();
        yearRef.current?.select();
      } else if (e.key === 'Backspace' && !month) {
        e.preventDefault();
        dayRef.current?.focus();
        dayRef.current?.select();
      } else if (e.key === 'ArrowLeft' && monthRef.current?.selectionStart === 0) {
        dayRef.current?.focus();
        dayRef.current?.select();
      } else if (e.key === 'ArrowRight' && monthRef.current?.selectionStart === month.length) {
        yearRef.current?.focus();
        yearRef.current?.select();
      }
    };

    // Handle Year
    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
      setYear(raw);
      notifyIfValid(day, month, raw);
    };

    const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        let finalYear = year;
        if (year.length === 2) {
          finalYear = `20${year}`;
          setYear(finalYear);
        }
        notifyIfValid(day, month, finalYear);
        onEnterNext?.();
      } else if (e.key === 'Backspace' && !year) {
        e.preventDefault();
        monthRef.current?.focus();
        monthRef.current?.select();
      } else if (e.key === 'ArrowLeft' && yearRef.current?.selectionStart === 0) {
        monthRef.current?.focus();
        monthRef.current?.select();
      }
    };

    // Handle Native Date Picker change
    const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.value;
      if (picked) {
        const [y, m, d] = picked.split('-');
        setDay(d);
        setMonth(m);
        setYear(y);
        onChange(picked);
        onEnterNext?.();
      }
    };

    const openNativePicker = () => {
      try {
        if (nativePickerRef.current && 'showPicker' in nativePickerRef.current) {
          nativePickerRef.current.showPicker();
        } else {
          nativePickerRef.current?.focus();
        }
      } catch {
        nativePickerRef.current?.focus();
      }
    };

    return (
      <div
        id={id}
        className={`inline-flex items-center gap-0.5 font-mono text-[11px] text-slate-800 dark:text-slate-200 select-none ${className}`}
      >
        {/* Day */}
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          placeholder="dd"
          value={day}
          onChange={handleDayChange}
          onKeyDown={handleDayKeyDown}
          onBlur={handleDayBlur}
          onPaste={handlePaste}
          className="w-5 text-center bg-transparent focus:outline-none focus:bg-amber-100 dark:focus:bg-amber-950/80 rounded px-0 py-0.5 text-[11px] font-medium placeholder:text-slate-400 placeholder:font-normal"
          maxLength={2}
          title="Día (Use Enter para pasar a Mes)"
        />
        <span className="text-slate-400 dark:text-slate-600 font-bold text-[10px]">/</span>

        {/* Month */}
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          placeholder="mm"
          value={month}
          onChange={handleMonthChange}
          onKeyDown={handleMonthKeyDown}
          onBlur={handleMonthBlur}
          className="w-5 text-center bg-transparent focus:outline-none focus:bg-amber-100 dark:focus:bg-amber-950/80 rounded px-0 py-0.5 text-[11px] font-medium placeholder:text-slate-400 placeholder:font-normal"
          maxLength={2}
          title="Mes (Use Enter para pasar a Año)"
        />
        <span className="text-slate-400 dark:text-slate-600 font-bold text-[10px]">/</span>

        {/* Year */}
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          placeholder="aaaa"
          value={year}
          onChange={handleYearChange}
          onKeyDown={handleYearKeyDown}
          onBlur={handleYearBlur}
          className="w-8 text-center bg-transparent focus:outline-none focus:bg-amber-100 dark:focus:bg-amber-950/80 rounded px-0 py-0.5 text-[11px] font-medium placeholder:text-slate-400 placeholder:font-normal"
          maxLength={4}
          title="Año (Use Enter para pasar al siguiente campo)"
        />

        {/* Mini Calendar button */}
        <div className="relative inline-flex items-center ml-0.5">
          <button
            type="button"
            tabIndex={-1}
            onClick={openNativePicker}
            title="Abrir calendario"
            className="p-0.5 text-slate-400 hover:text-amber-500 rounded transition-colors cursor-pointer"
          >
            <Calendar className="w-3 h-3" />
          </button>
          <input
            ref={nativePickerRef}
            type="date"
            value={value}
            tabIndex={-1}
            onChange={handleNativePickerChange}
            className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }
);

DateInputWithEnter.displayName = 'DateInputWithEnter';

export default DateInputWithEnter;
