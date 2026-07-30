// Ранний бутстрап (до отрисовки): ставим тему из настроек и прячем страницу на
// пол-секунды, чтобы не мигало нестилизованным контентом. Вынесено из inline в
// отдельный файл — иначе CSP (script-src 'self') блокирует инлайновый скрипт.
try {
    const settings = JSON.parse(localStorage.getItem("mc_settings") || "{}");
    const theme = settings.theme || "acid-green";
    document.documentElement.setAttribute("data-theme", theme);
} catch {
    document.documentElement.setAttribute("data-theme", "acid-green");
}
document.documentElement.style.opacity = "0";

setTimeout(() => {
    document.documentElement.style.opacity = "";
}, 500);
