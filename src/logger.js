import axios from 'axios';

class Logger {
   /**
   * Cria uma instância de Logger.
   *
   * @param {Object} options - Configurações para o Logger.
   * @param {string} options.logEndpoint - URL do endpoint para enviar os logs.
   * @param {number} [options.batchSize=10] - Tamanho do lote de logs para envio.
   * @param {number} [options.flushInterval=10000] - Intervalo em milissegundos para agendar o envio dos logs.
   * @param {Function} [options.getAdditionalData=() => ({})] - Função que retorna dados adicionais a serem incluídos em cada log.
   * @param {Object} [options.extraHeaders={}] - Dados adicionais a serem incluídos no cabeçalho da requisição.
   */
    constructor(options = {}) {
        this.logEndpoint = options.logEndpoint;
        this.batchSize = options.batchSize || 30;
        this.flushInterval = options.flushInterval || 30000;
        this.getAdditionalData = options.getAdditionalData || (() => ({}));
        this.extraHeaders = options.extraHeaders || {};

        this.logQueue = [];
        this.isLoggingActive = false;

        this.originalConsoleMethods = {};
        this.originalErrorHandler = window.onerror;
        this.originalUnhandledRejectionHandler = window.onunhandledrejection;

        this.flushTimeout = null;
    }

    scheduleFlush() {
        if (this.flushTimeout) clearTimeout(this.flushTimeout);
        if (this.isLoggingActive) this.flushTimeout = setTimeout(() => {this.flushLogs()}, this.flushInterval);
    }

    async flushLogs() {
        if (!this.isLoggingActive) return;

        const batch = this.logQueue.splice(0, this.logQueue.length);
        const additionalData = this.getAdditionalData();

        const data = { logs: batch, ...additionalData };
        const headers = { 'Content-Type': 'application/json', ...this.extraHeaders };

        try {
            if (this.logEndpoint && batch.length > 0) await axios.post(this.logEndpoint, data, { headers });
        } catch (error) {
            if (this.logQueue.length < 50) this.logQueue = batch.concat(this.logQueue);
        } finally {
            this.scheduleFlush();
        }
    }

    sendLog(level, origin, data = {}) {
        if (!this.isLoggingActive) return;

        const logEntry = {
            level,
            origin,
            data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
        };

        this.logQueue.push(logEntry);

        if (this.logQueue.length >= this.batchSize) this.flushLogs();
    }

    interceptConsoleMethods() {
        ['log', 'info', 'warn', 'error', 'debug'].forEach((method) => {
            if (!this.originalConsoleMethods[method]) this.originalConsoleMethods[method] = console[method];

            const self = this;
            console[method] = function (...args) {
                let safeArgs;
                try {
                    safeArgs = args.map(arg => {
                        try {
                            return JSON.parse(JSON.stringify(arg));
                        } catch {
                            return String(arg);
                        }
                    });
                } catch (e) {
                    safeArgs = ['[Unable to serialize arguments]'];
                }

                self.sendLog(method, 'Console Logs', { args: safeArgs });
                self.originalConsoleMethods[method].apply(console, args);
            };
        });
    }

    restoreConsoleMethods() {
        Object.keys(this.originalConsoleMethods).forEach((method) => {
            console[method] = this.originalConsoleMethods[method];
        });
    }

    enableLogging() {
        if (this.isLoggingActive) return;

        this.isLoggingActive = true;
        this.interceptConsoleMethods();

        const self = this;

        window.onerror = function (message, source, lineno, colno, error) {
            self.sendLog('error', 'Global Error', {
                message,
                source,
                lineno,
                colno,
                error: error ? error.stack : null,
            });

            if (self.originalErrorHandler) self.originalErrorHandler.apply(this, arguments);
        };

        window.onunhandledrejection = function (event) {
            let data;
            if (typeof event === 'string') data = { message: event };
            else {
                const { reason: eventReason, name, message, code, type, detail = {} } = event;
                data = {
                    reason: eventReason || detail.reason,
                    name,
                    message,
                    code,
                    type,
                };

                if (event.isAxiosError && event.response) {
                    data.code = event.response.status;
                    data.details = {
                        status: event.response.status,
                        data: event.response.data,
                        headers: event.response.headers,
                        config: event.response.config,
                    };
                }
            }

            self.sendLog('error', 'Unhandled Promise Rejection', data);

            if (self.originalUnhandledRejectionHandler) self.originalUnhandledRejectionHandler.apply(this, arguments);
        };

        this.scheduleFlush();
    }

    disableLogging() {
        if (!this.isLoggingActive) return;

        this.isLoggingActive = false;
        clearTimeout(this.flushTimeout);
        this.restoreConsoleMethods();

        window.onerror = this.originalErrorHandler;
        window.onunhandledrejection = this.originalUnhandledRejectionHandler;
    }

    sendCustomLog(level, origin, additionalData = {}) {
        this.sendLog(level, origin, additionalData);
    }

}

export default Logger;
