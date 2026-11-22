# VideoVault

Biblioteca privada de vídeos. Cada usuario crea su cuenta, sube vídeos desde
el navegador **directamente al almacenamiento S3**, los etiqueta con tags y
datos propios (`cliente: acme`), los busca y los reproduce. Un panel muestra
cuántos vídeos tiene, cuánto ocupan y sus tags más usados.

La interfaz sigue la idea de una **mesa de luz**: cada vídeo es una diapositiva
con su propio fotograma como miniatura y su duración, y al pasar el mouse se
reproduce en silencio dentro del marco.

El enunciado original está en [`README-enunciado.md`](README-enunciado.md).

## Demo

📹 El vídeo demo se entrega en la plataforma de CodeCrypto Academy, junto con
este repositorio.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, estado de sesión en `context/` |
| Backend | API Routes + `proxy.ts` (el sustituto de `middleware.ts` en Next.js 16) |
| Almacenamiento | RustFS (compatible con S3), con `@aws-sdk/client-s3` y URLs firmadas |
| Metadatos | MongoDB, driver nativo, base `videovault` |
| Autenticación | Registro y login con `bcryptjs` + JWT (`jose`) en cookie `httpOnly` |
| Tests | Vitest con cobertura; pipeline en GitLab CI |

## Cómo funciona

### Subir un vídeo: tres pasos, y el vídeo nunca pasa por Next.js

```
 Navegador                         Next.js (API)                  RustFS (S3)      MongoDB
    │  1. POST /api/videos             │                              │               │
    │     nombre, tags, tamaño, tipo ─►│ valida, guarda "uploading" ─────────────────►│
    │ ◄─────────── URL firmada de PUT ─│                              │               │
    │                                  │                              │               │
    │  2. PUT del fichero, con barra de progreso ────────────────────►│               │
    │                                  │                              │               │
    │  3. POST /api/videos/{id}/complete                              │               │
    │ ────────────────────────────────►│ ¿está? ¿cuánto ocupa? ──────►│               │
    │                                  │ tamaño real, "ready" ───────────────────────►│
```

### Reproducir

`GET /api/videos/{id}` devuelve los metadatos y una **URL firmada de lectura**
que caduca en una hora. El `<video>` del navegador la usa como `src` y pide a
RustFS los trozos que necesita.

### Estructura

```
app/
  page.tsx, login/, registro/     Páginas públicas
  videos/                         Biblioteca: panel, búsqueda y listado
  videos/subir/                   Subida con barra de progreso
  videos/[id]/                    Reproductor, edición y borrado
  api/auth/                       register, login, logout, me
  api/videos/                     listar y buscar, crear subida, ver, editar, borrar, completar
  api/stats/                      Panel: número de vídeos y espacio
context/AuthContext.tsx           Quién es el usuario, para toda la interfaz
components/                       Formularios, biblioteca, ficha del vídeo
lib/
  s3.ts                           RustFS: URLs firmadas, bucket, tamaño, borrado
  db.ts, search.ts                MongoDB: colecciones, índices, búsqueda, agregación
  jwt.ts, session.ts, password.ts Sesión y contraseñas
  validation.ts                   Reglas de todo lo que llega del navegador
  upload.ts                       PUT con progreso desde el navegador
  tags.ts, duration.ts            Fichas de tags y duración de los vídeos
proxy.ts                          Protege /videos/*
docker-compose.yml                RustFS (con CORS) y MongoDB
```

### Modelo de datos

```
users   { email (único), passwordHash, createdAt }
videos  { userId, s3Key, name, description, tags[], meta[{key, value}],
          contentType, sizeBytes, status: "uploading" | "ready", createdAt }
```

En RustFS, cada vídeo es el objeto `videos/<userId>/<videoId>`.

### Endpoints

Todos los de vídeos exigen sesión y solo ven los vídeos del usuario.

