import { useRef } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

  const selectedDate = datePart ? parse(datePart, "yyyy-MM-dd", new Date()) : undefined;

  return (
    <div className="flex gap-2">
      {/* DATE */}
      <div className="flex gap-1 flex-1">
        <Input
          type="date"
          value={datePart}
          onChange={(e) => {
            const v = e.target.value;
            setDate(v);
            // Auto-tab when full year is typed (yyyy-MM-dd has 10 chars)
            if (v.length === 10 && isValid(parse(v, "yyyy-MM-dd", new Date()))) {
              timeRef.current?.focus();
            }
          }}
          className="bg-input border-border flex-1"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="Abrir calendário">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate && isValid(selectedDate) ? selectedDate : undefined}
              onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* TIME */}
      <div className="flex gap-1 flex-1">
        <Input
          ref={timeRef}
          type="time"
          value={timePart}
          onChange={(e) => setTime(e.target.value)}
          className="bg-input border-border flex-1"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="Selecionar hora">
              <Clock className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="end">
            <div className="flex gap-2">
              <ScrollArea className="h-56 w-16">
                <div className="flex flex-col">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const hh = String(h).padStart(2, "0");
                    const active = timePart.startsWith(hh);
                    return (
                      <Button
                        key={h}
                        type="button"
                        variant={active ? "default" : "ghost"}
                        size="sm"
                        className="justify-center"
                        onClick={() => setTime(`${hh}:${(timePart.split(":")[1] || "00")}`)}
                      >
                        {hh}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
              <ScrollArea className="h-56 w-16">
                <div className="flex flex-col">
                  {[0, 15, 30, 45].map((m) => {
                    const mm = String(m).padStart(2, "0");
                    const active = timePart.endsWith(`:${mm}`);
                    return (
                      <Button
                        key={m}
                        type="button"
                        variant={active ? "default" : "ghost"}
                        size="sm"
                        className="justify-center"
                        onClick={() => setTime(`${(timePart.split(":")[0] || "09")}:${mm}`)}
                      >
                        {mm}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
