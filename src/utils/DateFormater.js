export const formatDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleString("en-US", {
        weekday: "short",   // Thu
        day: "numeric",     // 28
        month: "short",     // May
        year: "numeric",    // 2026
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
};