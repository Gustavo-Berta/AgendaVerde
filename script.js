const STORAGE_KEY = "agenda-verde:v1";

const SPECIALTIES = [
  "Clínica Geral",
  "Pediatria",
  "Ginecologia",
  "Cardiologia",
  "Dermatologia",
  "Ortopedia",
  "Oftalmologia",
  "Psiquiatria",
  "Endocrinologia",
  "Odontologia",
];

const SLOT_TIMES = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const seed = () => ({
  clinics: [
    { id: "c1", name: "Clínica Vida Plena", cnpj: "12.345.678/0001-90", district: "Centro", address: "Rua Coronel Fernando Prestes, 410", phone: "(15) 3271-4410" },
    { id: "c2", name: "Centro Médico Vila Rio Branco", cnpj: "23.456.789/0001-01", district: "Vila Rio Branco", address: "Av. Gaspar Ricardo Júnior, 1250", phone: "(15) 3272-8830" },
    { id: "c3", name: "Clínica Sorriso Verde", cnpj: "34.567.890/0001-12", district: "Vila Mazzei", address: "Rua Dr. Virgílio de Resende, 87", phone: "(15) 3273-1920" },
  ],
  doctors: [
    { id: "d1", name: "Dra. Helena Martins", crm: "184532", specialty: "Clínica Geral", clinicId: "c1", hours: "Seg a sex, 8h às 17h" },
    { id: "d2", name: "Dr. Rafael Nogueira", crm: "201874", specialty: "Cardiologia", clinicId: "c1", hours: "Ter e qui, 8h às 12h" },
    { id: "d3", name: "Dra. Camila Prado", crm: "176209", specialty: "Pediatria", clinicId: "c2", hours: "Seg a sex, 8h às 16h" },
    { id: "d4", name: "Dr. Tiago Ferraz", crm: "193018", specialty: "Ortopedia", clinicId: "c2", hours: "Seg, qua e sex" },
    { id: "d5", name: "Dra. Beatriz Lemos", crm: "210447", specialty: "Dermatologia", clinicId: "c2", hours: "Qua e sex, 13h às 17h" },
    { id: "d6", name: "Dra. Larissa Oliveira", crm: "15872", specialty: "Odontologia", clinicId: "c3", hours: "Seg a sáb, 8h às 16h" },
  ],
  patients: [
    { id: "p1", name: "Maria Aparecida Souza", cpf: "123.456.789-09", birth: "1958-03-14", phone: "(15) 99712-4408", plan: "SUS" },
    { id: "p2", name: "João Pedro Camargo", cpf: "987.654.321-00", birth: "2016-09-02", phone: "(15) 99644-1022", plan: "Unimed" },
    { id: "p3", name: "Luciana Barros", cpf: "456.789.123-64", birth: "1987-11-27", phone: "(15) 99801-7765", plan: "Particular" },
  ],
  appointments: [],
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed();
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
const uid = (p) => p + Math.random().toString(36).slice(2, 9);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const initials = (name) =>
  name
    .replace(/^(Dr|Dra)\.?\s/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
const clinicName = (id) => state.clinics.find((c) => c.id === id)?.name ?? "Clínica removida";
const todayISO = () => new Date().toISOString().slice(0, 10);

function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function age(iso) {
  const b = fmtDate(iso);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

/* ---------- Validation ---------- */
const digits = (v) => v.replace(/\D/g, "");
const validCPF = (v) => {
  const c = digits(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += +c[i] * (len + 1 - i);
    const dv = ((sum * 10) % 11) % 10;
    if (dv !== +c[len]) return false;
  }
  return true;
};
const validCNPJ = (v) => digits(v).length === 14;
const validPhone = (v) => [10, 11].includes(digits(v).length);

const mask = {
  cpf: (v) => digits(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
  cnpj: (v) => digits(v).slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2"),
  phone: (v) => {
    const d = digits(v).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  },
};
$$("input[name=cpf]").forEach((i) => i.addEventListener("input", () => (i.value = mask.cpf(i.value))));
$$("input[name=cnpj]").forEach((i) => i.addEventListener("input", () => (i.value = mask.cnpj(i.value))));
$$("input[name=phone]").forEach((i) => i.addEventListener("input", () => (i.value = mask.phone(i.value))));

function setMsg(form, text, type) {
  const el = $(".msg", form);
  el.textContent = text;
  el.className = "msg " + (type || "");
}
function fail(form, field, text) {
  const el = form.elements[field];
  if (el) {
    el.setAttribute("aria-invalid", "true");
    el.focus();
  }
  setMsg(form, text, "err");
  return false;
}
function clearInvalid(form) {
  $$("[aria-invalid]", form).forEach((e) => e.removeAttribute("aria-invalid"));
}
function requireFields(form) {
  clearInvalid(form);
  for (const el of form.elements) {
    if (el.required && !el.value.trim()) return fail(form, el.name, "Preencha todos os campos obrigatórios.");
  }
  return true;
}


/* ---------- Access control ---------- */
// Prototype only: these checks run in the browser. A production system must verify identity and
// permissions on a server; hashes below are not a substitute for real authentication.
const ADMINS = [
  { user: "proprietario", label: "Proprietário", hash: "28c4a4dd105c2df6b4988bd294d238dbf98911a115c245d0732cfb947905395c" },
];
const STAFF_HASH = "c214733fc67d81008adc615efe112e42abd56cc3ad557b764f5e1f6a36ad8ade";
const SESSION_KEY = "agenda-verde:session";
const LOCK_KEY = "agenda-verde:lock";
const ROLE_LABEL = { patient: "Paciente", staff: "Clínica", admin: "Administrador" };
const VIEW_ROLES = { inicio: ["patient", "staff", "admin"], agendar: ["patient", "staff", "admin"], pacientes: ["patient", "staff", "admin"], clinicas: ["staff", "admin"], medicos: ["staff", "admin"] };

let session = loadSession();
function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}
const role = () => session?.role ?? null;
const isAdmin = () => role() === "admin";
const isStaff = () => role() === "staff" || role() === "admin";
const canCancel = (a) => isStaff() || (role() === "patient" && a.patientId === session.patientId);

function sha256Fallback(str) {
  const K = [];
  const H = [];
  const isPrime = (n) => {
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  };
  const frac = (x) => ((x - Math.floor(x)) * 4294967296) | 0;
  for (let n = 2, c = 0; c < 64; n++) {
    if (isPrime(n)) {
      if (c < 8) H[c] = frac(Math.pow(n, 1 / 2));
      K[c++] = frac(Math.pow(n, 1 / 3));
    }
  }
  const bytes = [...new TextEncoder().encode(str)];
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    const w = [];
    for (let i = 0; i < 16; i++) w[i] = (bytes[off + 4 * i] << 24) | (bytes[off + 4 * i + 1] << 16) | (bytes[off + 4 * i + 2] << 8) | bytes[off + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) | 0));
  }
  return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}

async function sha(text) {
  const input = "agenda-verde:" + text;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(input);
}

function lockState() {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY)) || { n: 0, until: 0 };
  } catch {
    return { n: 0, until: 0 };
  }
}
function lockedSeconds() {
  return Math.max(0, Math.ceil((lockState().until - Date.now()) / 1000));
}
function registerFailure() {
  const l = lockState();
  l.n += 1;
  if (l.n >= 5) {
    l.until = Date.now() + 60_000;
    l.n = 0;
  }
  localStorage.setItem(LOCK_KEY, JSON.stringify(l));
}
function clearFailures() {
  localStorage.removeItem(LOCK_KEY);
}

