"use client";

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const today = new Date().toISOString().split("T")[0]!;
  const isToday = value === today;

  return (
    <div className="flex items-center gap-3">
      <input
        type="date"
        value={value}
        max={today}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-[17px] text-apple-text outline-none focus:ring-2 focus:ring-apple-blue"
      />
      {!isToday && (
        <button
          onClick={() => onChange(today)}
          className="rounded-[980px] border border-apple-link px-3 py-1 text-[14px] text-apple-link hover:bg-apple-blue hover:text-white hover:border-apple-blue transition-colors"
        >
          오늘
        </button>
      )}
    </div>
  );
}
