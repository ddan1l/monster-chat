export function formatLastSeen(ts: number): string {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);

    if (minutes < 1) return "был(а) в сети только что";
    if (minutes < 60)
        return `был(а) в сети ${minutes} ${pluralMinutes(minutes)} назад`;
    if (hours < 24) return `был(а) в сети ${hours} ${pluralHours(hours)} назад`;

    return `был(а) в сети ${new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;
}

function pluralMinutes(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return "минуту";
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
        return "минуты";
    return "минут";
}

function pluralHours(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return "час";
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
        return "часа";
    return "часов";
}