function startSession(next) {
  session = next;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  boot();
}
function endSession() {
  session = null;
  sessionStorage.removeItem(SESSION_KEY);
  location.hash = "#inicio";
  boot();
}

function applyRole() {
  document.body.dataset.role = role() ?? "";
  $$("[data-roles]").forEach((el) => {
    el.hidden = !(role() && el.dataset.roles.split(" ").includes(role()));
  });
  $("#session").hidden = !session;
  if (session) $("#role-badge").textContent = session.name ? `${ROLE_LABEL[role()]} · ${session.name.split(" ")[0]}` : ROLE_LABEL[role()];
  $("#nav-pacientes").textContent = role() === "patient" ? "Meus dados" : "Pacientes";
  $("#pacientes-title").textContent = role() === "patient" ? "Meus dados" : "Pacientes";
  $("#pacientes-list-title").firstChild.textContent = role() === "patient" ? "Meu cadastro " : "Pacientes cadastrados ";
  $("#hero-lead").textContent =
    role() === "patient"
      ? "Escolha a clínica, o médico e um horário livre em Itapetininga. Suas consultas ficam reunidas em um só lugar."
      : "Cadastre a clínica, os médicos por especialidade e os pacientes. Marque consultas em Itapetininga em poucos cliques, sem conflito de horário.";
  $("#reset-data").hidden = !isAdmin();
}

