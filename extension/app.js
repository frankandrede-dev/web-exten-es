// WhatsApp Web Companion — MVP local, sem servidores nem leitura de mensagens.
const DEFAULT_SETTINGS = { theme: "original", density: "comfortable", fontScale: "normal" };
const STORE_KEYS = ["tasks", "notes", "replies", "settings"];
const NAV = [
  ["dashboard", "Início"],
  ["tasks", "Demandas"],
  ["notes", "Notas"],
  ["replies", "Respostas"],
  ["settings", "Ajustes"]
];
const LABELS = {
  pending: "Pendente",
  progress: "Em andamento",
  done: "Concluída",
  low: "Baixa",
  medium: "Média",
  high: "Alta"
};
const FIELDS = {
  tasks: ["title", "description", "contact", "priority", "status", "dueDate"],
  notes: ["title", "content", "contact"],
  replies: ["title", "category", "content"]
};
let state = { tasks: [], notes: [], replies: [], settings: { ...DEFAULT_SETTINGS } };
let route = "dashboard";
let taskFilter = "all";
let toastTimer;

function element(tag, props = {}, children = []) {
  const result = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (key === "class") result.className = value;
    else if (key === "text") result.textContent = String(value);
    else if (key === "value") result.value = value;
    else if (key === "checked") result.checked = Boolean(value);
    else if (key.startsWith("on") && typeof value === "function") {
      result.addEventListener(key.slice(2).toLowerCase(), value);
    } else result.setAttribute(key, String(value));
  }
  const items = Array.isArray(children) ? children.flat(Infinity) : [children];
  for (const child of items) {
    if (child == null || child === false) continue;
    result.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return result;
}

function button(text, onClick, variant = "secondary", size = "small") {
  return element("button", {
    type: "button",
    class: "button " + variant + " " + size,
    text,
    onClick
  });
}

function localDate() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Sem prazo";
  const parts = value.split("-");
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function isOverdue(task) {
  return Boolean(task.dueDate && task.dueDate < localDate() && task.status !== "done");
}

function toast(message) {
  const target = document.getElementById("toast");
  target.textContent = message;
  target.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => target.classList.remove("visible"), 3500);
}

async function save(key) {
  try {
    await chrome.storage.local.set({ [key]: state[key] });
    render();
  } catch (error) {
    console.error("Falha ao salvar dados locais", error);
    toast("Não foi possível salvar. Verifique o armazenamento local.");
  }
}

function setRoute(next) {
  route = next;
  render();
}

function head(title, subtitle, text, onClick) {
  const left = element("div", {}, [
    element("h2", { text: title }),
    element("p", { text: subtitle })
  ]);
  const children = [left];
  if (text) children.push(button(text, onClick, "", ""));
  return element("div", { class: "section-head" }, children);
}

function badge(text, type = "") {
  return element("span", { class: "badge " + type, text });
}

function empty(icon, title, description) {
  return element("div", { class: "empty" }, [
    element("span", { class: "emoji", text: icon }),
    element("strong", { text: title }),
    element("p", { text: description })
  ]);
}

function metric(number, label) {
  return element("div", { class: "metric" }, [
    element("strong", { text: number }),
    element("span", { text: label })
  ]);
}

function taskCard(task) {
  const status = task.status || "pending";
  const priority = task.priority || "medium";
  const meta = [task.contact ? "Contato: " + task.contact : "Sem contato", "Prazo: " + formatDate(task.dueDate)];
  if (isOverdue(task)) meta.push("Atrasada");
  const card = element("article", { class: "card" }, [
    element("div", { class: "card-head" }, [
      element("h3", { text: task.title }),
      badge(LABELS[status] || "Pendente", status)
    ]),
    task.description ? element("p", { text: task.description }) : null,
    element("div", { class: "meta", text: meta.join(" • ") }),
    badge("Prioridade: " + (LABELS[priority] || "Média"), priority),
    element("div", { class: "actions" }, [
      button("Editar", () => openEditor("tasks", task)),
      button(status === "done" ? "Reabrir" : "Avançar status", () => advanceTask(task)),
      button("Excluir", () => removeItem("tasks", task.id), "danger")
    ])
  ]);
  return card;
}

function noteCard(note) {
  return element("article", { class: "card" }, [
    element("h3", { text: note.title }),
    note.contact ? element("div", { class: "meta", text: "Contato: " + note.contact }) : null,
    element("p", { text: note.content || "Nota vazia" }),
    element("div", { class: "actions" }, [
      button("Editar", () => openEditor("notes", note)),
      button("Excluir", () => removeItem("notes", note.id), "danger")
    ])
  ]);
}

