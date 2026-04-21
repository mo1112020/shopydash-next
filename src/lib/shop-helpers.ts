import { Shop, WorkingHours } from "@/types/database";

export interface ShopOpenState {
  isOpen: boolean;
  nextChange: Date | null;
  reason: "MANUAL_OPEN" | "MANUAL_CLOSED" | "SCHEDULE_OPEN" | "SCHEDULE_CLOSED";
}

/**
 * Centrally calculates whether a shop is currently Open or Closed based on:
 * 1. Active status / Approval status
 * 2. Manual Override (FORCE_OPEN / FORCE_CLOSED)
 * 3. Weekly Schedule (including split shifts & overnight hours)
 * 
 * @param shop The shop object (must contain override_mode, is_active, status, disabled_reason)
 * @param hours The working hours array (flat list of all shifts)
 * @param now The reference time (default: new Date())
 */
export function getShopOpenState(
  shop: StartShop,
  hours: WorkingHours[],
  now: Date = new Date()
): ShopOpenState {
  // 0. Check Active & Appproved Status FIRST
  if (shop.is_active === false || (shop.status && shop.status !== "APPROVED")) {
    // Treat as MANUAL_CLOSED with a special reason flag if you want to distinguish later
    return { isOpen: false, nextChange: null, reason: "MANUAL_CLOSED" };
  }

  // 1. Check Overrides
  if (shop.override_mode === "FORCE_OPEN") {
    return { isOpen: true, nextChange: null, reason: "MANUAL_OPEN" };
  }
  if (shop.override_mode === "FORCE_CLOSED") {
    return { isOpen: false, nextChange: null, reason: "MANUAL_CLOSED" };
  }

  // 2. Schedule Logic
  // We need to check:
  // A. Today's shifts (does 'now' fall inside?)
  // B. Yesterday's shifts (did an overnight shift start yesterday and end today after 'now'?)

  // Normalized "Now"
  const currentDayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  
  // Previous Day (handle Sunday -> Saturday wraparound)
  const prevDayOfWeek = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  // 2A. Check Today's Shifts
  const todayShifts = hours.filter(
    (h) => h.day_of_week === currentDayOfWeek && h.is_enabled
  );

  for (const shift of todayShifts) {
    if (!shift.start_time || !shift.end_time) continue;

    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);

    const startTime = new Date(now);
    startTime.setHours(startH, startM, 0, 0);

    const endTime = new Date(now);
    endTime.setHours(endH, endM, 0, 0);
    
    // If shift crosses midnight, the "end time" on the current day logic 
    // means it ends tomorrow. So for "Today's Check", we are open if now >= start.
    // (The end check happens relative to the next day, but logically:
    //  If 20:00 -> 02:00, and now is 23:00, we are OPEN.
    //  If 20:00 -> 02:00, and now is 01:00 (next day), this block doesn't catch it,
    //  the "Yesterday's Check" block catches it.)
    
    if (shift.crosses_midnight) {
      // Open if now >= start
      if (now >= startTime) {
        // It's open until tomorrow 'endH:endM'
        const tomorrowEnd = new Date(endTime);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
        return { isOpen: true, nextChange: tomorrowEnd, reason: "SCHEDULE_OPEN" };
      }
    } else {
      // Standard shift (same day)
      // Open if start <= now < end
      if (now >= startTime && now < endTime) {
        return { isOpen: true, nextChange: endTime, reason: "SCHEDULE_OPEN" };
      }
    }
  }

  // 2B. Check Yesterday's "Overnight" Shifts
  const prevShifts = hours.filter(
    (h) => h.day_of_week === prevDayOfWeek && h.is_enabled && h.crosses_midnight
  );

  for (const shift of prevShifts) {
    if (!shift.end_time) continue;

    const [endH, endM] = shift.end_time.split(":").map(Number);

    // This shift started yesterday, but ends TODAY at endH:endM
    const endTimeToday = new Date(now);
    endTimeToday.setHours(endH, endM, 0, 0);

    // If now < endTimeToday, then we are still in last night's shift
    if (now < endTimeToday) {
      return { isOpen: true, nextChange: endTimeToday, reason: "SCHEDULE_OPEN" };
    }
  }

  // 3. If no match, we are CLOSED. Find next opening time.
  // We scan forward from today to find the next enabled shift.
  const nextOpen = findNextOpenTime(hours, now);

  return { isOpen: false, nextChange: nextOpen, reason: "SCHEDULE_CLOSED" };
}

function findNextOpenTime(hours: WorkingHours[], now: Date): Date | null {
  // Check up to 7 days ahead
  for (let d = 0; d < 8; d++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + d);
    const dayOfWeek = checkDate.getDay();

    const shifts = hours
      .filter((h) => h.day_of_week === dayOfWeek && h.is_enabled && h.start_time)
      .sort((a, b) => (a.period_index || 0) - (b.period_index || 0));

    for (const shift of shifts) {
      if (!shift.start_time) continue;

      const [startH, startM] = shift.start_time.split(":").map(Number);
      const shiftStart = new Date(checkDate);
      shiftStart.setHours(startH, startM, 0, 0);

      // If matches, and it's in the future
      if (shiftStart > now) {
        return shiftStart;
      }
    }
  }
  return null;
}

// Minimal type structure needed for the function
type StartShop = Pick<Shop, "override_mode" | "is_active" | "status" | "disabled_reason">;
