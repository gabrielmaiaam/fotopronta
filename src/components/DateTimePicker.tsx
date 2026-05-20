import { useRef } from "react";
import { format, parse, isValid } from "date-fns";
import { Input } from "@/components/ui/input";

// value: "yyyy-MM-ddTHH:mm" (datetime-local string), or empty
export function DateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const timeRef = useRef<HTMLInputElement>(null);

  const [datePart, timePart] = (() => {
    if (!value) return ["", ""];
    const [d, t] = value.split("T");
    return [d || "", (t || "").slice(0, 5)];
  })();

  const setDate = (d: string) => {
    onChange(`${d}T${timePart || "09:00"}`);
  };
  const setTime = (t: string) => {
    onChange(`${datePart || format(new Date(), "yyyy-MM-dd")}T${t}`);
  };

  return (
    <div className="flex gap-2">
      <Input
        type="date"
        value={datePart}
        onChange={(e) => {
          const v = e.target.value;
          setDate(v);
          if (v.length === 10 && isValid(parse(v, "yyyy-MM-dd", new Date()))) {
            timeRef.current?.focus();
          }
        }}
        className="bg-input border-border flex-1"
      />
      <Input
        ref={timeRef}
        type="time"
        value={timePart}
        onChange={(e) => setTime(e.target.value)}
        className="bg-input border-border flex-1"
      />
    </div>
  );
}
