export const LEAD_DUPLICATE_WINDOW_DAYS = 30;

export const getLeadDuplicateWindowStart = (
  now = new Date(),
  windowDays = LEAD_DUPLICATE_WINDOW_DAYS
) => {
  const start = new Date(now);
  start.setDate(start.getDate() - windowDays);
  return start;
};

export const isDuplicateLeadWithinWindow = (
  previousLeadAt: Date,
  now = new Date(),
  windowDays = LEAD_DUPLICATE_WINDOW_DAYS
) => previousLeadAt.getTime() >= getLeadDuplicateWindowStart(now, windowDays).getTime();

