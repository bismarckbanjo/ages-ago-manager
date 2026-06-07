export class ScheduleEvaluator {
  static shouldExecute(procedure) {
    if (procedure.schedule === "manual") {
      return false;
    }

    if (!procedure.isActive) {
      return false;
    }

    return this.checkSchedule(procedure);
  }

  static checkSchedule(procedure) {
    const now = new Date();
    const lastExecuted = procedure.lastExecutedAt;

    if (!lastExecuted) {
      return true;
    }

    const msPerHour = 60 * 60 * 1000;
    const msPerDay = 24 * msPerHour;
    const msPerWeek = 7 * msPerDay;
    const msPerMonth = 30 * msPerDay;

    const timeSinceLastExecution = now.getTime() - lastExecuted.getTime();

    switch (procedure.schedule) {
      case "daily":
        return timeSinceLastExecution >= msPerDay;
      case "weekly":
        return timeSinceLastExecution >= msPerWeek;
      case "monthly":
        return timeSinceLastExecution >= msPerMonth;
      default:
        return false;
    }
  }

  static getNextExecutionTime(procedure) {
    if (procedure.schedule === "manual") {
      return null;
    }

    if (!procedure.isActive) {
      return null;
    }

    const now = new Date();
    const lastExecuted = procedure.lastExecutedAt || new Date();

    const msPerHour = 60 * 60 * 1000;
    const msPerDay = 24 * msPerHour;
    const msPerWeek = 7 * msPerDay;
    const msPerMonth = 30 * msPerDay;

    let intervalMs;

    switch (procedure.schedule) {
      case "daily":
        intervalMs = msPerDay;
        break;
      case "weekly":
        intervalMs = msPerWeek;
        break;
      case "monthly":
        intervalMs = msPerMonth;
        break;
      default:
        return null;
    }

    const nextExecution = new Date(lastExecuted.getTime() + intervalMs);
    return nextExecution > now ? nextExecution : now;
  }
}

export function createScheduleEvaluator() {
  return ScheduleEvaluator;
}