| Método | Ruta | Qué hace |
|--------|------|----------|
| POST | `/api/auth/register` | Crea la cuenta e inicia sesión |
| POST | `/api/auth/login` | Inicia sesión |
| POST | `/api/auth/logout` | Cierra la sesión |
| GET | `/api/auth/me` | El usuario de la sesión, o 401 |
| GET | `/api/videos?q=&tag=&key=&value=` | Lista y busca; cada vídeo con su URL de miniatura |
| POST | `/api/videos` | Paso 1 de la subida: metadatos y URL firmada |
| POST | `/api/videos/{id}/complete` | Paso 3: comprueba el fichero en RustFS |
| GET | `/api/videos/{id}` | Metadatos y URL firmada para reproducir |
| PATCH | `/api/videos/{id}` | Edita nombre, descripción, tags o datos |
| DELETE | `/api/videos/{id}` | Borra el fichero y sus metadatos |
| GET | `/api/stats` | Número de vídeos, espacio ocupado y tags más usados |

## Cómo ejecutar

Requisitos: Node.js 22 o superior y Docker.

1. **Variables de entorno.** Copiá la plantilla y completala: inventá unas
   credenciales para RustFS y un secreto para las sesiones.

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Para qué | Ejemplo |
   |----------|----------|---------|
   | `MONGODB_URI` | Conexión a MongoDB | `mongodb://localhost:27017` |
   | `MONGODB_DB` | Nombre de la base | `videovault` |
   | `RUSTFS_ENDPOINT` | API S3 de RustFS (**puerto 9000**) | `http://localhost:9000` |
   | `RUSTFS_API_PORT` / `RUSTFS_CONSOLE_PORT` | Puertos de RustFS en tu ordenador; cambialos si el 9000 ya está ocupado | `9000` / `9001` |
   | `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` | Credenciales de RustFS | inventadas por vos |
   | `RUSTFS_BUCKET` | Bucket de los vídeos; se crea solo | `videos` |
   | `APP_URL` | Origen al que RustFS deja subir (CORS) | `http://localhost:3000` |
   | `JWT_SECRET` | Firma de las sesiones | `openssl rand -base64 32` |

2. **RustFS** (y MongoDB, si no tenés uno), con las mismas credenciales:

   ```bash
   docker compose --env-file .env.local up -d rustfs        # solo RustFS
   docker compose --env-file .env.local up -d               # RustFS y MongoDB
   ```

   La consola de RustFS queda en <http://localhost:9001>, para ver los
   ficheros subidos.

   Si Docker responde `port is already allocated`, ya hay otro RustFS o MinIO
   en esos puertos. Cambiá `RUSTFS_API_PORT`, `RUSTFS_CONSOLE_PORT` y el puerto
   de `RUSTFS_ENDPOINT` en `.env.local` (por ejemplo 9020, 9021 y
   `http://localhost:9020`) y volvé a arrancarlo.

3. **La app:**

   ```bash
   npm install
   npm run dev
   ```

4. Abrí <http://localhost:3000>, creá una cuenta, subí un vídeo con un tag y
   un dato (`cliente: acme`), y buscalo por cualquiera de los dos.

## Tests y cobertura

```bash
npm test               # 72 tests
npm run test:coverage  # con informe en consola y en coverage/index.html
npm run lint
npm run typecheck      # next typegen + tsc
```

Los tests no necesitan MongoDB ni RustFS en marcha.

| Fichero | Qué comprueba |
|---------|---------------|
| `validation.test.ts` | Email, contraseña (mínimo 8, **máximo 72 bytes**, el límite de bcrypt), tags y pares clave-valor normalizados, **solo vídeos de hasta 500 MB**, escape de expresiones regulares |
| `search.test.ts` | El filtro siempre empieza por el usuario y **ningún parámetro de la URL lo puede quitar**; texto escapado; clave y valor en **el mismo par** (`$elemMatch`) |
| `auth.test.ts` | JWT alterado, de otro secreto o caducado: rechazado; la contraseña se guarda como hash bcrypt; **`?next=` no puede redirigir fuera de la app** |
| `s3.test.ts` | URL de subida y de reproducción: apuntan a RustFS con la ruta del bucket, caducan en 15 min y 1 h, y **no llevan el secreto** |
| `s3-operations.test.ts` | Con un cliente S3 de mentira: crea el bucket solo si no existe, lee el tamaño real, borra el objeto correcto |
| `tags.test.ts` | Coma, punto y coma y salto de línea separan tags; sin `#`, en minúsculas y sin repetir; duración `1:15` y `1:02:05` |

