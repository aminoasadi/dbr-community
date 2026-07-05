import { runEnhancers } from "./helpers";

const observers = new Map();
const PAGE_CHANGE_DELAYS = [0, 120, 400, 900];
let pageSchedulerBound = false;

function disconnectObserver(name) {
  const entry = observers.get(name);

  if (!entry) {
    return;
  }

  entry.disconnect();
  observers.delete(name);
}

function ensureObserver(name, target, callback, options) {
  const current = observers.get(name);

  if (current && current.__target === target) {
    return current;
  }

  disconnectObserver(name);

  if (!target) {
    return null;
  }

  const observer = new MutationObserver(callback);
  observer.__target = target;
  observer.observe(target, options);
  observers.set(name, observer);

  return observer;
}

function scheduleEnhancers() {
  PAGE_CHANGE_DELAYS.forEach((delay) => {
    setTimeout(() => runEnhancers(), delay);
  });
}

function setupAnimations(api) {
  if (pageSchedulerBound) {
    return;
  }

  pageSchedulerBound = true;
  api.onPageChange(() => scheduleEnhancers());
  scheduleEnhancers();
}

export { disconnectObserver, ensureObserver, scheduleEnhancers, setupAnimations };
