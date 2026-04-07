/**
 * Календарь: занятость + выбор заезда / выезда и расчёт стоимости.
 */
(function () {
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  function monthLabel(year, month) {
    return new Intl.DateTimeFormat("ru-RU", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month, 1));
  }

  function mondayBasedWeekday(d) {
    const js = d.getDay();
    return js === 0 ? 6 : js - 1;
  }

  function atMidnight(y, m, d) {
    return new Date(y, m, d);
  }

  function sameDay(a, b) {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function compareDay(a, b) {
    return atMidnight(a.getFullYear(), a.getMonth(), a.getDate()).getTime() -
      atMidnight(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  }

  /** Ночей: от заезда (включительно) до выезда (день выезда не ночует). */
  function nightsBetween(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const ms = checkOut.getTime() - checkIn.getTime();
    const n = Math.round(ms / 86400000);
    return n > 0 ? n : 0;
  }

  /** Короткая дата для однострочного блока */
  function formatDateCompact(d) {
    if (!d) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
    }).format(d);
  }

  function classifySelection(dayDate, checkIn, checkOut) {
    if (!checkIn) return null;
    const t = atMidnight(
      dayDate.getFullYear(),
      dayDate.getMonth(),
      dayDate.getDate()
    ).getTime();
    const tIn = atMidnight(
      checkIn.getFullYear(),
      checkIn.getMonth(),
      checkIn.getDate()
    ).getTime();
    if (!checkOut) {
      return t === tIn ? "sel-start" : null;
    }
    const tOut = atMidnight(
      checkOut.getFullYear(),
      checkOut.getMonth(),
      checkOut.getDate()
    ).getTime();
    if (t < tIn || t > tOut) return null;
    if (t === tIn) return "sel-start";
    if (t === tOut) return "sel-end";
    return "sel-between";
  }

  window.initAvailabilityCalendar = function (options) {
    const {
      navPrev,
      navNext,
      monthEl,
      gridEl,
      getBookedDaysForMonth,
      summaryEl,
      pricePerNight,
      currency,
      onBookingChange,
      initialCheckIn,
      initialCheckOut,
    } = options;

    const today = new Date();
    const todayStart = atMidnight(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    let y = today.getFullYear();
    let m = today.getMonth();
    let checkIn = null;
    let checkOut = null;

    const price = typeof pricePerNight === "number" ? pricePerNight : 0;
    const cur = currency != null ? String(currency) : "₽";

    function isDayBooked(date) {
      const booked = getBookedDaysForMonth(
        date.getFullYear(),
        date.getMonth()
      );
      const set = new Set(booked || []);
      return set.has(date.getDate());
    }

    function rangeHasBooked(start, end) {
      const d = new Date(start);
      const endT = end.getTime();
      while (d.getTime() < endT) {
        if (isDayBooked(d)) return true;
        d.setDate(d.getDate() + 1);
      }
      return false;
    }

    function bookedSetForCurrent() {
      const days = getBookedDaysForMonth(y, m) || [];
      return new Set(days);
    }

    function notifyBookingChange() {
      if (typeof onBookingChange !== "function") return;
      const nightsVal = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
      onBookingChange({
        checkIn: checkIn,
        checkOut: checkOut,
        nights: nightsVal,
        lodgingTotal: nightsVal * price,
        currency: cur,
      });
    }

    /** Две фиксированные строки: даты и ночи — без скачка высоты при выборе. */
    function summaryPlaceholderNights() {
      return (
        '<span class="calendar-summary__placeholder">Ночи — после дат</span>'
      );
    }

    function paintSummaryRows(datesInner, nightsInner) {
      summaryEl.innerHTML =
        '<div class="calendar-summary__inner">' +
        '<p class="calendar-summary__row calendar-summary__dates">' +
        datesInner +
        "</p>" +
        '<p class="calendar-summary__row calendar-summary__nights">' +
        nightsInner +
        "</p>" +
        "</div>";
      summaryEl.hidden = false;
    }

    function updateSummary(message) {
      if (!summaryEl) return;
      if (message) {
        paintSummaryRows(
          '<span class="calendar-summary__error">' + message + "</span>",
          summaryPlaceholderNights()
        );
        notifyBookingChange();
        return;
      }

      if (!checkIn) {
        paintSummaryRows(
          '<span class="calendar-summary__hint">Укажите <strong>заезд</strong> и <strong>выезд</strong></span>',
          summaryPlaceholderNights()
        );
        notifyBookingChange();
        return;
      }

      if (!checkOut) {
        paintSummaryRows(
          "Заезд: <strong>" +
            formatDateCompact(checkIn) +
            '</strong><span class="calendar-summary__sep" aria-hidden="true">·</span><span class="calendar-summary__hint">выберите выезд</span>',
          summaryPlaceholderNights()
        );
        notifyBookingChange();
        return;
      }

      const nights = nightsBetween(checkIn, checkOut);
      paintSummaryRows(
        "Заезд: <strong>" +
          formatDateCompact(checkIn) +
          '</strong><span class="calendar-summary__sep" aria-hidden="true">·</span>Выезд: <strong>' +
          formatDateCompact(checkOut) +
          "</strong>",
        "<strong>" + nights + "</strong>\u00a0ноч."
      );
      notifyBookingChange();
    }

    function render() {
      if (!gridEl) return;

      const bookedSet = bookedSetForCurrent();
      const first = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0).getDate();
      const startPad = mondayBasedWeekday(first);

      let html = '<div class="calendar-grid">';
      weekdays.forEach(function (w) {
        html += '<div class="weekday">' + w + "</div>";
      });

      for (let i = 0; i < startPad; i++) {
        html += '<div class="day day--empty"></div>';
      }

      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(y, m, day);
        const isPast = date.getTime() < todayStart.getTime();
        const isBooked = bookedSet.has(day);
        const sel = classifySelection(date, checkIn, checkOut);

        let cls = "day";
        let extra = "";
        if (isPast) {
          cls += " day--past";
        } else if (isBooked) {
          cls += " day--busy";
        } else {
          cls += " day--free";
          extra +=
            ' data-cal-day="' +
            day +
            '" data-cal-month="' +
            m +
            '" data-cal-year="' +
            y +
            '" tabindex="0" role="button"';
        }

        if (sel) cls += " day--" + sel;

        html +=
          "<div class=\"" +
          cls +
          "\"" +
          extra +
          " title=\"" +
          day +
          "." +
          (m + 1) +
          "." +
          y +
          "\">" +
          day +
          "</div>";
      }

      html += "</div>";
      gridEl.innerHTML = html;
    }

    function refresh() {
      if (monthEl) monthEl.textContent = monthLabel(y, m);
      render();
      updateSummary();
    }

    function handleDayPick(year, month, day) {
      const picked = atMidnight(year, month, day);
      if (picked.getTime() < todayStart.getTime()) return;
      if (isDayBooked(picked)) return;

      if (!checkIn || (checkIn && checkOut)) {
        checkIn = picked;
        checkOut = null;
        refresh();
        return;
      }

      if (sameDay(picked, checkIn) && !checkOut) {
        checkIn = null;
        refresh();
        return;
      }

      let start = checkIn;
      let end = picked;
      if (compareDay(picked, checkIn) < 0) {
        start = picked;
        end = checkIn;
      }

      if (rangeHasBooked(start, end)) {
        updateSummary(
          "В этом периоде есть занятые даты. Выберите другие дни."
        );
        return;
      }

      const n = nightsBetween(start, end);
      if (n < 1) {
        updateSummary("Выезд должен быть позже заезда.");
        return;
      }

      checkIn = start;
      checkOut = end;
      refresh();
    }

    if (gridEl && !gridEl.getAttribute("data-range-picker")) {
      gridEl.setAttribute("data-range-picker", "1");
      gridEl.addEventListener("click", function (e) {
        const cell = e.target.closest(".day--free[data-cal-day]");
        if (!cell) return;
        const d = parseInt(cell.getAttribute("data-cal-day"), 10);
        const mo = parseInt(cell.getAttribute("data-cal-month"), 10);
        const yr = parseInt(cell.getAttribute("data-cal-year"), 10);
        handleDayPick(yr, mo, d);
      });
      gridEl.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        const cell = e.target.closest(".day--free[data-cal-day]");
        if (!cell) return;
        e.preventDefault();
        const d = parseInt(cell.getAttribute("data-cal-day"), 10);
        const mo = parseInt(cell.getAttribute("data-cal-month"), 10);
        const yr = parseInt(cell.getAttribute("data-cal-year"), 10);
        handleDayPick(yr, mo, d);
      });
    }

    if (navPrev) {
      navPrev.addEventListener("click", function () {
        m--;
        if (m < 0) {
          m = 11;
          y--;
        }
        refresh();
      });
    }
    if (navNext) {
      navNext.addEventListener("click", function () {
        m++;
        if (m > 11) {
          m = 0;
          y++;
        }
        refresh();
      });
    }

    if (initialCheckIn && initialCheckOut) {
      const start = atMidnight(
        initialCheckIn.getFullYear(),
        initialCheckIn.getMonth(),
        initialCheckIn.getDate()
      );
      const end = atMidnight(
        initialCheckOut.getFullYear(),
        initialCheckOut.getMonth(),
        initialCheckOut.getDate()
      );
      if (
        start.getTime() >= todayStart.getTime() &&
        end.getTime() > start.getTime() &&
        !rangeHasBooked(start, end)
      ) {
        checkIn = start;
        checkOut = end;
        y = start.getFullYear();
        m = start.getMonth();
      }
    }

    refresh();
    return {
      refresh: refresh,
      clearSelection: function () {
        checkIn = null;
        checkOut = null;
        refresh();
      },
      setSelection: function (inD, outD) {
        if (!inD || !outD) {
          checkIn = null;
          checkOut = null;
          refresh();
          return false;
        }
        const start = atMidnight(inD.getFullYear(), inD.getMonth(), inD.getDate());
        const end = atMidnight(outD.getFullYear(), outD.getMonth(), outD.getDate());
        if (start.getTime() < todayStart.getTime() || end.getTime() <= start.getTime()) {
          checkIn = null;
          checkOut = null;
          refresh();
          return false;
        }
        if (rangeHasBooked(start, end)) {
          checkIn = null;
          checkOut = null;
          refresh();
          return false;
        }
        checkIn = start;
        checkOut = end;
        y = start.getFullYear();
        m = start.getMonth();
        refresh();
        return true;
      },
    };
  };
})();
