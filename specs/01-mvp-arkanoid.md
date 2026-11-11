# SPEC 01: MVP Arkanoid

> **Estado:** Borrador
> **Depende de:** ninguna (primer spec del proyecto)
> **Fecha:** 2026-11-11
> **Objetivo:** Construir un juego Arkanoid jugable en una sola pantalla, con un nivel de 60 ladrillos, control con mouse y teclado, 3 vidas, puntaje de 10 puntos por ladrillo y top 5 guardado en localStorage.

## Alcance

**Dentro:**

- Una pantalla de juego en canvas de 800 × 600 px.
- Un único nivel: 10 columnas por 6 filas, 60 ladrillos.
- Paddle controlado por mouse y, cuando el mouse no se movió, por las flechas izquierda y derecha.
- Pelota con ángulo fijo de rebote en el paddle, rebotes en paredes, techo y ladrillos.
- Lanzamiento de la pelota con clic o barra espaciadora.
- 3 vidas. Al caer la pelota se pierde una vida.
- Puntaje de 10 puntos por ladrillo destruido.
- Fin de juego por derrota (sin vidas) o victoria (sin ladrillos), con pantalla de puntaje final y botón de reinicio.
- Top 5 de puntajes guardado en localStorage con clave versionada.
- Gráficos tomados de `assets/spritesheet-breakout.png` mediante `assets/spritesheet.js`.

**Fuera de alcance (para specs futuros):**

- Sonidos. Los archivos de `assets/sounds/` no se cargan ni se reproducen en este MVP.
- Más de un nivel o cambio de pantalla.
- Power-ups de cualquier tipo.
- Puntos variables por color de ladrillo.
- Pantalla de inicio o menú principal.
- Pausa con tecla o botón.
- Ángulo de rebote variable según la zona del paddle.
- Nombre del jugador en el top 5.
- Soporte táctil o móvil.
- Backend, cuentas de usuario o sincronización en la nube.

## Modelo de datos

Estado del juego en memoria, dentro de `game.js`:

```js
const state = {
  phase: 'esperando',   // 'esperando' | 'jugando' | 'fin'
  outcome: null,        // 'derrota' | 'victoria' | null
  score: 0,
  lives: 3,
  bricks: [],           // 60 objetos { col, row, x, y, w, h, color, alive }
  paddle: { x: 350, y: 560, w: 100, h: 14 },
  ball: { x: 0, y: 0, vx: 0, vy: 0, size: 16, attached: true },
  mouseMovedThisFrame: false,
  relaunchAt: 0,        // timestamp (ms) desde el cual se permite lanzar
};
```

Constantes:

```js
const CANVAS_W = 800;
const CANVAS_H = 600;
const GRID = { cols: 10, rows: 6, w: 72, h: 24, gap: 4, x0: 24, y0: 60 };
const ROW_COLORS = ['red', 'yellow', 'green', 'cyan', 'magenta', 'hotpink']; // de arriba abajo
const BALL_SPEED = 5;              // px por cuadro
const BALL_ANGLE = Math.PI / 4;    // 45 grados respecto a la vertical, fijo
const PADDLE_KEY_SPEED = 8;        // px por cuadro
const RELAUNCH_DELAY_MS = 500;
const POINTS_PER_BRICK = 10;
const LIVES_START = 3;
```

Persistencia:

```js
// localStorage, clave 'arkanoid:v1'
// Valor: JSON con un arreglo de hasta 5 entradas, ordenado de mayor a menor puntaje.
[ { score: 300, date: '2026-11-11T18:30:00.000Z' } ]
```

Convenciones:

- Origen de coordenadas en la esquina superior izquierda del canvas.
- Velocidades en píxeles por cuadro.
- Los ladrillos de la fila 0 son los de arriba.

## Plan de implementación

1. Crear `index.html` con un `<canvas width="800" height="600">` y cargar `assets/spritesheet.js` y `game.js`. `game.js` solo limpia el canvas con fondo negro. Verificación: la página abre sin errores en consola y muestra un canvas negro de 800 × 600.
2. En `game.js`, llamar `loadSpritesheet` y dibujar los 60 ladrillos en la grilla con `drawSprite(ctx, 'block_<color>', ...)`. Verificación: aparecen 6 filas de 10 ladrillos con los colores de `ROW_COLORS`.
3. Dibujar el paddle y hacer que siga la posición X del mouse, limitado a los bordes del canvas. Verificación: el paddle se mueve con el mouse y no sale del canvas.
4. Agregar control con flechas izquierda y derecha a 8 px por cuadro, aplicado solo en cuadros donde no hubo `mousemove`. Verificación: sin mover el mouse, las flechas mueven el paddle; al mover el mouse, el mouse vuelve a tener prioridad.
5. Dibujar la pelota sobre el paddle en estado `esperando`. Lanzarla con clic o espacio hacia arriba y a la derecha, a 45 grados, y avanzar a 5 px por cuadro. Verificación: la pelota sale del paddle con ese ángulo y se mueve en línea recta hasta chocar con una pared.
6. Rebotar la pelota en paredes laterales y en el techo. Verificación: la pelota no sale del canvas por izquierda, derecha ni arriba.
7. Rebotar la pelota en el paddle con ángulo fijo de 45 grados, conservando el sentido horizontal que traía la pelota. Verificación: la pelota sale del paddle con el mismo ángulo siempre, sin importar dónde cayó.
8. Destruir ladrillos al colisionar: marcar `alive = false`, sumar 10 puntos y rebotar en la cara por la que entró la pelota. Verificación: cada ladrillo destruido suma 10 puntos y no vuelve a colisionar.
9. Detectar caída de la pelota bajo el borde inferior. Restar una vida, colocar la pelota sobre el paddle en estado `esperando` y fijar `relaunchAt = ahora + 500 ms`. Verificación: se pierde una vida y la pelota no puede lanzarse durante 500 ms.
10. Mostrar en el canvas el puntaje y las vidas restantes. Verificación: ambos valores se actualizan al destruir ladrillos y al perder vidas.
11. Pasar a estado `fin` con `outcome = 'derrota'` cuando las vidas llegan a 0, o `'victoria'` cuando no quedan ladrillos vivos. Mostrar el puntaje final y un botón "Reiniciar" que se activa con clic o Enter. Verificación: ambos finales muestran el puntaje correcto y el botón reinicia el juego desde cero.
12. Guardar el puntaje al terminar la partida en el top 5 de localStorage, con `try/catch`. Mostrar el top 5 en la pantalla de fin. Verificación: el puntaje entra al top 5 si califica, se mantiene al recargar la página, y el juego funciona aunque localStorage esté bloqueado.

