export type EventModalDismissal = "close-button" | "backdrop" | "escape" | "cancel-button" | "form-submit";

export function canCloseEventModal(trigger: EventModalDismissal): boolean {
  return trigger === "close-button";
}
