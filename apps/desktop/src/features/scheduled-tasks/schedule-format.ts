import type { ScheduledTaskRecord } from "../../../contracts/desktop-state";
import type { ScheduledTaskSchedule, Weekday } from "../../../contracts/scheduled-tasks";
import { t } from "../../i18n";

/*
 * Presentation formatting for scheduled tasks. The contract module keeps the
 * canonical (English) formatting for tests and any non-renderer caller; this
 * wrapper renders the same shapes in the active language.
 */

const WEEKDAY_SHORT_KEYS = [
  "scheduled.weekday.0",
  "scheduled.weekday.1",
  "scheduled.weekday.2",
  "scheduled.weekday.3",
  "scheduled.weekday.4",
  "scheduled.weekday.5",
  "scheduled.weekday.6",
] as const;

export function weekdayShortName(day: Weekday): string {
  return t(WEEKDAY_SHORT_KEYS[day]);
}

export function formatRecurrence(schedule: ScheduledTaskSchedule): string {
  if (schedule.kind === "once") {
    const at = Date.parse(schedule.at);
    if (Number.isNaN(at)) {
      return t("scheduled.once");
    }
    return t("scheduled.onceAt", {
      time: new Date(at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    });
  }
  if (schedule.kind === "interval") {
    const minutes = Math.round(schedule.everyMs / 60_000);
    if (minutes % (24 * 60) === 0) {
      const days = minutes / (24 * 60);
      return days === 1 ? t("scheduled.everyDay") : t("scheduled.everyDays", { count: days });
    }
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return hours === 1 ? t("scheduled.everyHour") : t("scheduled.everyHours", { count: hours });
    }
    return minutes === 1
      ? t("scheduled.everyMinute")
      : t("scheduled.everyMinutes", { count: minutes });
  }
  const time = formatClockTime(schedule.hour, schedule.minute);
  if (schedule.kind === "daily") {
    return t("scheduled.dailyAt", { time });
  }
  const names = [...schedule.days]
    .sort((left, right) => left - right)
    .map((day) => weekdayShortName(day));
  return t("scheduled.weeklyAt", { days: joinNames(names), time });
}

export function formatNextRun(nextRunAt: string, now = new Date()): string {
  const timestamp = Date.parse(nextRunAt);
  if (Number.isNaN(timestamp)) {
    return "";
  }
  const diffMs = timestamp - now.getTime();
  if (diffMs <= 0) {
    return t("scheduled.dueNow");
  }
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) {
    return t("scheduled.nextRunUnderMinute");
  }
  if (diffMinutes < 60) {
    return t("scheduled.nextRunMinutes", { count: diffMinutes });
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t("scheduled.nextRunHours", { count: diffHours });
  }
  const diffDays = Math.floor(diffHours / 24);
  return t("scheduled.nextRunDays", { count: diffDays });
}

export function formatRowMeta(task: ScheduledTaskRecord, now = new Date()): string {
  const recurrence = formatRecurrence(task.schedule);
  if (task.status === "completed") {
    return recurrence;
  }
  if (task.status === "paused") {
    return t("scheduled.recurrencePaused", { recurrence });
  }
  if (!task.nextRunAt) {
    return recurrence;
  }
  return t("scheduled.recurrenceNextRun", {
    recurrence,
    nextRun: formatNextRun(task.nextRunAt, now),
  });
}

function joinNames(names: readonly string[]): string {
  if (names.length === 0) {
    return "";
  }
  if (names.length === 1) {
    return names[0]!;
  }
  if (names.length === 2) {
    return t("scheduled.twoDays", { first: names[0]!, second: names[1]! });
  }
  return t("scheduled.manyDays", {
    head: names.slice(0, -1).join(t("scheduled.listSeparator")),
    last: names[names.length - 1]!,
  });
}

function formatClockTime(hour: number, minute: number): string {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
