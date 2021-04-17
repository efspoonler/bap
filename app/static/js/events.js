/* eslint-disable no-underscore-dangle */
export default class EventEmitter {
  constructor() {
    this._events = {};
  }

  onEvent(evt, listener) {
    (this._events[evt] || (this._events[evt] = [])).push(listener);
    return this;
  }

  emit(evt, arg) {
    (this._events[evt] || []).slice().forEach((lsn) => lsn(arg));
  }
}
