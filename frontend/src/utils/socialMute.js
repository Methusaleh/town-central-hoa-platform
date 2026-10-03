export const SOCIAL_MUTE_COPY = "Posting on The Porch and Alerts is paused.";

export function isSocialMuted(user) {
  return Boolean(user?.social_muted);
}