function replyCard(reply) {
  return element("article", { class: "card" }, [
    element("div", { class: "card-head" }, [
      element("h3", { text: reply.title }),
      reply.category ? badge(reply.category) : null
    ]),
    element("p", { text: reply.content }),
    element("div", { class: "actions" }, [
      button("Copiar texto", () => copyReply(reply), "", ""),
      button("Editar", () => openEditor("replies", reply)),
      button("Excluir", () => removeItem("replies", reply.id), "danger")
    ])
  ]);
}

function dashboard() {
  const totalOpen = state.tasks.filter((t) => t.status !== "done").length;
  const progress = state.tasks.filter((t) => t.status === "progress").length;
  const completed = state.tasks.filter((t) => t.status === "done").length;
  const overdue = state.tasks.filter(isOverdue).length;
  const pending = [...state.tasks].filter((t) => t.status !== "done")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).slice(0, 4);
  return element("div", {}, [
    head("Visão geral", "Suas ferramentas de organização, sem serviços externos."),
    element("div", { class: "metrics" }, [
      metric(totalOpen, "Demandas abertas"),
      metric(progress, "Em andamento"),
      metric(completed, "Concluídas"),
      metric(overdue, "Atrasadas")
    ]),
    element("div", { class: "section-head" }, [
      element("div", {}, [element("h2", { text: "Próximas demandas" }), element("p", { text: "Organizadas pelo prazo informado." })]),
      button("Nova", () => openEditor("tasks"), "", "")
    ]),
    pending.length ? pending.map(taskCard) : empty("✓", "Nenhuma demanda aberta", "Crie a primeira demanda para organizar suas atividades."),
    element("div", { class: "info" }, [
      element("strong", { text: "Privacidade por padrão" }),
      element("span", { text: "As informações ficam neste navegador. A extensão não lê automaticamente as mensagens do WhatsApp." })
    ])
  ]);
}

function tasksPage() {
  const filter = element("select", { class: "filter", "aria-label": "Filtrar demandas", onChange: (event) => {
    taskFilter = event.target.value;
    render();
  } });
  for (const [value, title] of [
    ["all", "Todas as demandas"], ["pending", "Pendentes"], ["progress", "Em andamento"],
    ["done", "Concluídas"], ["overdue", "Atrasadas"]
  ]) filter.append(element("option", { value, text: title, selected: taskFilter === value ? "" : null }));
  filter.value = taskFilter;
  const list = [...state.tasks].filter((task) => (
    taskFilter === "all" || (taskFilter === "overdue" ? isOverdue(task) : task.status === taskFilter)
  )).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return element("div", {}, [
    head("Demandas", "Gerencie tarefas e prazos.", "+ Nova", () => openEditor("tasks")),
    filter,
    list.length ? list.map(taskCard) : empty("▤", "Nenhuma demanda", "Adicione uma demanda ou altere o filtro.")
  ]);
}

function notesPage() {
  const list = [...state.notes].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return element("div", {}, [
    head("Anotações", "Informações guardadas localmente.", "+ Nova", () => openEditor("notes")),
    list.length ? list.map(noteCard) : empty("✎", "Nenhuma anotação", "Crie uma nota pessoal ou vinculada manualmente a um contato.")
  ]);
}

function repliesPage() {
  const list = [...state.replies].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return element("div", {}, [
    head("Respostas rápidas", "Copie textos e cole manualmente na conversa.", "+ Nova", () => openEditor("replies")),
    list.length ? list.map(replyCard) : empty("✉", "Nenhuma resposta pronta", "Cadastre suas mensagens favoritas para copiar em um clique.")
  ]);
}

function settingsSelect(labelText, name, options) {
  const select = element("select", { class: "field", "aria-label": labelText, onChange: async (event) => {
    state.settings = { ...state.settings, [name]: event.target.value };
    await save("settings");
    toast("Preferências atualizadas.");
  } });
  for (const [value, title] of options) select.append(element("option", { value, text: title }));
  select.value = state.settings[name] || DEFAULT_SETTINGS[name];
  return element("div", { class: "settings-section" }, [element("label", { class: "label", text: labelText }), select]);
}

