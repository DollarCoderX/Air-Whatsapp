const EventEmitter = require('events');

class DashboardBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emitEvent(type, payload) {
    this.emit(type, payload);
  }
}

const bus = new DashboardBus();
module.exports = bus;
