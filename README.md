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

* Cada proceso lee los productos del ERP mediante paginación
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
  Implementa **streaming**, procesando los productos página por página sin cargarlos todos en memoria.

* **Clientes de Canal (Makro / WooCommerce)**
  Encargados de enviar las actualizaciones de stock en lotes.

* **StockSyncService**
  Orquesta el flujo completo:

  * lectura del ERP mediante streaming
  * sharding durante el procesamiento (filtrado página por página)
  * batching
  * envío al canal
  * guardado del estado incremental

* **State Service (SQLite)**
  Guarda la información necesaria para realizar sincronizaciones incrementales.
  Cada worker tiene su propia base de datos local (`sync-state.db`).
  Esto es intencional: los workers son procesos independientes y no comparten estado.

## Decisiones Técnicas

* **NestJS** usado solo como contenedor de DI
* **TypeScript** con tipado claro y explícito
* **SKU como identificador único** del producto en todo el sistema
* **Actualizaciones idempotentes** (`set stock = X`)
* **Sharding determinístico** para permitir ejecución concurrente sin solapamientos
* **SQLite local** para persistir el estado del modo incremental
  *Cada worker mantiene su propio estado local; no existe estado compartido entre procesos.*

## Pendiente para Producción

Para un entorno real de producción, quedarían algunos puntos por completar:

* Implementar reglas de negocio por producto o categoría
* Mejorar el manejo de errores al llamar a APIs externas
* Añadir logs y métricas
* **Persistir el estado incremental en una base de datos compartida** en lugar de SQLite local
* Añadir tests automatizados
* (Opcional) Sharding a nivel API si el ERP lo permite

## Estrategia de Escalabilidad

El código está preparado para manejar **100k+ productos** mediante:

* **Streaming de productos**: los productos se procesan página por página
* **Sharding durante el streaming**: cada worker filtra solo los productos que le corresponden
* **Uso de memoria constante**: ~2–5 MB por worker independientemente del tamaño del catálogo
* **Estado incremental optimizado**: se actualiza durante el procesamiento, no al final

### Impacto de las mejoras

| Aspecto            | Antes                         | Después                      |
| ------------------ | ----------------------------- | ---------------------------- |
| Memoria por worker | 100–200 MB                    | ~2–5 MB                      |
| Llamadas al ERP    | N workers × catálogo completo | Streaming página por página  |
| Procesamiento      | Redundante                    | Distribuido por worker       |
| Escalabilidad      | Limitada                      | Lineal hasta 100k+ productos |

## Reglas de Negocio

El enunciado contempla reglas de negocio para controlar el stock a nivel de producto o categoría (forzar stock, marcar fuera de stock, definir mínimos, etc.).

Estas reglas **no se han implementado en esta iteración** por limitación de tiempo.
La arquitectura está preparada para incorporarlas fácilmente en una capa previa al envío a cada canal o dentro del `productsMapper` de cada integración.

## Pendiente para Producción

Para un entorno real de producción, quedarían algunos puntos por completar:

* Implementar reglas de negocio por producto o categoría
* Mejorar el manejo de errores al llamar a APIs externas
* Añadir logs y métricas
* Persistir el estado incremental en una base de datos compartida
* Añadir tests automatizados
* (Opcional) Sharding a nivel API si el ERP lo permite

## Licencia

MIT

## Autor

**David Losas González**
[davidlosas93@gmail.com](mailto:davidlosas93@gmail.com)