/* ---------- Gate (profile confirmation) ---------- */
const gate = $("#gate");
const gateForms = { patient: $("#gate-patient"), staff: $("#gate-staff"), admin: $("#gate-admin") };

function showGate() {
  gate.hidden = false;
  document.body.classList.add("locked");
  $("#role-choices").hidden = false;
  Object.values(gateForms).forEach((f) => {
    f.hidden = true;
    f.reset();
    setMsg(f, "");
  });
  $("#gate-new").hidden = true;
  $("#role-choices button").focus();
}
function hideGate() {
  gate.hidden = true;
  document.body.classList.remove("locked");
}

$("#role-choices").addEventListener("click", (e) => {
  const pick = e.target.closest("[data-pick]")?.dataset.pick;
  if (!pick) return;
  $("#role-choices").hidden = true;
  gateForms[pick].hidden = false;
  gateForms[pick].elements[0].focus();
});
$$("[data-back]").forEach((b) => b.addEventListener("click", showGate));
$("#gate-patient").cpf.addEventListener("input", (e) => (e.target.value = mask.cpf(e.target.value)));
$("#gate-patient").phone.addEventListener("input", (e) => (e.target.value = mask.phone(e.target.value)));

async function guardedLogin(form, check) {
  const wait = lockedSeconds();
  if (wait) return setMsg(form, `Muitas tentativas. Aguarde ${wait}s.`, "err");
  const ok = await check();
  if (!ok) {
    registerFailure();
    setMsg(form, lockedSeconds() ? "Muitas tentativas. Aguarde 60s." : "Credenciais incorretas.", "err");
    return;
  }
  clearFailures();
}

gateForms.admin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  let found = null;
  await guardedLogin(f, async () => {
    const h = await sha(f.pass.value);
    found = ADMINS.find((a) => a.user === f.user.value.trim().toLowerCase() && a.hash === h);
    return !!found;
  });
  if (found) startSession({ role: "admin", name: found.label });
});

gateForms.staff.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  let ok = false;
  await guardedLogin(f, async () => (ok = (await sha(f.code.value)) === STAFF_HASH));
  if (ok) startSession({ role: "staff", name: "Recepção" });
});

gateForms.patient.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  clearInvalid(f);
  if (!validCPF(f.cpf.value)) return fail(f, "cpf", "CPF inválido.");
  const existing = state.patients.find((p) => digits(p.cpf) === digits(f.cpf.value));
  if (existing) return startSession({ role: "patient", patientId: existing.id, name: existing.name });
  if ($("#gate-new").hidden) {
    $("#gate-new").hidden = false;
    f.name.focus();
    return setMsg(f, "");
  }
  if (!f.name.value.trim()) return fail(f, "name", "Informe o nome completo.");
  if (!f.birth.value || f.birth.value > todayISO()) return fail(f, "birth", "Informe uma data de nascimento válida.");
  if (!validPhone(f.phone.value)) return fail(f, "phone", "Informe um telefone com DDD.");
  const patient = { id: uid("p"), name: f.name.value.trim(), cpf: f.cpf.value, birth: f.birth.value, phone: f.phone.value, plan: f.plan.value };
  state.patients.push(patient);
  save();
  startSession({ role: "patient", patientId: patient.id, name: patient.name });
});

$("#logout").addEventListener("click", endSession);