function settingsPage() {
  const importInput = element("input", {
    type: "file", accept: "application/json,.json", style: "display:none", onChange: async (event) => {
      await importBackup(event.target.files?.[0]);
    }
  });
  return element("div", {}, [
    head("Configurações", "Personalize a extensão e salve seus dados."),
    element("div", { class: "card" }, [
      element("h3", { text: "Aparência do WhatsApp Web" }),
      element("p", { text: "Ajustes leves e reversíveis. Não interferem no envio de mensagens." }),
      settingsSelect("Tema", "theme", [["original", "Original"], ["slate", "Slate discreto"], ["soft", "Suave"]]),
      settingsSelect("Densidade", "density", [["comfortable", "Confortável"], ["compact", "Compacta (experimental)"]]),
      settingsSelect("Fonte", "fontScale", [["normal", "Normal"], ["large", "Maior (experimental)"]])
    ]),
    element("div", { class: "card" }, [
      element("h3", { text: "Backup e restauração" }),
      element("p", { text: "Exporte um arquivo JSON para manter cópia das demandas, notas e respostas. Restaurar substitui os dados locais." }),
      element("div", { class: "actions" }, [
        button("Exportar backup", exportBackup, "", ""),
        button("Importar backup", () => importInput.click()),
        importInput
      ])
    ]),
    element("div", { class: "info" }, [
      element("strong", { text: "Sem sincronização automática" }),
      element("span", { text: "Dados no chrome.storage.local podem ser perdidos ao desinstalar a extensão ou apagar seu perfil. Faça backups frequentes." })
    ])
  ]);
}

function render() {
  document.body.classList.toggle("dark", state.settings.theme === "slate");
  const root = document.getElementById("app");
  const nav = element("nav", { class: "tabs", "aria-label": "Navegação principal" },
    NAV.map(([key, label]) => element("button", {
      type: "button",
      class: "tab " + (route === key ? "active" : ""),
      text: label,
      "aria-current": route === key ? "page" : null,
      onClick: () => setRoute(key)
    }))
  );
  const pages = { dashboard, tasks: tasksPage, notes: notesPage, replies: repliesPage, settings: settingsPage };
  const screen = (pages[route] || dashboard)();
  root.replaceChildren(element("div", { class: "app" }, [
    element("header", { class: "header" }, [
      element("div", { class: "logo", text: "W" }),
      element("div", { class: "brand" }, [
        element("h1", { text: "WA Companion" }),
        element("p", { text: "Seu painel de produtividade" })
      ]),
      element("span", { class: "local-pill", text: "● Local" })
    ]),
    nav,
    element("main", { class: "main" }, [screen]),
    element("footer", { class: "footer", text: "Dados locais • Nenhuma mensagem monitorada • v0.1.0" })
  ]));
}

function field(label, name, value = "", type = "text", options = [], required = false) {
  const id = "edit-" + name;
  let control;
  if (type === "textarea") {
    control = element("textarea", { id, name, class: "field", maxlength: "5000", required: required ? "" : null, rows: "4", value });
  } else if (type === "select") {
    control = element("select", { id, name, class: "field" }, options.map(([val, text]) => element("option", { value: val, text })));
    control.value = value;
  } else {
    control = element("input", { id, name, type, class: "field", maxlength: type === "date" ? null : "250", required: required ? "" : null, value });
  }
  return element("div", {}, [element("label", { class: "label", for: id, text: label }), control]);
}

function openEditor(kind, current = null) {
  const kindNames = { tasks: "demanda", notes: "nota", replies: "resposta rápida" };
  const form = element("form");
  if (kind === "tasks") {
    form.append(
      field("Título", "title", current?.title || "", "text", [], true),
      field("Descrição", "description", current?.description || "", "textarea"),
      field("Contato (manual)", "contact", current?.contact || ""),
      field("Prioridade", "priority", current?.priority || "medium", "select",
        [["low", "Baixa"], ["medium", "Média"], ["high", "Alta"]]),
      field("Status", "status", current?.status || "pending", "select",
        [["pending", "Pendente"], ["progress", "Em andamento"], ["done", "Concluída"]]),
      field("Prazo", "dueDate", current?.dueDate || "", "date")
    );
  } else if (kind === "notes") {
    form.append(
      field("Título", "title", current?.title || "", "text", [], true),
      field("Conteúdo", "content", current?.content || "", "textarea"),
      field("Contato (manual)", "contact", current?.contact || "")
    );
  } else {
    form.append(
      field("Título", "title", current?.title || "", "text", [], true),
      field("Categoria", "category", current?.category || ""),
      field("Mensagem pronta", "content", current?.content || "", "textarea", [], true)
    );
  }
  const dialog = element("dialog", { class: "dialog" });
  const cancel = button("Cancelar", () => dialog.close());
  const submit = element("button", { type: "submit", class: "button", text: "Salvar" });
  form.append(element("div", { class: "dialog-actions" }, [cancel, submit]));
  dialog.append(element("div", { class: "dialog-inner" }, [
    element("h3", { text: (current ? "Editar " : "Nova ") + kindNames[kind] }), form
  ]));
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const item = {
      id: current?.id || crypto.randomUUID(),
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    for (const name of FIELDS[kind]) item[name] = String(values.get(name) || "").trim();
    const next = current ? state[kind].map((value) => value.id === current.id ? item : value)
      : [...state[kind], item];
    state[kind] = next;
    await save(kind);
    dialog.close();
    toast("Registro salvo localmente.");
  });
  dialog.showModal();
}