Cobertura de la lógica (`lib/validation`, `search`, `jwt`, `password`, `s3`,
`format`, `navigation`, `tags`, `duration`):

| Sentencias | Ramas | Funciones | Líneas |
|-----------:|------:|----------:|-------:|
| 97,4 % | 95,23 % | 97,14 % | 99,2 % |

Las rutas de la API, que necesitan MongoDB y RustFS, se comprueban a mano con
el recorrido de «Cómo ejecutar».

### CI

[`.gitlab-ci.yml`](.gitlab-ci.yml) tiene dos jobs en un runner shell con el
tag `cloudrun`, sin `image` ni `services`:

- **lint**: `npm run lint` y `npm run typecheck`.
- **test**: `npm run test:coverage`. Publica el porcentaje de cobertura, el
  informe Cobertura y el informe JUnit.

## Decisiones de diseño

### URLs firmadas en los dos sentidos

El servidor no toca los vídeos. Para subir, firma una URL de escritura que
caduca en 15 minutos y el navegador hace el `PUT` directo a RustFS; para
reproducir, firma una de lectura que caduca en una hora. Next.js no tiene que
recibir cientos de MB por petición, y las credenciales de RustFS no salen del
servidor: la URL lleva una firma calculada con ellas, no las credenciales.

### El servidor no se fía del navegador: tercer paso de la subida

Una URL firmada no limita el tamaño de lo que se sube: el navegador podría
declarar 10 MB y subir 2 GB. Por eso la subida termina con `complete`: el
servidor pregunta a RustFS si el fichero está y **cuánto ocupa de verdad**
(`HeadObject`). Si supera los 500 MB, lo borra. El tamaño que se guarda y se
suma en el panel es siempre el real.

### Subidas abandonadas

Si alguien cierra la pestaña a mitad de subida, queda un vídeo en estado
`uploading`, quizá con un fichero a medias. No aparece en ningún listado ni
cuenta en el panel, y al empezar una subida nueva se borran las del mismo
usuario con más de una hora, en RustFS y en MongoDB.

### Cada usuario solo ve sus vídeos

Todas las consultas empiezan por `userId`, que sale de la sesión y no de la
petición. Un vídeo de otro usuario responde **404**, lo mismo que uno que no
existe: no se revela qué ids existen.

### Tags y datos propios

Los tags se guardan en minúsculas para que `Playa` y `playa` sean el mismo.
Los datos propios son un array de pares `{key, value}` y no un objeto con
claves libres: así una sola consulta (`$elemMatch`) busca la clave y el valor
en **el mismo par**, y un índice sirve para cualquier clave. Con un objeto,
cada clave nueva sería un campo distinto sin índice posible.

### Contraseñas y login

- Se guardan con bcrypt, coste 12 (unos 250 ms por intento).
- Máximo 72 bytes, porque bcrypt ignora el resto: una contraseña más larga
  daría una seguridad que no tiene.
- El login responde igual, y tarda lo mismo, exista o no el email: si el email
  no existe, se compara igual contra un hash cualquiera. Si no, el tiempo de
  respuesta revelaría qué emails tienen cuenta.

### Miniaturas sin generar imágenes

La miniatura de cada vídeo es el propio vídeo, con `preload="metadata"`: el
navegador pide a RustFS solo el principio del fichero, lo justo para mostrar
un fotograma y saber la duración. La URL lleva `#t=1` para mostrar el segundo
1, porque el primer fotograma de muchos vídeos es negro. No hace falta generar
ni guardar imágenes aparte.

### Tags en fichas

