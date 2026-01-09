# StockSync CLI

Herramienta **CLI** para sincronizar stock desde un ERP interno hacia los marketplaces **Makro** y **WooCommerce**.

## Resumen

**StockSync** es una herramienta de línea de comandos hecha con **NestJS** y **TypeScript** para mantener sincronizado el stock de productos entre un ERP y distintos canales de venta.

Es una aplicación **CLI**, no una API.
NestJS se usa únicamente como **contenedor de dependencias**, para mantener el código ordenado y fácil de extender.

El foco del proyecto está en:

* que la sincronización funcione de punta a punta
* poder ejecutar varios procesos a la vez sin pisarse
* evitar efectos secundarios (actualizaciones idempotentes)
* mantener una arquitectura simple y fácil de entender

## Funcionalidades

* **Sincronización FULL** de stock desde ERP a Makro y WooCommerce
* **Sincronización incremental**, usando la última ejecución como referencia (SQLite local)
* **Ejecución concurrente sin solapamientos** usando sharding por SKU
* **Soporte multi-canal** (Makro y WooCommerce)
* **Actualizaciones en lotes** para mejorar rendimiento
* **CLI configurable** mediante flags (`--target`, `--mode`, `--workers`, `--worker`)

## Instalación

### Requisitos

* Node.js v18+
* npm

### Setup

```bash
git clone <repository-url>
cd backend-engineer-test-oct25-main
npm install
npm run build
```

## Uso

### Comandos rápidos

```bash
# Sincronización completa
npm run sync:makro
npm run sync:woo

# Sincronización incremental
npm run sync:makro:incremental
npm run sync:woo:incremental
```

### Uso directo del CLI

```bash
npm run start -- sync --target=makro
npm run start -- sync --target=woo

npm run start -- sync --target=makro --mode=incremental
```

## Ejecución Concurrente (Sharding)

La herramienta permite ejecutar varios procesos en paralelo sin que se pisen entre ellos.

```bash
# Ejemplo con 3 workers
npm run start -- sync --target=makro --workers=3 --worker=0
npm run start -- sync --target=makro --workers=3 --worker=1
npm run start -- sync --target=makro --workers=3 --worker=2
```

### Cómo funciona

* Cada proceso lee todos los productos del ERP
* Cada producto se asigna a un único proceso usando su **SKU**

```ts
hash(SKU) % totalWorkers === workerId
```

Esto permite:

* no usar locks
* no compartir estado entre procesos
* escalar simplemente lanzando más workers
* asegurar que cada producto se procesa una sola vez

## Arquitectura (a alto nivel)

* **ERP Client**
  Se encarga de leer productos del ERP con paginación y filtros por fecha.

* **Clientes de Canal (Makro / WooCommerce)**
  Encargados de enviar las actualizaciones de stock en lotes.

* **StockSyncService**
  Orquesta todo el flujo:

  * lectura del ERP
  * sharding
  * batching
  * envío al canal
  * guardado del estado

* **State Service (SQLite)**
  Guarda la información necesaria para poder hacer sincronizaciones incrementales.

## Decisiones Técnicas

* **NestJS** usado solo como contenedor de DI
* **TypeScript** con tipado claro y explícito
* **SKU como identificador único** del producto en todo el sistema
* **Actualizaciones idempotentes** (`set stock = X`)
* **Sharding determinístico** para concurrencia segura
* **SQLite local** para persistir el estado del modo incremental

## Pendiente para Producción

Para un entorno real de producción, aún quedarían algunos puntos por completar:

* Añadir reglas de negocio para controlar el stock por producto o categoría
* Mejorar el manejo de errores al llamar a APIs externas
* Añadir logs y métricas para poder detectar problemas
* Guardar el estado de sincronización en una base de datos remota
* Incorporar tests automatizados para asegurar estabilidad a largo plazo

## Licencia

MIT

## Autor

**David Losas González**
- [davidlosas93@gmail.com](mailto:davidlosas93@gmail.com)
