export function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Fill leading days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dt = new Date(year, month - 1, d);
    days.push({ date: formatDate(dt), dayNum: d, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    days.push({ date: formatDate(dt), dayNum: d, isCurrentMonth: true });
  }

  // Fill trailing days
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(year, month + 1, d);
      days.push({ date: formatDate(dt), dayNum: d, isCurrentMonth: false });
    }
  }

  return days;
}

export function getWeekDays(baseDate: Date) {
  const day = baseDate.getDay();
  const start = new Date(baseDate);
  start.setDate(start.getDate() - day);

  const days: { date: string; dayNum: number; dayName: string; isToday: boolean }[] = [];
  const today = formatDate(new Date());
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    days.push({
      date: formatDate(dt),
      dayNum: dt.getDate(),
      dayName: names[i],
      isToday: formatDate(dt) === today,
    });
  }
  return days;
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
