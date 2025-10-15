/**
 * 日志工具
 */

import chalk from 'chalk';

class Logger {
  constructor() {
    this.isDebug = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }

  info(message, ...args) {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  success(message, ...args) {
    console.log(chalk.green('✅'), message, ...args);
  }

  warn(message, ...args) {
    console.log(chalk.yellow('⚠️'), message, ...args);
  }

  error(message, ...args) {
    console.log(chalk.red('❌'), message, ...args);
  }

  debug(message, ...args) {
    if (this.isDebug) {
      console.log(chalk.gray('🐛'), message, ...args);
    }
  }

  log(message, ...args) {
    console.log(message, ...args);
  }
}

export const logger = new Logger();
