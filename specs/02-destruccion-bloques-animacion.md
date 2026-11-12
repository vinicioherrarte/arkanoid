# SPEC 02: Destrucción de bloques con animación


> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-12
> **Objetivo:** Animar la destrucción de cada ladrillo con los frames de explosión del atlas durante 150 ms, sin cambiar la colisión ni el puntaje, y retrasar la pantalla de victoria hasta que termine la explosión del último ladrillo.

## Alcance

**Dentro:**

- Al destruir un ladrillo, reproducir una vez la explosión de su color usando `EXPLOSION_FRAMES[color]` de `assets/spritesheet.js`.
- Duración total de la explosión: `EXPLOSION_DURATION` (150 ms), repartida en los 4 frames.
- Cada color usa su propia explosión (red, yellow, green, cyan, magenta, hotpink).
- La pantalla de victoria aparece cuando termina la explosión del último ladrillo, no en el impacto.
- Reiniciar la partida limpia cualquier explosión en curso.

**Fuera de alcance (para specs futuros):**

- Sonido de rotura (`assets/sounds/break-sound.mp3`). SPEC 01 dejó los sonidos fuera; siguen fuera.
- Partículas con física.
- Animaciones de escala o alpha sobre el sprite del ladrillo.
- Efectos de cámara (sacudida, flash de pantalla).
- Animación de la pelota o del paddle.
- Animación de la pantalla de derrota o de victoria.

## Modelo de datos

Se agregan dos campos al estado existente en `game.js`. No se crean estructuras nuevas.

```js
// Cada elemento de state.bricks gana un campo:
{ col, row, x, y, w, h, color, alive, explodingSince: null }
//   explodingSince: timestamp (ms, mismo reloj que relaunchAt) del impacto,
//                   o null si el ladrillo nunca fue destruido.

// state gana un campo:
state.victoryAt = 0;  // timestamp (ms) desde el cual se muestra la victoria; 0 = no programada
```

Constantes nuevas:

```js
const EXPLOSION_FRAME_MS = EXPLOSION_DURATION / 4; // 37.5 ms por frame
```

Convenciones:

- Frame activo de una explosión: `Math.min(3, Math.floor((ahora - explodingSince) / EXPLOSION_FRAME_MS))`.
- Una explosión termina cuando `ahora - explodingSince >= EXPLOSION_DURATION`.

## Plan de implementación

1. En `bounceOffBricks`, al destruir un ladrillo, guardar `explodingSince = Date.now()` además de `alive = false`. En `draw`, dibujar los ladrillos vivos como hoy y, para los que tienen explosión en curso, dibujar el frame activo con `drawFrame(ctx, EXPLOSION_FRAMES[color][frame], ...)`. Verificación: al golpear un ladrillo aparece una explosión del color del ladrillo y el ladrillo deja de colisionar de inmediato.
2. Ajustar el dibujo para que una explosión avance por sus 4 frames en orden y desaparezca a los 150 ms. Verificación: la explosión se ve completa, sin saltos ni frames repetidos, y no queda rastro después de 150 ms.
3. Retrasar la victoria. Cuando no quedan ladrillos vivos, guardar `state.victoryAt = ahora + EXPLOSION_DURATION` la primera vez, y llamar `endGame('victoria')` solo cuando `ahora >= state.victoryAt`. Verificación: al destruir el último ladrillo, la explosión se ve completa y la pantalla de victoria aparece unos 150 ms después.
4. Actualizar `resetGame` para dejar `explodingSince = null` en todos los ladrillos y `victoryAt = 0`. Verificación: tras reiniciar, no aparece ninguna explosión residual y la victoria vuelve a retrasarse correctamente en la siguiente partida.

## Criterios de aceptación

- [ ] Al destruir un ladrillo aparece una explosión que se reproduce una sola vez.
- [ ] La explosión de un ladrillo usa los frames de `EXPLOSION_FRAMES` de su propio color.
- [ ] La explosión dura 150 ms y muestra los 4 frames en orden.
- [ ] Tras 150 ms la explosión deja de dibujarse.
- [ ] Un ladrillo en explosión no colisiona con la pelota.
- [ ] El puntaje sube 10 puntos en el mismo cuadro del impacto, no al terminar la explosión.
- [ ] Al destruir el último ladrillo, la pantalla de victoria aparece entre 140 ms y 200 ms después del impacto.
- [ ] Durante esos 150 ms la explosión del último ladrillo es visible.
- [ ] Reiniciar la partida no deja explosiones visibles.
- [ ] Ningún archivo de `assets/sounds/` se referencia en el código.
- [ ] La consola del navegador no muestra errores al destruir ladrillos.

## Decisiones

- **Sí:** Frames del atlas (`EXPLOSION_FRAMES`) como efecto visual. El arte ya existe y no agrega un sistema nuevo.
- **No:** Escala y alpha sobre el sprite del ladrillo. Menos vistoso que el arte del atlas, sin ganancia real.
- **No:** Partículas. Agrega un sistema nuevo que hoy no existe y amplía el alcance.
- **Sí:** Cada color usa su propia explosión. Los seis colores del MVP tienen frames propios en el atlas, y la identidad por fila se mantiene.
- **No:** Una sola explosión roja para todos. Pierde la diferencia de color entre filas sin ahorrar lógica relevante.
- **Sí:** Colisión inmediata. El ladrillo queda con `alive = false` en el impacto, así que el puntaje y el rebote no dependen de la animación.
- **No:** Ladrillo sólido durante la animación. Obliga a una regla extra para evitar rebotes dobles o puntajes repetidos.
- **Sí:** Victoria retrasada 150 ms. El jugador ve completa la explosión del último ladrillo antes del final.
- **No:** Victoria instantánea. Corta la animación del último ladrillo.
- **Sí:** Reloj `Date.now()`, el mismo que usa `relaunchAt`, para no introducir un segundo mecanismo de tiempo.
- **No:** Sonido de rotura. Queda fuera según SPEC 01.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Frames de explosión desalineados si el atlas se recorta | Usar solo las coordenadas de `EXPLOSION_FRAMES` definidas en `spritesheet.js`, sin valores fijos en `game.js`. |
| Victoria retrasada si la pelota cae durante los 150 ms | La victoria ya programada se mantiene. La pelota no puede reiniciar la partida en ese lapso porque el estado pasa a `fin` solo al cumplirse `victoryAt`. |
| Explosiones de gris sin uso real | El gris reutiliza las coordenadas del rojo y no aparece en el MVP. No se crean frames nuevos en este spec. |

## Qué **no** está en este spec

- Sonido de rotura.
- Partículas.
- Escala o alpha sobre el sprite del ladrillo.
- Efectos de cámara.
- Animación de pelota, paddle o pantallas de fin.

Cada uno de estos puntos, si se incorpora, va en su propio spec.
