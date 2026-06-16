import { isToday, isYesterday, format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export function useDate() {
    return {
        formatMessageTime: (ts: number): string => {
            const d = new Date(ts);
            if (isToday(d)) return format(d, "HH:mm");
            if (isYesterday(d)) return "вчера";
            return format(d, "d MMM", { locale: ru });
        },
        formatLastSeen: (ts: number): string => {
            return `был(а) в сети ${formatDistanceToNow(ts, { addSuffix: true, locale: ru })}`;
        },
    };
}