Al escribir una coma, un punto y coma o Enter, el texto se convierte en una
ficha con su ×; Backspace con el campo vacío borra la última. Lo mismo al
pegar una lista. La lógica de separar y limpiar está en `lib/tags.ts`, sin
React, y tiene sus tests.

### Next.js 16 conserva las páginas al navegar

Con *Cache Components*, Next.js 16 no destruye una página al salir de ella: la
oculta con `<Activity>` y al volver la muestra tal como estaba
([guía](https://nextjs.org/docs/app/guides/preserving-ui-state)). Al probar la
app aparecieron tres efectos de esto, y cada pantalla decide qué conserva:

- **Subir un vídeo** empieza siempre en blanco. Antes, al volver, seguían los
  datos del vídeo anterior.
- **El reproductor se pausa** al salir de la ficha. Antes, el audio seguía
  sonando de fondo en otra página.
- **La biblioteca se recarga** al volver, para que aparezca lo que se acaba de
  subir, editar o borrar, pero **conserva la búsqueda**, que sí conviene
  mantener.

### Barra de progreso con XMLHttpRequest

`fetch` todavía no informa del progreso de una subida. Con vídeos de cientos
de MB, saber cuánto falta importa, así que el `PUT` usa `XMLHttpRequest`, que
sí lo hace, y permite cancelar.

### Dos correcciones al enunciado

- **El puerto de RustFS.** El enunciado pone `RUSTFS_ENDPOINT=http://localhost:9001`.
  Según la [documentación de RustFS](https://docs.rustfs.com/installation/docker/),
  el 9001 es la consola web; la API S3 está en el **9000**.
- **CORS.** Para que el navegador pueda subir directamente, RustFS tiene que
  aceptar el origen de la app. Se hace con `RUSTFS_CORS_ALLOWED_ORIGINS`
  ([documentación](https://docs.rustfs.com/administration/cors)), que el
  `docker-compose.yml` ya configura.

### Next.js 16.4.6

La versión 16.4.0 con la que se crean los proyectos tiene vulnerabilidades
críticas publicadas; se usa 16.4.6, que las corrige. `npm audit` no da
ninguna.

## Limitaciones conocidas

- **Sin límite de intentos de login.** bcrypt hace lento cada intento, pero
  nada impide probar muchos. En producción haría falta limitar por IP y email.
- **La subida es una sola petición.** Si se corta a los 400 MB, hay que
  empezar de nuevo. Para vídeos más grandes habría que usar la subida
  *multipart* de S3, que reanuda por partes.
- **Sin miniaturas ni conversión.** El vídeo se reproduce tal como se subió;
  si el navegador no soporta el formato (algunos `.mkv` o `.avi`), no se ve.

## Uso de IA

El proyecto se desarrolló con Claude como asistente de programación. Antes de
escribir código decidí tres cosas: que cada usuario vea solo sus vídeos, que
se pueda borrar y editar y haya barra de progreso, y el límite de 500 MB.

- **Se consultó la documentación de RustFS antes de escribir.** Así salieron
  las dos correcciones al enunciado: el puerto 9000 y la variable de CORS.
  Sin ellas, la app no habría podido subir ni un vídeo.
- **El tercer paso de la subida** surgió de revisar qué garantiza una URL
  firmada: el tiempo, no el tamaño.
- **Los tests de S3 no necesitan RustFS**: firmar una URL se calcula sin red, y
  el resto se prueba con un cliente S3 de mentira que apunta qué comandos
  recibe.
- **Lo que salió de probarla.** Al usar la primera versión vi tres cosas: el
  formulario de subida conservaba los datos del vídeo anterior, el audio
  seguía sonando al salir de un vídeo, y la interfaz no se sentía de vídeos.
  Las dos primeras eran el mismo comportamiento nuevo de Next.js 16; se
  corrigieron siguiendo su guía y se comprobaron en un navegador. La tercera
  llevó al diseño de mesa de luz, las fichas de tags y las miniaturas.
- **Un fallo que encontraron los tests:** las funciones que firman URLs
  fallaban de forma síncrona si faltaba la configuración, en vez de devolver
  una promesa rechazada. Se corrigió.
