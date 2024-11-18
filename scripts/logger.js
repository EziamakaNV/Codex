class Logger {
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = process.env.NODE_ENV === 'production' ? Logger.LEVELS.WARN : Logger.LEVELS.DEBUG;

  static log(level, message, ...args) {
    if (level >= this.currentLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${Object.keys(this.LEVELS)[level]}]`;
      
      if (level >= this.LEVELS.WARN) {
        console.warn(`${prefix} ${message}`, ...args);
      } else {
        console.log(`${prefix} ${message}`, ...args);
      }
    }
  }

  static debug(message, ...args) {
    this.log(this.LEVELS.DEBUG, message, ...args);
  }

  static info(message, ...args) {
    this.log(this.LEVELS.INFO, message, ...args);
  }

  static warn(message, ...args) {
    this.log(this.LEVELS.WARN, message, ...args);
  }

  static error(message, ...args) {
    this.log(this.LEVELS.ERROR, message, ...args);
  }
} 