## Criterios de aceptación

- [ ] `index.html` abre sin errores en la consola del navegador.
- [ ] El canvas mide exactamente 800 × 600 px.
- [ ] Al iniciar hay 60 ladrillos en 6 filas de 10 columnas.
- [ ] El paddle sigue la posición X del mouse y nunca sale del canvas.
- [ ] Con el mouse quieto, las flechas izquierda y derecha mueven el paddle a 8 px por cuadro.
- [ ] Si el mouse se mueve en un cuadro, las flechas se ignoran en ese cuadro.
- [ ] Un clic o la barra espaciadora lanza la pelota solo cuando está en estado `esperando` y han pasado al menos 500 ms desde la última pérdida de vida.
- [ ] La pelota sale del paddle a 45 grados hacia arriba y a la derecha en el primer lanzamiento.
- [ ] La pelota rebota en las paredes laterales y en el techo.
- [ ] Si la pelota cae en cualquier punto del paddle, sale rebotada con el mismo ángulo de 45 grados.
- [ ] Cada ladrillo destruido suma exactamente 10 puntos.
- [ ] Un ladrillo destruido deja de dibujarse y de colisionar.
- [ ] Al caer la pelota se resta exactamente una vida.
- [ ] Con 0 vidas aparece la pantalla de derrota con el puntaje final.
- [ ] Con 0 ladrillos vivos aparece la pantalla de victoria con el puntaje final.
- [ ] El botón "Reiniciar" (clic o Enter) vuelve a 3 vidas, 0 puntos y 60 ladrillos.
- [ ] Al terminar una partida, el puntaje entra al top 5 de localStorage si es mayor que el quinto registrado o si hay menos de 5 registros.
- [ ] Al recargar la página, el top 5 se conserva.
- [ ] Con localStorage bloqueado, el juego se juega normalmente sin lanzar errores no capturados.
- [ ] Ningún archivo de `assets/sounds/` se referencia en el código.

## Decisiones

- **Sí:** Un único nivel en una sola pantalla. Es lo que permite validar la mecánica base rápidamente.
- **No:** Tres niveles. Se descartó tras aclarar el alcance del MVP.
- **Sí:** Control combinado. El mouse tiene prioridad y las flechas solo actúan en cuadros sin movimiento del mouse. Evita conflictos cuando ambos se usan a la vez.
- **No:** Power-ups en el MVP. Se documentan para un spec posterior.
- **No:** Sonidos en el MVP. Decisión explícita del usuario. Los archivos quedan en `assets/` sin uso.
- **Sí:** Ángulo fijo de rebote en el paddle. Hace el comportamiento predecible y fácil de verificar.
- **No:** Ángulo variable según la zona del paddle. Se descarta por ser más difícil de verificar en este MVP.
- **Sí:** Puntaje fijo de 10 puntos por ladrillo. Simple y fácil de verificar.
- **No:** Puntos por color de ladrillo. Requiere tabla de valores fuera del alcance de este MVP.
- **Sí:** Pelota que espera sobre el paddle tras perder una vida, con pausa de 500 ms y lanzamiento con clic o espacio.
- **Sí:** Pantalla de fin con puntaje final y botón de reinicio, con guardado en el top 5 si califica.
- **Sí:** localStorage con clave versionada `arkanoid:v1`. Permite migrar el esquema más adelante sin romper datos existentes.
- **No:** IndexedDB. Excesivo para cinco registros.
- **No:** Archivo JSON en disco. No aplica a un juego web sin servidor.
- **Sí:** Lanzamiento siempre a 45 grados hacia arriba y a la derecha. Evita aleatoriedad en el primer lanzamiento.
- **Sí:** Estructura mínima de archivos: `index.html` y `game.js`, más los assets existentes. Evita módulos y build tooling en un MVP.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| localStorage bloqueado en modo privado o por configuración del navegador | Envolver lectura y escritura en `try/catch`. El juego sigue funcionando sin persistencia. |
| La pelota atraviesa un ladrillo a alta velocidad | Velocidad de 5 px por cuadro, menor que la altura del ladrillo (24 px). Verificar en prueba manual. |
| Spritesheet no carga y el canvas queda vacío | `loadSpritesheet` ya registra el error en consola. Verificar que el juego arranque solo después del callback. |

## Qué **no** está en este spec

- Sonidos.
- Más de un nivel.
- Power-ups.
- Pantalla de inicio o menú.
- Pausa.
- Nombres en el top 5.
- Soporte táctil.
- Backend o sincronización.

Cada uno de estos puntos, si se incorpora, va en su propio spec.