/* ---------- Rendering ---------- */
function option(value, label) {
  return `<option value="${esc(value)}">${esc(label)}</option>`;
}
function fillSelect(select, items, placeholder) {
  const current = select.value;
  select.innerHTML = (placeholder ? option("", placeholder) : "") + items.map(([v, l]) => option(v, l)).join("");
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

function renderStats() {
  const upcoming = state.appointments.filter((a) => a.date >= todayISO());
  const stats = [
    ["Clínicas", state.clinics.length],
    ["Médicos", state.doctors.length],
    ["Pacientes", state.patients.length],
    ["Consultas", upcoming.length],
  ];
  $("#stats").innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  const specs = new Set(state.doctors.map((d) => d.specialty)).size;
  $("#today-list").textContent = `${specs} especialidades atendendo em ${state.clinics.length} clínicas de Itapetininga.`;
}

function renderClinics() {
  $("#count-clinics").textContent = state.clinics.length;
  $("#list-clinics").innerHTML =
    state.clinics
      .map(
        (c) => `<li class="item">
        <div class="avatar" aria-hidden="true">${esc(initials(c.name))}</div>
        <div>
          <h4>${esc(c.name)}</h4>
          <p>${esc(c.address)} · ${esc(c.district)}</p>
          <p>${esc(c.phone)} · CNPJ ${esc(c.cnpj)}</p>
          <p><span class="tag">${state.doctors.filter((d) => d.clinicId === c.id).length} médicos</span></p>
        </div>
        ${isAdmin() ? `<button class="del" data-del-clinic="${c.id}" type="button">Remover</button>` : ""}
      </li>`
      )
      .join("") || `<li class="empty">Nenhuma clínica cadastrada.</li>`;
}

let specialtyFilter = "";
function renderDoctors() {
  const used = [...new Set(state.doctors.map((d) => d.specialty))].sort();
  $("#filter-specialty").innerHTML = ["", ...used]
    .map((s) => `<button class="chip" type="button" data-spec="${esc(s)}" aria-pressed="${s === specialtyFilter}">${s || "Todas"}</button>`)
    .join("");
  const list = state.doctors.filter((d) => !specialtyFilter || d.specialty === specialtyFilter);
  $("#count-doctors").textContent = list.length;
  $("#list-doctors").innerHTML =
    list
      .map(
        (d) => `<li class="item">
        <div class="avatar" aria-hidden="true">${esc(initials(d.name))}</div>
        <div>
          <h4>${esc(d.name)}</h4>
          <p><span class="tag">${esc(d.specialty)}</span>CRM-SP ${esc(d.crm)}</p>
          <p>${esc(clinicName(d.clinicId))}${d.hours ? " · " + esc(d.hours) : ""}</p>
        </div>
        ${isAdmin() ? `<button class="del" data-del-doctor="${d.id}" type="button">Remover</button>` : ""}
      </li>`
      )
      .join("") || `<li class="empty">Nenhum médico nesta especialidade.</li>`;
}

function renderPatients() {
  const q = $("#search-patients").value.trim().toLowerCase();
  const list = state.patients.filter((p) => (role() === "patient" ? p.id === session.patientId : p.name.toLowerCase().includes(q)));
  $("#count-patients").textContent = list.length;
  $("#list-patients").innerHTML =
    list
      .map(
        (p) => `<li class="item">
        <div class="avatar" aria-hidden="true">${esc(initials(p.name))}</div>
        <div>
          <h4>${esc(p.name)}</h4>
          <p><span class="tag">${esc(p.plan)}</span>${age(p.birth)} anos · CPF ${esc(p.cpf)}</p>
          <p>${esc(p.phone)}</p>
        </div>
        ${isAdmin() ? `<button class="del" data-del-patient="${p.id}" type="button">Remover</button>` : ""}
      </li>`
      )
      .join("") || `<li class="empty">Nenhum paciente encontrado.</li>`;
}

function renderAppointments() {
  const list = state.appointments.filter((a) => role() !== "patient" || a.patientId === session.patientId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $("#count-appts").textContent = list.length;
  $("#list-appts").innerHTML =
    list
      .map((a) => {
        const d = state.doctors.find((x) => x.id === a.doctorId);
        const p = state.patients.find((x) => x.id === a.patientId);
        const dt = fmtDate(a.date);
        return `<li class="item">
        <div class="appt-date" aria-hidden="true"><b>${dt.getDate()}</b><small>${dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small></div>
        <div>
          <h4>${a.time} · ${esc(p?.name ?? "Paciente removido")}</h4>
          <p><span class="tag">${esc(d?.specialty ?? "—")}</span>${esc(d?.name ?? "Médico removido")}</p>
          <p>${esc(clinicName(a.clinicId))}</p>
        </div>
        ${canCancel(a) ? `<button class="del" data-del-appt="${a.id}" type="button">Cancelar</button>` : ""}
      </li>`;
      })
      .join("") || `<li class="empty">Nenhuma consulta agendada. Use o formulário ao lado.</li>`;
}

/* ---------- Booking form ---------- */
const bookForm = $("#form-agendar");

function refreshBookingSelects() {
  fillSelect(bookForm.clinic, state.clinics.map((c) => [c.id, c.name]), "Selecione a clínica");
  const mine = role() === "patient";
  fillSelect(bookForm.patient, state.patients.filter((p) => !mine || p.id === session.patientId).map((p) => [p.id, p.name]), mine ? "" : "Selecione o paciente");
  if (mine) bookForm.patient.value = session.patientId;
  refreshBookingDoctors();
}
function refreshBookingDoctors() {
  const clinicId = bookForm.clinic.value;
  const inClinic = state.doctors.filter((d) => d.clinicId === clinicId);
  const specs = [...new Set(inClinic.map((d) => d.specialty))];
  fillSelect(bookForm.specialty, specs.map((s) => [s, s]), "Todas as especialidades");
  const spec = bookForm.specialty.value;
  fillSelect(
    bookForm.doctor,
    inClinic.filter((d) => !spec || d.specialty === spec).map((d) => [d.id, d.name]),
    clinicId ? "Selecione o médico" : "Escolha a clínica primeiro"
  );
  renderSlots();
}
function renderSlots() {
  const { doctor, date } = bookForm.elements;
  const box = $("#slots");
  if (!doctor.value || !date.value) {
    box.innerHTML = `<p class="slots-empty">Escolha médico e data para ver os horários.</p>`;
    return;
  }
  const taken = new Set(state.appointments.filter((a) => a.doctorId === doctor.value && a.date === date.value).map((a) => a.time));
  const now = new Date();
  const isToday = date.value === todayISO();
  box.innerHTML = SLOT_TIMES.map((t) => {
    const [h, m] = t.split(":").map(Number);
    const past = isToday && h * 60 + m <= now.getHours() * 60 + now.getMinutes();
    const off = taken.has(t) || past;
    return `<label class="slot"><input type="radio" name="time" value="${t}" ${off ? "disabled" : ""} /><span>${t}</span></label>`;
  }).join("");
}

bookForm.clinic.addEventListener("change", refreshBookingDoctors);
bookForm.specialty.addEventListener("change", refreshBookingDoctors);
bookForm.doctor.addEventListener("change", renderSlots);
bookForm.date.addEventListener("change", renderSlots);
bookForm.date.min = todayISO();

bookForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!session) return;
  if (!requireFields(bookForm)) return;
  const time = bookForm.elements.time?.value;
  if (!time) return setMsg(bookForm, "Selecione um horário disponível.", "err");
  const { clinic, doctor, date } = bookForm.elements;
  const patientId = role() === "patient" ? session.patientId : bookForm.patient.value;
  if (date.value < todayISO()) return fail(bookForm, "date", "Escolha uma data a partir de hoje.");
  if (state.appointments.some((a) => a.doctorId === doctor.value && a.date === date.value && a.time === time)) {
    renderSlots();
    return setMsg(bookForm, "Esse horário acabou de ser ocupado.", "err");
  }
  state.appointments.push({ id: uid("a"), clinicId: clinic.value, doctorId: doctor.value, patientId, date: date.value, time });
  save();
  renderSlots();
  renderAppointments();
  renderStats();
  setMsg(bookForm, `Consulta confirmada para ${fmtDate(date.value).toLocaleDateString("pt-BR")} às ${time}.`, "ok");
});

