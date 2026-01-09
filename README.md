# StockSync CLI

Herramienta CLI para sincronizar stock desde ERP a los marketplaces Makro y WooCommerce.

---

## Resumen

StockSync es una herramienta de línea de comandos construida con **NestJS** y **TypeScript** para sincronizar inventario de productos desde un sistema ERP interno hacia múltiples canales de venta:

* **Makro** – Marketplace para hostelería
* **WooCommerce** – Plataforma e-commerce (Greenvase.es)

Diseñada para **robustez**, **claridad** y **actualizaciones idempotentes**, la herramienta permite sincronización completa e incremental de stock.

---

## Características

### ✅ Actualmente Implementado

* **Sincronización Completa de Stock**: Sincroniza todos los productos desde ERP hacia los canales objetivo
* **Soporte Multi-Canal**: Soporta tanto Makro como WooCommerce
* **Actualizaciones por Lotes**: Procesamiento eficiente en lotes (100 productos por lote)
* **Paginación**: Maneja catálogos grandes de productos con paginación
* **Interfaz CLI**: Interfaz de línea de comandos con flag `--target`
* **Actualizaciones Idempotentes**: Seguro incluso con productos duplicados de los servidores mock

---

## Instalación

### Prerrequisitos

* Node.js v18+
* npm o yarn

### Configuración

```bash
git clone <repository-url>
cd backend-engineer-test-oct25-main
npm install
npm run build   # opcional
```

---

## Uso

### Inicio Rápido

La forma más fácil de sincronizar stock es usando los scripts de npm:

```bash
# Sincronizar a Makro
npm run sync:makro

# Sincronizar a WooCommerce
npm run sync:woo
```

### Comandos CLI

También puedes usar el CLI directamente con más control:

```bash
# Sincronizar a Makro
npm run start -- sync --target=makro

# Sincronizar a WooCommerce
npm run start -- sync --target=woo

# Mostrar ayuda
npm run start -- --help
```

---

## Estructura del Proyecto

```
src/
├── main.ts                 # Punto de entrada CLI
├── app.module.ts           # Contenedor DI de NestJS
├── clients/                # Clientes de API
│   ├── erp/               # Cliente del sistema ERP
│   ├── makro/             # Cliente del marketplace Makro
│   └── woo/               # Cliente de WooCommerce
└── sync/                   # Lógica de sincronización
    ├── stock-sync.service.ts
    └── types.ts
```

---

## Arquitectura

* **Cliente ERP** – Obtiene productos con soporte de paginación
* **Clientes de Canal** – Manejan actualizaciones de stock para Makro/WooCommerce en lotes
* **Servicio de Sync** – Orquesta la lectura de datos del ERP, agrupa actualizaciones y envía a los canales objetivo
* **CLI** – Interfaz de línea de comandos usando Commander.js

---

## Servidores Mock

Usados para desarrollo y testing:

* **ERP**: `https://stoplight.io/mocks/greenvase/greenvase-test/152899748`
* **Makro**: `https://stoplight.io/mocks/greenvase/greenvase-test/1322555588`
* **WooCommerce**: `https://stoplight.io/mocks/greenvase/greenvase-test/1322555590`

### Limitaciones Conocidas de los Mocks

* Los servidores mock pueden retornar **productos duplicados con el mismo SKU/ID**.
* Por ejemplo, el mismo SKU (`BAN-ALU-001`) puede aparecer múltiples veces en los resultados paginados.

**Cómo StockSync maneja esto:**

* Las actualizaciones son **idempotentes** (`set stock = X`)
* Los duplicados no corrompen el estado final del stock
* El sharding y batching permanecen correctos
* No se implementa lógica extra de deduplicación en el dominio, evitando adaptación a problemas específicos del mock

**En producción:** Se espera que los sistemas ERP retornen SKUs únicos, por lo que los duplicados no deberían ocurrir.

---

## Desarrollo

### Ejecución en Modo Desarrollo

El modo desarrollo usa `ts-node` para ejecutar TypeScript directamente:

```bash
# Sincronizar a Makro
npm run start -- sync --target=makro

# O usar los scripts de npm
npm run sync:makro
npm run sync:woo
```

### Compilación para Producción

1. Compilar TypeScript a JavaScript:
```bash
npm run build
```

2. Ejecutar el código compilado:
```bash
# Sincronizar a Makro
node dist/main.js sync --target=makro

# Sincronizar a WooCommerce
node dist/main.js sync --target=woo
```

---

## Decisiones Técnicas

* **NestJS** – Usado como contenedor de inyección de dependencias, no como framework REST API
* **TypeScript** – Tipado estricto para mejor calidad de código
* **Fetch API** – Fetch nativo de Node.js (no se necesita cliente HTTP externo)
* **Commander.js** – Framework CLI para parsing de comandos
* **Procesamiento por Lotes** – Las actualizaciones se envían en lotes de 100 productos para eficiencia
* **SKU como Identificador Único** – Toda la lógica de sincronización usa SKU como identificador único del producto

---

## Licencia

MIT

---

## Autor

**David Losas González**
📧 [david.losas.gonzalez@gmail.com](mailto:david.losas.gonzalez@gmail.com)
🔗 [LinkedIn](https://www.linkedin.com/in/davidlosasgonzalez)