async function advanceTask(task) {
  const values = ["pending", "progress", "done"];
  const current = values.indexOf(task.status || "pending");
  const newStatus = task.status === "done" ? "pending" : values[Math.min(current + 1, 2)];
  state.tasks = state.tasks.map((entry) => entry.id === task.id
    ? { ...entry, status: newStatus, updatedAt: new Date().toISOString() } : entry);
  await save("tasks");
  toast("Status atualizado.");
}

async function removeItem(kind, id) {
  if (!confirm("Excluir este registro? Essa ação não pode ser desfeita.")) return;
  state[kind] = state[kind].filter((entry) => entry.id !== id);
  await save(kind);
  toast("Registro excluído.");
}

async function copyReply(reply) {
  try {
    await navigator.clipboard.writeText(reply.content);
    toast("Texto copiado. Cole manualmente no WhatsApp.");
  } catch (error) {
    console.error("Clipboard indisponível", error);
    toast("Não foi possível copiar o texto.");
  }
}

function exportBackup() {
  const data = {
    format: "wwc-backup-v1",
    exportedAt: new Date().toISOString(),
    tasks: state.tasks,
    notes: state.notes,
    replies: state.replies,
    settings: state.settings
  };
  const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const anchor = element("a", { href: objectUrl, download: "whatsapp-companion-backup.json" });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  toast("Backup exportado.");
}

function safeString(input, maxLength = 5000) {
  return typeof input === "string" ? input.slice(0, maxLength) : "";
}

function normalizeRecords(kind, records) {
  if (!Array.isArray(records) || records.length > 2000) throw new Error("Coleção inválida ou grande demais.");
  return records.filter((item) => item && typeof item === "object" && !Array.isArray(item)).map((item) => {
    const entry = {
      id: typeof item.id === "string" && /^[a-z0-9-]{1,80}$/i.test(item.id) ? item.id : crypto.randomUUID(),
      createdAt: safeString(item.createdAt, 40) || new Date().toISOString(),
      updatedAt: safeString(item.updatedAt, 40) || new Date().toISOString()
    };
    for (const key of FIELDS[kind]) entry[key] = safeString(item[key], ["content", "description"].includes(key) ? 5000 : 250);
    if (kind === "tasks") {
      if (!["pending", "progress", "done"].includes(entry.status)) entry.status = "pending";
      if (!["low", "medium", "high"].includes(entry.priority)) entry.priority = "medium";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.dueDate)) entry.dueDate = "";
    }
    return entry;
  });
}

async function importBackup(file) {
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error("Arquivo excede 2 MB.");
    const raw = JSON.parse(await file.text());
    if (!raw || raw.format !== "wwc-backup-v1") throw new Error("Formato de backup desconhecido.");
    const imported = {
      tasks: normalizeRecords("tasks", raw.tasks),
      notes: normalizeRecords("notes", raw.notes),
      replies: normalizeRecords("replies", raw.replies),
      settings: {
        theme: ["original", "slate", "soft"].includes(raw.settings?.theme) ? raw.settings.theme : "original",
        density: ["comfortable", "compact"].includes(raw.settings?.density) ? raw.settings.density : "comfortable",
        fontScale: ["normal", "large"].includes(raw.settings?.fontScale) ? raw.settings.fontScale : "normal"
      }
    };
    if (!confirm("Restaurar backup e substituir todas as demandas, notas e respostas locais?")) return;
    await chrome.storage.local.set(imported);
    state = imported;
    render();
    toast("Backup restaurado.");
  } catch (error) {
    console.error("Importação inválida", error);
    toast("Backup inválido ou falha na restauração.");
  }
}

async function initialize() {
  try {
    const stored = await chrome.storage.local.get(STORE_KEYS);
    state = {
      tasks: Array.isArray(stored.tasks) ? stored.tasks : [],
      notes: Array.isArray(stored.notes) ? stored.notes : [],
      replies: Array.isArray(stored.replies) ? stored.replies : [],
      settings: { ...DEFAULT_SETTINGS, ...(stored.settings || {}) }
    };
    render();
  } catch (error) {
    console.error("Falha ao carregar armazenamento local", error);
    render();
    toast("Não foi possível carregar os dados locais.");
  }
}
initialize();
