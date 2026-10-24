import type { ScheduledTaskRecord } from "../../../contracts/desktop-state";
import { formatRowMeta } from "./schedule-format";
import { useI18n } from "../../i18n";

interface ScheduledTaskChipProps {
  readonly task: ScheduledTaskRecord;
  readonly onOpen: () => void;
}

export function ScheduledTaskChip({ task, onOpen }: ScheduledTaskChipProps) {
  const { t } = useI18n();
  return (
    <div className="scheduled-task-chip" data-testid="scheduled-task-chip">
      <span>{formatRowMeta(task)}</span>
      <button className="button button--secondary" type="button" onClick={onOpen}>
        {t("files.open")}
      </button>
    </div>
  );
}
