const DAY_STARTS_AT_HOUR = 7;
const DAY_ENDS_AT_HOUR = 21;
const SLOT_MINUTES = 30;
const DEFAULT_BOOKING_MINUTES = 60;
const SESSION_KEY = "agenda-de-salas-session";

const state = {
  session: loadSession(),
  rooms: [],
  bookingsOfTheDay: [],
  myBookings: [],
  selectedDay: todayAsInputValue(),
  authMode: "login",
  bookingBeingEdited: null,
  roomBeingEdited: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(session) {
  state.session = session;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.session) headers.Authorization = `Token ${state.session.token}`;

  const response = await fetch(path, { method, headers, body: body && JSON.stringify(body) });
  if (response.status === 401 && state.session) {
    saveSession(null);
    showAuthScreen();
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(readableApiError(data));
  return data;
}

function readableApiError(data) {
  if (!data) return "Não foi possível falar com o servidor.";
  const details = data.detalhes ?? data;
  const messages = typeof details === "string" ? [details] : Object.values(details).flat();
  return messages.filter((message) => typeof message === "string").join(" ") || data.error || "Algo deu errado.";
}

function escapeHtml(text) {
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.hideTimer);
  showToast.hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function todayAsInputValue() {
  return dateAsInputValue(new Date());
}

function dateAsInputValue(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeAsInputValue(date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function localDateTime(day, time) {
  return new Date(`${day}T${time}`);
}

function shiftDay(day, days) {
  const date = localDateTime(day, "12:00");
  date.setDate(date.getDate() + days);
  return dateAsInputValue(date);
}

function minutesSinceDayStart(date) {
  return (date.getHours() - DAY_STARTS_AT_HOUR) * 60 + date.getMinutes();
}

function minutesAsTime(minutesSinceStart) {
  const totalMinutes = DAY_STARTS_AT_HOUR * 60 + minutesSinceStart;
  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

function describeDay(day) {
  const today = todayAsInputValue();
  if (day === today) return "Hoje";
  if (day === shiftDay(today, 1)) return "Amanhã";
  if (day === shiftDay(today, -1)) return "Ontem";
  const text = localDateTime(day, "12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isMine(booking) {
  return booking.created_by === state.session?.username;
}

function roomName(roomId) {
  return state.rooms.find((room) => room.id === roomId)?.name ?? "Sala removida";
}

function overlaps(booking, start, end) {
  return new Date(booking.start_time) < end && new Date(booking.end_time) > start;
}

function showAuthScreen() {
  $("#workspace").hidden = true;
  $("#auth-screen").hidden = false;
  $("#auth-form [name=username]").focus();
}

async function showWorkspace() {
  $("#auth-screen").hidden = true;
  $("#workspace").hidden = false;
  $("#account-name").textContent = state.session.username;
  $("#avatar").textContent = state.session.username.charAt(0).toUpperCase();
  await loadRooms();
  showView("agenda");
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isCadaster = mode === "cadaster";
  $$("[data-auth-mode]").forEach((tab) => {
    const isActive = tab.dataset.authMode === mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive);
  });
  $("#email-field").hidden = !isCadaster;
  $("#auth-form [name=password]").autocomplete = isCadaster ? "new-password" : "current-password";
  $("#auth-submit").textContent = isCadaster ? "Criar conta" : "Entrar";
  $("#auth-error").textContent = "";
}

async function submitAuth(event) {
  event.preventDefault();
  const form = event.target;
  const credentials = Object.fromEntries(new FormData(form));
  if (!credentials.username || !credentials.password) {
    $("#auth-error").textContent = "Preencha usuário e senha.";
    return;
  }
  if (state.authMode === "login") delete credentials.email;

  const submit = $("#auth-submit");
  submit.disabled = true;
  try {
    const route = state.authMode === "login" ? "/api/auth/login/" : "/api/auth/cadaster/";
    const { token } = await api(route, { method: "POST", body: credentials });
    saveSession({ token, username: credentials.username });
    form.reset();
    await showWorkspace();
  } catch (error) {
    $("#auth-error").textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function logout() {
  await api("/api/auth/logout/", { method: "POST" }).catch(() => {});
  saveSession(null);
  showAuthScreen();
}

function showView(view) {
  $$("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  $$("[data-view-panel]").forEach((panel) => (panel.hidden = panel.dataset.viewPanel !== view));
  if (view === "agenda") loadAgenda();
  if (view === "mine") loadMyBookings();
  if (view === "rooms") renderRooms();
}

async function loadRooms() {
  state.rooms = await api("/api/rooms/");
}

async function loadAgenda() {
  $("#day-input").value = state.selectedDay;
  $("#agenda-title").textContent = describeDay(state.selectedDay);
  state.bookingsOfTheDay = await api(`/api/schedules/?date=${state.selectedDay}`);
  renderAgenda();
}

function renderAgenda() {
  const hasRooms = state.rooms.length > 0;
  $(".agenda-frame").hidden = !hasRooms;
  $("#agenda-empty").hidden = hasRooms;

  const bookedRooms = new Set(state.bookingsOfTheDay.map((booking) => booking.room)).size;
  const total = state.bookingsOfTheDay.length;
  $("#agenda-summary").textContent = total
    ? `${total} ${total === 1 ? "reserva" : "reservas"} em ${bookedRooms} de ${state.rooms.length} salas`
    : "Nenhuma reserva neste dia. Clique num horário para reservar.";
  if (!hasRooms) return;

  const dayLengthInMinutes = (DAY_ENDS_AT_HOUR - DAY_STARTS_AT_HOUR) * 60;
  const slotStarts = Array.from({ length: dayLengthInMinutes / SLOT_MINUTES }, (_, index) => index * SLOT_MINUTES);
  const now = new Date();

  const timeLabels = slotStarts
    .filter((minutes) => minutes % 60 === 0)
    .map((minutes) => `<div class="time-label">${minutesAsTime(minutes)}</div>`)
    .join("");

  const roomHeaders = state.rooms
    .map((room) => `<div class="room-header"><strong>${escapeHtml(room.name)}</strong><small>${room.capacity} lugares · ${escapeHtml(room.objective)}</small></div>`)
    .join("");

  const roomColumns = state.rooms
    .map((room) => {
      const slots = slotStarts
        .map((minutes) => {
          const time = minutesAsTime(minutes);
          const slotEnd = localDateTime(state.selectedDay, minutesAsTime(minutes + SLOT_MINUTES));
          return `<button class="slot" type="button" data-room="${room.id}" data-time="${time}" ${slotEnd <= now ? "disabled" : ""}
            aria-label="Reservar ${escapeHtml(room.name)} às ${time}">+ ${time}</button>`;
        })
        .join("");
      const bookings = state.bookingsOfTheDay
        .filter((booking) => booking.room === room.id)
        .map((booking, order) => renderBookingBlock(booking, order, dayLengthInMinutes))
        .join("");
      return `<div class="room-column">${slots}${bookings}${renderNowLine(dayLengthInMinutes)}</div>`;
    })
    .join("");

  const agenda = $("#agenda");
  agenda.style.setProperty("--rooms", state.rooms.length);
  agenda.style.setProperty("--slot-minutes", SLOT_MINUTES);
  agenda.innerHTML = `<div class="agenda-corner"></div>${roomHeaders}<div class="time-column">${timeLabels}</div>${roomColumns}`;
  scrollAgendaToWhatMatters();
}

function scrollAgendaToWhatMatters() {
  const frame = $(".agenda-frame");
  const earliestBooking = $$(".booking").sort((a, b) => a.offsetTop - b.offsetTop)[0];
  const target = $(".now-line") ?? earliestBooking;
  if (!target) {
    frame.scrollTop = 0;
    return;
  }
  const headerHeight = $(".room-header").offsetHeight;
  const oneHourOfSlots = $(".slot").offsetHeight * (60 / SLOT_MINUTES);
  const targetTopInsideFrame = target.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.scrollTop;
  frame.scrollTop = Math.max(0, targetTopInsideFrame - headerHeight - oneHourOfSlots);
}

function renderBookingBlock(booking, order, dayLengthInMinutes) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  const startsOnAnotherDay = dateAsInputValue(start) !== state.selectedDay;
  const endsOnAnotherDay = dateAsInputValue(end) !== state.selectedDay;
  const visibleStart = startsOnAnotherDay ? 0 : Math.max(0, minutesSinceDayStart(start));
  const visibleEnd = endsOnAnotherDay ? dayLengthInMinutes : Math.min(dayLengthInMinutes, minutesSinceDayStart(end));
  if (visibleEnd <= visibleStart) return "";

  const mine = isMine(booking);
  const period = `${timeAsInputValue(start)} – ${timeAsInputValue(end)}`;
  const owner = mine ? "Você" : escapeHtml(booking.created_by);
  const label = mine ? `Editar sua reserva das ${period}` : `Reservado por ${owner}, ${period}`;
  return `<button class="booking ${mine ? "booking--mine" : ""}" type="button" data-booking="${booking.id}"
    style="--start:${visibleStart};--length:${visibleEnd - visibleStart};--order:${order}"
    aria-label="${label}" ${mine ? "" : 'aria-disabled="true"'}><strong>${owner}</strong><span>${period}</span></button>`;
}

function renderNowLine(dayLengthInMinutes) {
  if (state.selectedDay !== todayAsInputValue()) return "";
  const minute = minutesSinceDayStart(new Date());
  if (minute < 0 || minute > dayLengthInMinutes) return "";
  return `<div class="now-line" style="--minute:${minute}"></div>`;
}

function goToDay(day) {
  if (!day) return;
  state.selectedDay = day;
  loadAgenda();
}

function fillRoomOptions(selectedRoomId) {
  $("#booking-form [name=room]").innerHTML = state.rooms
    .map((room) => `<option value="${room.id}" ${room.id === selectedRoomId ? "selected" : ""}>${escapeHtml(room.name)} · ${room.capacity} lugares</option>`)
    .join("");
}

function openNewBooking(roomId, time) {
  state.bookingBeingEdited = null;
  const form = $("#booking-form");
  fillRoomOptions(roomId);
  form.day.value = state.selectedDay;
  form.start.value = time;
  const end = localDateTime(state.selectedDay, time);
  end.setMinutes(end.getMinutes() + DEFAULT_BOOKING_MINUTES);
  form.end.value = timeAsInputValue(end);
  $("#booking-dialog-title").textContent = "Nova reserva";
  $("#booking-submit").textContent = "Reservar";
  $("#cancel-booking").hidden = true;
  $("#booking-error").textContent = "";
  $("#booking-dialog").showModal();
}

function openBookingEditor(booking) {
  state.bookingBeingEdited = booking;
  const form = $("#booking-form");
  const start = new Date(booking.start_time);
  fillRoomOptions(booking.room);
  form.day.value = dateAsInputValue(start);
  form.start.value = timeAsInputValue(start);
  form.end.value = timeAsInputValue(new Date(booking.end_time));
  $("#booking-dialog-title").textContent = "Editar reserva";
  $("#booking-submit").textContent = "Salvar";
  $("#cancel-booking").hidden = false;
  $("#booking-error").textContent = "";
  $("#booking-dialog").showModal();
}

async function submitBooking(event) {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const form = event.target;
  const roomId = Number(form.room.value);
  const start = localDateTime(form.day.value, form.start.value);
  const end = localDateTime(form.day.value, form.end.value);
  const body = { room: roomId, start_time: start.toISOString(), end_time: end.toISOString() };
  const editing = state.bookingBeingEdited;

  try {
    if (editing) await api(`/api/schedules/edit/${editing.id}/`, { method: "PATCH", body });
    else await api("/api/schedules/create/", { method: "POST", body });
    $("#booking-dialog").close();
    showToast(editing ? "Reserva atualizada." : `${roomName(roomId)} reservada das ${form.start.value} às ${form.end.value}.`);
    state.selectedDay = form.day.value;
    refreshCurrentView();
  } catch (error) {
    const conflictingBookings = findConflictingBookings(roomId, start, end, editing?.id);
    const whoBookedFirst = conflictingBookings.map((booking) => `Reservado por ${isMine(booking) ? "você" : booking.created_by} das ${describeHours(booking)}.`);
    $("#booking-error").textContent = [error.message, ...whoBookedFirst].join(" ");
    shake($("#booking-dialog"));
    highlightBookings(conflictingBookings);
  }
}

function findConflictingBookings(roomId, start, end, ignoredBookingId) {
  return state.bookingsOfTheDay.filter((booking) => booking.room === roomId && booking.id !== ignoredBookingId && overlaps(booking, start, end));
}

function describeHours(booking) {
  return `${timeAsInputValue(new Date(booking.start_time))} às ${timeAsInputValue(new Date(booking.end_time))}`;
}

function highlightBookings(bookings) {
  bookings.forEach((booking) => {
    const block = $(`[data-booking="${booking.id}"]`);
    if (!block) return;
    block.classList.remove("is-conflicting");
    void block.offsetWidth;
    block.classList.add("is-conflicting");
    block.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    setTimeout(() => block.classList.remove("is-conflicting"), 2400);
  });
}

function shake(element) {
  element.classList.remove("is-shaking");
  void element.offsetWidth;
  element.classList.add("is-shaking");
}

async function cancelBooking(booking) {
  const confirmed = await confirmAction({
    title: "Cancelar reserva?",
    text: `${roomName(booking.room)}, ${describeBookingPeriod(booking)}. A sala fica livre para outras pessoas.`,
    action: "Cancelar reserva",
  });
  if (!confirmed) return;
  try {
    await api(`/api/schedules/remove/${booking.id}/`, { method: "DELETE" });
    $("#booking-dialog").close();
    showToast("Reserva cancelada.");
    refreshCurrentView();
  } catch (error) {
    showToast(error.message);
  }
}

function describeBookingPeriod(booking) {
  const start = new Date(booking.start_time);
  const day = start.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  return `${day}, das ${describeHours(booking)}`;
}

function confirmAction({ title, text, action }) {
  const dialog = $("#confirm-dialog");
  $("#confirm-title").textContent = title;
  $("#confirm-text").textContent = text;
  $("#confirm-yes").textContent = action;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => dialog.addEventListener("close", () => resolve(dialog.returnValue === "yes"), { once: true }));
}

async function loadMyBookings() {
  const bookings = await api("/api/schedules/?mine=true");
  const now = new Date();
  const upcomingFirst = [...bookings].sort((a, b) => {
    const aIsPast = new Date(a.end_time) < now;
    const bIsPast = new Date(b.end_time) < now;
    if (aIsPast !== bIsPast) return aIsPast ? 1 : -1;
    return aIsPast ? new Date(b.start_time) - new Date(a.start_time) : new Date(a.start_time) - new Date(b.start_time);
  });
  state.myBookings = upcomingFirst;

  $("#my-bookings-empty").hidden = bookings.length > 0;
  $("#my-bookings").innerHTML = upcomingFirst
    .map((booking, order) => {
      const start = new Date(booking.start_time);
      const isPast = new Date(booking.end_time) < now;
      return `<li class="booking-item ${isPast ? "is-past" : ""}" style="--order:${order}">
        <div class="booking-date"><strong>${start.getDate()}</strong><small>${start.toLocaleDateString("pt-BR", { month: "short" })}</small></div>
        <div class="booking-info">
          <strong>${escapeHtml(roomName(booking.room))}</strong>
          <span>${start.toLocaleDateString("pt-BR", { weekday: "long" })}, das ${describeHours(booking)}${isPast ? " · já passou" : ""}</span>
        </div>
        <div class="booking-actions">
          <button class="button button--ghost" type="button" data-edit-booking="${booking.id}">Editar</button>
          <button class="button button--danger-ghost" type="button" data-cancel-booking="${booking.id}">Cancelar</button>
        </div>
      </li>`;
    })
    .join("");
}

function renderRooms() {
  $("#rooms-empty").hidden = state.rooms.length > 0;
  $("#room-grid").innerHTML = state.rooms
    .map(
      (room, order) => `<article class="room-card" style="--order:${order}">
        <h3>${escapeHtml(room.name)}</h3>
        <p>${escapeHtml(room.objective)}</p>
        <span class="room-capacity">${room.capacity} ${room.capacity === 1 ? "lugar" : "lugares"}</span>
        <div class="booking-actions">
          <button class="button button--ghost" type="button" data-edit-room="${room.id}">Editar</button>
          <button class="button button--danger-ghost" type="button" data-delete-room="${room.id}">Remover</button>
        </div>
      </article>`
    )
    .join("");
}

function openRoomEditor(room = null) {
  state.roomBeingEdited = room;
  const form = $("#room-form");
  form.reset();
  if (room) {
    form.name.value = room.name;
    form.capacity.value = room.capacity;
    form.objective.value = room.objective;
  }
  $("#room-dialog-title").textContent = room ? `Editar ${room.name}` : "Nova sala";
  $("#room-error").textContent = "";
  $("#room-dialog").showModal();
}

async function submitRoom(event) {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const form = event.target;
  const body = { name: form.name.value.trim(), capacity: Number(form.capacity.value), objective: form.objective.value.trim() };
  const editing = state.roomBeingEdited;

  try {
    if (editing) await api(`/api/rooms/edit/${editing.id}/`, { method: "PATCH", body });
    else await api("/api/rooms/create/", { method: "POST", body });
    $("#room-dialog").close();
    showToast(editing ? "Sala atualizada." : `${body.name} cadastrada.`);
    await loadRooms();
    renderRooms();
  } catch (error) {
    $("#room-error").textContent = error.message;
    shake($("#room-dialog"));
  }
}

async function deleteRoom(room) {
  const confirmed = await confirmAction({
    title: `Remover ${room.name}?`,
    text: "Todas as reservas desta sala também serão apagadas.",
    action: "Remover sala",
  });
  if (!confirmed) return;
  try {
    await api(`/api/rooms/delete/${room.id}/`, { method: "DELETE" });
    showToast(`${room.name} removida.`);
    await loadRooms();
    renderRooms();
  } catch (error) {
    showToast(error.message);
  }
}

function refreshCurrentView() {
  const activeView = $(".view-button.is-active").dataset.view;
  showView(activeView);
}

function findById(list, id) {
  return list.find((item) => item.id === Number(id));
}

$$("[data-auth-mode]").forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)));
$("#auth-form").addEventListener("submit", submitAuth);
$("#logout").addEventListener("click", logout);
$$("[data-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
$$("[data-view-shortcut]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewShortcut)));

$("#previous-day").addEventListener("click", () => goToDay(shiftDay(state.selectedDay, -1)));
$("#next-day").addEventListener("click", () => goToDay(shiftDay(state.selectedDay, 1)));
$("#today").addEventListener("click", () => goToDay(todayAsInputValue()));
$("#day-input").addEventListener("change", (event) => goToDay(event.target.value));

$("#agenda").addEventListener("click", (event) => {
  const slot = event.target.closest(".slot");
  if (slot) return openNewBooking(Number(slot.dataset.room), slot.dataset.time);
  const block = event.target.closest(".booking--mine");
  if (block) openBookingEditor(findById(state.bookingsOfTheDay, block.dataset.booking));
});

$("#my-bookings").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-booking]");
  const cancelButton = event.target.closest("[data-cancel-booking]");
  if (editButton) openBookingEditor(findById(state.myBookings, editButton.dataset.editBooking));
  if (cancelButton) cancelBooking(findById(state.myBookings, cancelButton.dataset.cancelBooking));
});

$("#booking-form").addEventListener("submit", submitBooking);
$("#cancel-booking").addEventListener("click", () => cancelBooking(state.bookingBeingEdited));

$("#new-room").addEventListener("click", () => openRoomEditor());
$("#room-form").addEventListener("submit", submitRoom);
$("#room-grid").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-room]");
  const deleteButton = event.target.closest("[data-delete-room]");
  if (editButton) openRoomEditor(findById(state.rooms, editButton.dataset.editRoom));
  if (deleteButton) deleteRoom(findById(state.rooms, deleteButton.dataset.deleteRoom));
});

setInterval(() => {
  $$(".now-line").forEach((line) => line.style.setProperty("--minute", minutesSinceDayStart(new Date())));
}, 60_000);

if (state.session) showWorkspace().catch(showAuthScreen);
else showAuthScreen();
