# BILAIR — World Tour

Sitio de BILAIR: streetwear que recorre el mundo. Cada ciudad, un drop.

La compra **no se hace acá**: el carrito manda a la tienda oficial ([bilair.com.ar](https://www.bilair.com.ar)), que mantiene su proceso de pago, cuotas y envíos.

## Stack

- Vite + React 18 + TypeScript
- three.js para el avión 3D del hero (se carga aparte, solo en el hero)
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
| Hero con avión 3D | `src/components/Hero.tsx`, `src/three/PlaneScene.ts` | Funcional. Si no hay WebGL o falla la carga, muestra una versión liviana |
| Mapa de destinos | `src/components/WorldMap.tsx` | Funcional (zoom, arrastre, selección, teclado por la lista) |
| Votación Next Stop | `src/components/NextStop.tsx`, `src/services/votes.ts`, `api/votes.ts` | **Demo** hasta conectar Upstash (ver abajo) |
| Drops | `src/components/Drops.tsx`, `src/pages/DropPage.tsx` | Funcional, con datos provisionales |
| Ropero | `src/components/Wardrobe.tsx`, `src/components/ProductDetail.tsx` | Funcional, con **catálogo de muestra** |
| Virtual Fit | `src/components/VirtualFit.tsx`, `src/services/tryon.ts` | Vista ilustrativa por capas. No es simulación física ni IA |
| People | `src/components/People.tsx`, `src/services/outfits.ts` | **Demo**: looks de ejemplo; el formulario no envía nada todavía |
| Lookbook | `src/components/Lookbook.tsx` | Estructura lista, fotos pendientes |
| Carrito / checkout | `src/services/cart.tsx`, `src/pages/CartPage.tsx` | Funcional; deriva la compra a la tienda oficial |

## Qué es provisional (y dónde se cambia)

Todo lo provisional está marcado en la interfaz ("Muestra", "Ejemplo", "Foto pendiente", "Modo demostración") y en el código.

- **Productos**: `src/data/products.ts`. Son de muestra (`demo: true`, sin precio ni stock). Reemplazar con el catálogo real y poner `catalogIsDemo: false` en `src/config/site.ts`.
- **Destinos y drops**: `src/data/destinations.ts` y `src/data/drops.ts`.
- **Contacto**: `src/config/site.ts` (WhatsApp, Instagram, mail). Lo que queda vacío no se muestra.
- **Logo**: `src/components/Logo.tsx` es un wordmark provisional. Reemplazar por el SVG oficial.
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

La librea se repintó con `scripts/repaint_livery.py`: logo BILAIR en el fuselaje, matrícula LV-BLR y cola en carbón, piedra y naranja. Después se comprimió con gltf-transform (meshopt + WebP, de 7,9 MB a 0,95 MB):

```bash
python3 scripts/repaint_livery.py original.glb repintado.glb <fuente-marker> <fuente-sans>
npx @gltf-transform/cli optimize repintado.glb public/models/bilair-a319.glb --compress meshopt --texture-compress webp --texture-size 1024
```

## Accesibilidad y rendimiento

- Respeta `prefers-reduced-motion`: sin animación del avión, sin parallax ni marquesina.
- El canvas 3D solo renderiza cuando el hero está en pantalla y la pestaña visible.
- En celulares y equipos de pocos núcleos la escena usa menos nubes y menor resolución.
- Navegación por teclado en mapa (lista de destinos), ropero (flechas y Escape) y modales.
