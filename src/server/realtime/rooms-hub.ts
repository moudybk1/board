/**
 * In-process fan-out for lobby room-list changes.
 * SSE clients subscribe; join (and later create/leave) call `notifyRoomsChanged`.
 * Multi-instance deploy would swap this for Redis pub/sub · same API.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeRooms(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyRoomsChanged() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error("[rooms-hub] listener error", error);
    }
  }
}