/* ---------- Registration forms ---------- */
$("#form-clinica").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  if (!isStaff()) return;
  if (!requireFields(f)) return;
  if (!validCNPJ(f.cnpj.value)) return fail(f, "cnpj", "CNPJ deve ter 14 dígitos.");
  if (!validPhone(f.phone.value)) return fail(f, "phone", "Informe um telefone com DDD.");
  if (state.clinics.some((c) => digits(c.cnpj) === digits(f.cnpj.value))) return fail(f, "cnpj", "Este CNPJ já está cadastrado.");
  state.clinics.push({ id: uid("c"), name: f.name.value.trim(), cnpj: f.cnpj.value, district: f.district.value.trim(), address: f.address.value.trim(), phone: f.phone.value });
  save();
  f.reset();
  setMsg(f, "Clínica cadastrada com sucesso.", "ok");
  renderAll();
});

$("#form-medico").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  if (!isStaff()) return;
  if (!requireFields(f)) return;
  if (digits(f.crm.value).length < 4) return fail(f, "crm", "Informe um CRM válido.");
  if (state.doctors.some((d) => d.crm === digits(f.crm.value))) return fail(f, "crm", "Este CRM já está cadastrado.");
  state.doctors.push({ id: uid("d"), name: f.name.value.trim(), crm: digits(f.crm.value), specialty: f.specialty.value, clinicId: f.clinic.value, hours: f.hours.value.trim() });
  save();
  f.reset();
  setMsg(f, "Médico cadastrado com sucesso.", "ok");
  renderAll();
});

