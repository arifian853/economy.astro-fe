export type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type AlertDialogOptions = {
  title?: string;
  message: string;
  closeLabel?: string;
};

function createDialog(title: string, message: string, role: "alertdialog" | "dialog") {
  const dialog = document.createElement("dialog");
  dialog.className = "app-dialog";
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", title);
  if (role === "alertdialog") dialog.setAttribute("role", role);

  const content = document.createElement("div");
  content.className = "app-dialog-content";

  const heading = document.createElement("h2");
  heading.className = "app-dialog-title";
  heading.textContent = title;

  const description = document.createElement("p");
  description.className = "app-dialog-message";
  description.textContent = message;

  content.append(heading, description);
  dialog.append(content);
  return { dialog, content };
}

export function confirmDialog({
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  destructive = false,
}: ConfirmDialogOptions): Promise<boolean> {
  const { dialog, content } = createDialog(title, message, "dialog");
  const actions = document.createElement("div");
  actions.className = "app-dialog-actions";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn-outline";
  cancel.textContent = cancelLabel;
  cancel.addEventListener("click", () => dialog.close("cancel"));

  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = destructive ? "btn btn-danger" : "btn btn-primary";
  confirm.textContent = confirmLabel;
  confirm.addEventListener("click", () => dialog.close("confirm"));

  actions.append(cancel, confirm);
  content.append(actions);
  document.body.append(dialog);

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "confirm");
      dialog.remove();
    }, { once: true });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });
    dialog.showModal();
    cancel.focus();
  });
}

export function alertDialog({
  title = "Terjadi kesalahan",
  message,
  closeLabel = "Mengerti",
}: AlertDialogOptions): Promise<void> {
  const { dialog, content } = createDialog(title, message, "alertdialog");
  const actions = document.createElement("div");
  actions.className = "app-dialog-actions";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn btn-primary";
  close.textContent = closeLabel;
  close.addEventListener("click", () => dialog.close("close"));

  actions.append(close);
  content.append(actions);
  document.body.append(dialog);

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      resolve();
      dialog.remove();
    }, { once: true });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("close");
    });
    dialog.showModal();
    close.focus();
  });
}
