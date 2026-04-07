/**
 * Занятые даты по домикам (день брони = ночь в этот календарный день).
 * Ключ домика — как у CABINS_DATA[].id.
 * Ключ месяца — "YYYY-MM" (месяц 01–12), значение — массив чисел 1…31.
 * Месяца, которых нет в объекте, считаются полностью свободными.
 */
window.CABIN_BOOKED = {
  bereza: {
    "2026-04": [3, 4, 5, 18, 19, 25],
    "2026-05": [2, 3, 9, 10, 11, 22, 23],
    "2026-06": [5, 6, 7, 14, 15, 16],
    "2026-07": [1, 2, 19, 20, 26, 27],
    "2026-08": [8, 9, 10, 21, 22],
  },
  elka: {
    "2026-04": [10, 11, 12, 13, 20, 21, 22],
    "2026-05": [4, 5, 6, 7, 15, 16, 17],
    "2026-06": [1, 2, 3, 18, 19, 29, 30],
    "2026-07": [11, 12, 13, 14, 24, 25],
    "2026-08": [5, 6, 20, 21, 22],
  },
  romashka: {
    "2026-04": [7, 8, 14, 15, 16, 28, 29, 30],
    "2026-05": [5, 6, 12, 13, 25, 26],
    "2026-06": [1, 2, 9, 10, 20, 21],
    "2026-07": [3, 4, 15, 16, 17, 31],
    "2026-08": [1, 2, 18, 19, 20],
  },
};

function cabinBookedMonthKey(year, monthIndex) {
  return year + "-" + String(monthIndex + 1).padStart(2, "0");
}

/**
 * Номера занятых дней в календарном месяце (для сетки календаря).
 * @param {object} cabin — объект домика с полем id
 * @param {number} year
 * @param {number} month — 0..11
 */
window.getCabinBookedDaysInMonth = function (cabin, year, month) {
  if (!cabin || !cabin.id) return [];
  var table = window.CABIN_BOOKED && window.CABIN_BOOKED[cabin.id];
  if (!table || typeof table !== "object") return [];
  var key = cabinBookedMonthKey(year, month);
  var days = table[key];
  return Array.isArray(days) ? days : [];
};

window.cabinIsDayBooked = function (cabin, date) {
  if (!cabin || !date) return false;
  var booked = window.getCabinBookedDaysInMonth(
    cabin,
    date.getFullYear(),
    date.getMonth()
  );
  var set = new Set(booked);
  return set.has(date.getDate());
};

/** true, если в интервале [checkIn, checkOut) есть занятый день */
window.cabinStayOverlapsBooked = function (cabin, checkIn, checkOut) {
  if (!cabin || !checkIn || !checkOut) return true;
  var d = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  var end = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  while (d.getTime() < end.getTime()) {
    if (window.cabinIsDayBooked(cabin, d)) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
};

window.cabinIsFreeForStay = function (cabin, checkIn, checkOut) {
  return !window.cabinStayOverlapsBooked(cabin, checkIn, checkOut);
};

/** Ключ фильтра на главной (совпадает с index.html). */
window.LESNOY_MAIN_FILTER_STORAGE_KEY = "lesnoy:cabins-filter";

window.toLesnoyLocalYMD = function (d) {
  if (!d) return "";
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
};

window.parseLesnoyLocalYMD = function (s) {
  if (!s || typeof s !== "string") return null;
  var p = s.split("-");
  if (p.length !== 3) return null;
  var y = parseInt(p[0], 10);
  var mo = parseInt(p[1], 10) - 1;
  var da = parseInt(p[2], 10);
  if (isNaN(y) || isNaN(mo) || isNaN(da)) return null;
  var d = new Date(y, mo, da);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return null;
  return d;
};

/**
 * Заезд/выезд с главной (sessionStorage). panelOpen — открыта ли панель календаря.
 * @returns {{ checkIn: Date, checkOut: Date, panelOpen: boolean } | null}
 */
window.readStoredMainPageFilterRange = function () {
  try {
    var raw = sessionStorage.getItem(window.LESNOY_MAIN_FILTER_STORAGE_KEY);
    if (!raw) return null;
    var o = JSON.parse(raw);
    if (!o || !o.in || !o.out) return null;
    var cin = window.parseLesnoyLocalYMD(o.in);
    var cout = window.parseLesnoyLocalYMD(o.out);
    if (!cin || !cout) return null;
    var todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (cin.getTime() < todayStart.getTime()) return null;
    if (cout.getTime() <= cin.getTime()) return null;
    return { checkIn: cin, checkOut: cout, panelOpen: !!o.panelOpen };
  } catch (e) {
    return null;
  }
};

/**
 * Даты из адреса карточки домика: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @returns {{ checkIn: Date, checkOut: Date } | null}
 */
window.readCabinPageFilterFromQuery = function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var fr = params.get("from");
    var to = params.get("to");
    if (!fr || !to) return null;
    var cin = window.parseLesnoyLocalYMD(fr);
    var cout = window.parseLesnoyLocalYMD(to);
    if (!cin || !cout) return null;
    var todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (cin.getTime() < todayStart.getTime()) return null;
    if (cout.getTime() <= cin.getTime()) return null;
    return { checkIn: cin, checkOut: cout };
  } catch (e) {
    return null;
  }
};