$("#form-paciente").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  if (!isStaff()) return;
  if (!requireFields(f)) return;
  if (!validCPF(f.cpf.value)) return fail(f, "cpf", "CPF inválido.");
  if (!validPhone(f.phone.value)) return fail(f, "phone", "Informe um telefone com DDD.");
  if (f.birth.value > todayISO()) return fail(f, "birth", "Data de nascimento no futuro.");
  if (state.patients.some((p) => digits(p.cpf) === digits(f.cpf.value))) return fail(f, "cpf", "Este CPF já está cadastrado.");
  state.patients.push({ id: uid("p"), name: f.name.value.trim(), cpf: f.cpf.value, birth: f.birth.value, phone: f.phone.value, plan: f.plan.value });
  save();
  f.reset();
  setMsg(f, "Paciente cadastrado com sucesso.", "ok");
  renderAll();
});

/* ---------- Delegated actions ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  const d = t.dataset;
  if ((d.delClinic || d.delDoctor || d.delPatient || t.id === "reset-data") && !isAdmin()) return;
  if (d.delClinic) {
    if (!confirm("Remover a clínica, seus médicos e consultas?")) return;
    const docs = state.doctors.filter((x) => x.clinicId === d.delClinic).map((x) => x.id);
    state.clinics = state.clinics.filter((x) => x.id !== d.delClinic);
    state.doctors = state.doctors.filter((x) => x.clinicId !== d.delClinic);
    state.appointments = state.appointments.filter((a) => !docs.includes(a.doctorId));
  } else if (d.delDoctor) {
    if (!confirm("Remover este médico e suas consultas?")) return;
    state.doctors = state.doctors.filter((x) => x.id !== d.delDoctor);
    state.appointments = state.appointments.filter((a) => a.doctorId !== d.delDoctor);
  } else if (d.delPatient) {
    if (!confirm("Remover este paciente e suas consultas?")) return;
    state.patients = state.patients.filter((x) => x.id !== d.delPatient);
    state.appointments = state.appointments.filter((a) => a.patientId !== d.delPatient);
  } else if (d.delAppt) {
    const appt = state.appointments.find((x) => x.id === d.delAppt);
    if (!appt || !canCancel(appt)) return;
    state.appointments = state.appointments.filter((x) => x.id !== d.delAppt);
  } else if (d.spec !== undefined) {
    specialtyFilter = d.spec;
    return renderDoctors();
  } else if (t.id === "reset-data") {
    if (!confirm("Restaurar os dados de exemplo? Seus cadastros serão perdidos.")) return;
    state = seed();
  } else return;
  save();
  renderAll();
});

$("#search-patients").addEventListener("input", renderPatients);

/* ---------- Router ---------- */
function route() {
  const name = location.hash.slice(1);
  let view = $("#view-" + name) ? name : "inicio";
  if (!VIEW_ROLES[view]?.includes(role())) {
    view = "inicio";
    if (name && name !== "inicio") history.replaceState(null, "", "#inicio");
  }
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  $$("#nav a").forEach((a) => (a.getAttribute("data-view") === view ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  document.title = `${$("#view-" + view).dataset.title} · Agenda Verde`;
  window.scrollTo({ top: 0 });
}
window.addEventListener("hashchange", route);

function renderAll() {
  fillSelect($("#form-medico").specialty, SPECIALTIES.map((s) => [s, s]));
  fillSelect($("#form-medico").clinic, state.clinics.map((c) => [c.id, c.name]), "Selecione a clínica");
  refreshBookingSelects();
  renderStats();
  renderClinics();
  renderDoctors();
  renderPatients();
  renderAppointments();
}

function boot() {
  if (!session) {
    applyRole();
    showGate();
    return;
  }
  hideGate();
  applyRole();
  renderAll();
  route();
}
boot();
