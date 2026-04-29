const HELP_PROGRESS_KEY = 'syncho_help_progress_v1';

type HelpProgressMap = Record<string, number>;

function readHelpProgress(): HelpProgressMap {
  try {
    const raw = window.localStorage.getItem(HELP_PROGRESS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as HelpProgressMap;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
}

function writeHelpProgress(progress: HelpProgressMap) {
  try {
    window.localStorage.setItem(HELP_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }
}

export function registerHelpVisit(sectionId: string) {
  const normalizedId = String(sectionId || '').trim();
  if (!normalizedId) {
    return 1;
  }

  const progress = readHelpProgress();
  const nextVisits = Number(progress[normalizedId] || 0) + 1;

  progress[normalizedId] = nextVisits;
  writeHelpProgress(progress);

  return nextVisits;
}

export function resetHelpProgress() {
  try {
    window.localStorage.removeItem(HELP_PROGRESS_KEY);
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }
}
