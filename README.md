# Log Ease

Biblioteca de logging flexível e configurável para JavaScript.

## Instalação

### Usando SSH

```bash
npm install git+ssh://git@github.com:Ecossistema-Conecta/log-ease.git
```

## Uso

### Importação e Inicialização

```javascript
import Logger from 'log-ease';

const logger = new Logger({
  logEndpoint: 'https://url-endpoint-de-logs/logs/',
  batchSize: 10,
  flushInterval: 10000,
  extraHeaders: () => {
    // Dados adicionais a serem incluídos no cabeçalho da requisição.
    return true;
  },
  getAdditionalData: () => ({
  // Dados adicionais a serem incluídos no corpo da requisição.
    data: 'data-example',
  }),
});
```
### Para habilitar o envio de logs para o servidor

```javascript
logger.enableLogging();
```

### Para desabilitar o envio de logs para o servidor

```javascript
logger.disableLogging();
```

### Para o envio de logs individuais para o servidor

```javascript
logger.sendCustomLog('log_level', 'Event Name', { detail: 'Informações adicionais' });
```
