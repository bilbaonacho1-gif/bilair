# BILAIR — World Tour

Sitio de BILAIR: streetwear que recorre el mundo. Cada ciudad, un drop.

La compra **no se hace acá**: el carrito manda a la tienda oficial ([bilair.com.ar](https://www.bilair.com.ar)), que mantiene su proceso de pago, cuotas y envíos.

## Stack

- Vite + React 18 + TypeScript
- three.js para la intro con el avión 3D (se carga aparte, solo cuando se reproduce la intro)
- framer-motion para las transiciones del ropero y los modales
- d3-geo + world-atlas para el mapa
- Vercel Functions (`/api`) para la votación persistente (opcional)

```bash
npm install
npm run dev      # desarrollo
npm run build    # build de producción en dist/
```

## Secciones

| Sección | Componente | Estado |
| --- | --- | --- |
| Intro cinematográfica | `src/components/Intro.tsx`, `src/three/IntroScene.ts`, `src/three/timeline.ts` | Funcional (ver abajo) |
| Primera escena de la home | `src/components/HomeHero.tsx`, `src/styles/intro.css` | Funcional. La foto es un render del avión hasta tener campaña real |
| Mapa de destinos | `src/components/WorldMap.tsx` | Funcional (zoom, arrastre, selección, teclado por la lista) |
| Votación Next Stop | `src/components/NextStop.tsx`, `src/services/votes.ts`, `api/votes.ts` | **Demo** hasta conectar Upstash (ver abajo) |
| Drops | `src/components/Drops.tsx`, `src/pages/DropPage.tsx` | Funcional, con datos provisionales |
| Ropero | `src/components/Wardrobe.tsx`, `src/components/ProductDetail.tsx` | Funcional, con **catálogo de muestra** |
| Virtual Fit | `src/components/VirtualFit.tsx`, `src/services/tryon.ts` | Vista ilustrativa por capas. No es simulación física ni IA |
| People | `src/components/People.tsx`, `src/services/outfits.ts` | **Demo**: looks de ejemplo; el formulario no envía nada todavía |
| Lookbook | `src/components/Lookbook.tsx` | Estructura lista, fotos pendientes |
| Carrito / checkout | `src/services/cart.tsx`, `src/pages/CartPage.tsx` | Funcional; deriva la compra a la tienda oficial |

## Intro

Aproximación final sobre el Río de la Plata al atardecer (unos 5 segundos):

1. **Aproximación**: el avión aparece a 1,5 km con las luces de aterrizaje encendidas y se acerca a velocidad de zoom constante.
2. **Paso por la cámara**: desacelera hasta pasar a 13 m sobre la cámara, con desenfoque radial, vibración y la cámara siguiéndolo con retraso.
3. **Revelado**: el paso del avión abre un hueco en la escena desde su centro y por ahí aparece la home, mientras el avión sigue en pantalla. Las franjas de cine se abren y entran el logo y los textos.

Reglas:

- Se ve **una vez por sesión** y solo al entrar por `/`. Las rutas internas abren directo.
- **Saltar intro** (o Escape) corta la secuencia en cualquier momento.
- Con `prefers-reduced-motion`, sin WebGL o si el modelo tarda más de 7 s, la home aparece directo.
- En celulares y equipos de pocos núcleos: sin antialiasing, menor resolución y menos muestras de desenfoque.
- Al terminar se libera todo el motor 3D: el resto del sitio no paga el costo.

Para revisar la secuencia cuadro por cuadro:

- `/?intro`: fuerza la intro aunque ya se haya visto.
- `/?intro-frame=4.2`: muestra el cuadro exacto del segundo 4,2.
- `/?intro-still=3.75`: cuadro limpio, sin desenfoque ni interfaz. Así se generó `public/media/hero/final-approach.jpg`.

Los tiempos de la secuencia están en `src/three/timeline.ts`.

## Qué es provisional (y dónde se cambia)

Todo lo provisional está marcado en la interfaz ("Muestra", "Ejemplo", "Foto pendiente", "Modo demostración") y en el código.

- **Productos**: `src/data/products.ts`. Son de muestra (`demo: true`, sin precio ni stock). Reemplazar con el catálogo real y poner `catalogIsDemo: false` en `src/config/site.ts`.
- **Destinos y drops**: `src/data/destinations.ts` y `src/data/drops.ts`.
- **Contacto**: `src/config/site.ts` (WhatsApp, Instagram, mail). Lo que queda vacío no se muestra.
- **Logo**: `src/components/Logo.tsx` es un wordmark provisional en Archivo, igual al del fuselaje. Reemplazar por el SVG oficial.
- **Foto de la home**: `public/media/hero/final-approach.jpg` es un render del avión. Reemplazar por una foto de campaña vertical (4:5) cuando exista.
- **Fotos**: cualquier `Media` sin `src` se dibuja como placeholder con curvas de nivel y el código de la ciudad.

## Cargar fotos reales

Copiar las imágenes a `public/media/` con esta estructura y referenciarlas en los datos:

```
public/media/
  productos/<id-producto>/<id-color>-01.jpg   ej. productos/hoodie-pista/negro-01.jpg
  campanas/<id-drop>/01.jpg
  destinos/<id-destino>.jpg                    ej. destinos/tokyo.jpg
  texturas/                                    mapas, sellos, tickets
```

Ejemplo en `products.ts`:

```ts
images: [{ src: '/media/productos/hoodie-pista/negro-01.jpg', alt: 'Hoodie Pista negro, frente' }],
```

Recomendado: JPG o WebP de 1600 px de ancho máximo, menos de 400 KB cada una.

La carpeta de Google Drive puede seguir la misma estructura para que copiar al repo sea directo.

## Votación persistente

Sin configuración, la votación funciona en **modo demostración**: el voto queda en el navegador y la interfaz lo aclara.

Para activarla en Vercel:

1. Proyecto en Vercel → **Storage** → **Upstash for Redis** → crear y conectar al proyecto (crea `KV_REST_API_URL` y `KV_REST_API_TOKEN`).
2. Agregar la variable `VOTE_SALT` con un texto largo y secreto.
3. Redeploy. El sitio detecta `/api/votes` y pasa a modo "En vivo".

Duplicados: un voto por visitante (hash de IP + navegador + sal). Para una votación con premios o resultados vinculantes, conviene exigir login.

## Pendiente para fases siguientes (requiere servidor)

- **Comunidad People**: storage de imágenes, moderación y publicación. `src/services/outfits.ts` documenta el flujo previsto; hoy no se envía ninguna imagen.
- **Prueba virtual con foto**: implementar otro `TryOnProvider` en `src/services/tryon.ts`. Pedir la foto de forma explícita y con consentimiento.
- **Carrito unificado con la tienda**: hoy cada producto enlaza a su ficha en la tienda oficial (`storeUrl`).

## Modelo 3D

`public/models/bilair-a319.glb` deriva de [“Airbus A319 — Pincel de Alas”](https://sketchfab.com/3d-models/airbus-a319-pincel-de-alas-1a63d67a03be499393f2171f646ccecf) (licencia CC BY 4.0). La atribución figura en el footer.

La librea se repintó con `scripts/repaint_livery.py`: BILAIR en Archivo negro sobre el fuselaje blanco, matrícula LV-BLR y cola en carbón. Después se comprimió con gltf-transform (meshopt + WebP, de 7,9 MB a 0,95 MB):

```bash
python3 scripts/repaint_livery.py original.glb repintado.glb node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2 <fuente-sans>
npx @gltf-transform/cli optimize repintado.glb public/models/bilair-a319.glb --compress meshopt --texture-compress webp --texture-size 1024
```

## Accesibilidad y rendimiento

- Respeta `prefers-reduced-motion`: sin intro, sin parallax ni marquesina.
- El motor 3D solo se descarga si se reproduce la intro, y se libera al terminar.
- Navegación por teclado en mapa (lista de destinos), ropero (flechas y Escape) y modales.
