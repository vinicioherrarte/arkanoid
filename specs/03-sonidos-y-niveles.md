# SPEC 03: Sonidos y niveles

> **Estado:** aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-12
> **Objetivo:** Agregar sonidos de rebote, rotura, pérdida de vida y fin de partida, con silencio con la tecla M, y tres niveles fijos que se juegan en secuencia con el puntaje acumulado.

## Alcance

**Dentro:**

- Reproducir `assets/sounds/ball-bounce.mp3` en cada rebote de la pelota: paredes laterales, techo, paddle y ladrillos.
- Reproducir `assets/sounds/break-sound.mp3` al destruir un ladrillo, al perder una vida y al terminar la partida, por derrota o por victoria final.
- La tecla M alterna el silencio de todos los sonidos. El estado vive solo en memoria.
- El HUD muestra el estado del sonido: "Sonido: activado" o "Sonido: silenciado".
- Tres niveles con grilla de 10 columnas por 6 filas. Los patrones de cada nivel están definidos en el modelo de datos.
- Los colores de cada fila son los de `ROW_COLORS` en los tres niveles.
- Al destruir el último ladrillo del nivel 1 o del nivel 2, el juego pasa al nivel siguiente 150 ms después del impacto, usando el mecanismo `victoryAt` de SPEC 02.
- El puntaje y las vidas se conservan al cambiar de nivel.
- El HUD muestra "Nivel N / 3" con el nivel en curso.
- Al destruir el último ladrillo del nivel 3, aparece la pantalla de victoria final con el puntaje acumulado de los tres niveles.
- Reiniciar la partida vuelve al nivel 1.

**Fuera de alcance (para specs futuros):**

- Archivos de sonido propios para pérdida de vida y fin de partida. Hoy usan `break-sound.mp3`.
- Música de fondo.
- Control de volumen.
- Persistencia del estado de silencio entre recargas de la página.
- Más de tres niveles, editor de niveles o niveles cargados desde archivos externos.
- Pantalla intermedia entre niveles.
- Velocidad de la pelota distinta por nivel.
- Top 5 separado por nivel.
- Puntos por color de ladrillo.
- Power-ups, pausa y pantalla de inicio.

## Modelo de datos

El estado de `game.js` gana dos campos. No se crean estructuras nuevas fuera de las constantes listadas.

```js
// state gana dos campos:
state.level = 1;       // 1 | 2 | 3, nivel en curso
state.muted = false;   // true tras presionar M. Solo en memoria, no se guarda en localStorage.
```

Constantes nuevas:

```js
const LEVEL_COUNT = 3;

const SOUNDS = {
  bounce: 'assets/sounds/ball-bounce.mp3',
  break: 'assets/sounds/break-sound.mp3',
};

// 'X' = ladrillo, '.' = hueco. Una cadena por fila, de arriba abajo, 10 caracteres por cadena.
const LEVEL_PATTERNS = [
  // Nivel 1: 60 ladrillos. Grilla completa, igual que el MVP.
  ['XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX'],
  // Nivel 2: 45 ladrillos. Filas 0, 2 y 4 completas. Filas 1, 3 y 5 con ladrillos en las columnas 0, 2, 4, 6 y 8.
  ['XXXXXXXXXX', 'X.X.X.X.X.', 'XXXXXXXXXX', 'X.X.X.X.X.', 'XXXXXXXXXX', 'X.X.X.X.X.'],
  // Nivel 3: 48 ladrillos. Filas 0, 1, 4 y 5 completas. Filas 2 y 3 solo en las columnas 0, 1, 8 y 9.
  ['XXXXXXXXXX', 'XXXXXXXXXX', 'XX......XX', 'XX......XX', 'XXXXXXXXXX', 'XXXXXXXXXX'],
];
```

Convenciones:

- `loadLevel(n)` construye `state.bricks` desde `LEVEL_PATTERNS[n - 1]`. Cada ladrillo conserva la forma de SPEC 01: `{ col, row, x, y, w, h, color, alive, explodingSince }`, con `color = ROW_COLORS[row]`.
- Ladrillos por nivel: 60, 45 y 48. Total de la campaña: 153.
- `BALL_SPEED`, `BALL_ANGLE`, `POINTS_PER_BRICK` y `LIVES_START` no cambian entre niveles.
- `playSound(name)` recibe una clave de `SOUNDS`. Crea un `Audio` nuevo en cada reproducción para permitir sonidos superpuestos.

## Plan de implementación

1. Agregar `SOUNDS` y la función `playSound(name)` en `game.js`. `playSound` no reproduce nada si `state.muted` es true, y envuelve la creación del `Audio` y la llamada a `play()` en `try/catch`, con `catch` sobre la promesa que devuelve `play()`. Verificación: desde la consola, `playSound('bounce')` reproduce el sonido sin errores.
2. Llamar `playSound('bounce')` en cada rebote contra paredes laterales, techo, paddle y ladrillos. Verificación: cada rebote produce un sonido, y el rebote de un ladrillo suena una sola vez.
3. Llamar `playSound('break')` en `bounceOffBricks` al destruir un ladrillo, en el mismo cuadro en que se suma el puntaje. Verificación: cada ladrillo destruido suena una vez.
4. Llamar `playSound('break')` al perder una vida y al entrar en `fin` por derrota o victoria final. Verificación: al perder una vida y al terminar la partida suena el sonido.
5. Agregar el control con la tecla M, que alterna `state.muted`, y el texto "Sonido: activado" o "Sonido: silenciado" en el HUD. Verificación: con M se silencian rebotes, roturas, pérdidas y fin; al presionar M otra vez vuelven a sonar.
6. Reemplazar la construcción fija de 60 ladrillos por `loadLevel(n)`. `loadLevel` arma los ladrillos desde `LEVEL_PATTERNS`, pone la pelota sobre el paddle en estado `esperando`, fija `relaunchAt = ahora + RELAUNCH_DELAY_MS` y pone `victoryAt = 0`. Al iniciar el juego se llama `loadLevel(1)`. Verificación: el nivel 1 tiene 60 ladrillos, y al cambiar `state.level` a 2 o 3 la cantidad de ladrillos es 45 o 48.
7. Cambiar el final de nivel. Cuando no quedan ladrillos vivos, `victoryAt` se programa como en SPEC 02. Al cumplirse, si `state.level < LEVEL_COUNT` se incrementa `state.level` y se llama `loadLevel(state.level)`, conservando `score` y `lives`. Si `state.level === LEVEL_COUNT` se llama `endGame('victoria')`. Verificación: al limpiar el nivel 1 aparece el nivel 2 entre 140 ms y 200 ms después del impacto, sin pantalla de fin; al limpiar el nivel 3 aparece la victoria final.
8. Mostrar "Nivel N / 3" en el HUD y actualizar `resetGame` para volver a `state.level = 1`, 3 vidas, 0 puntos y `loadLevel(1)`, conservando `state.muted`. Verificación: el HUD cambia al pasar de nivel, y tras reiniciar muestra "Nivel 1 / 3" con 60 ladrillos y el sonido en el mismo estado que antes del reinicio.
9. Guardar en el top 5 el puntaje acumulado al terminar la partida, sin cambiar la clave `arkanoid:v1`. Verificación: tras ganar la victoria final, el puntaje guardado es la suma de los puntajes de los tres niveles.

## Criterios de aceptación

- [ ] Al rebotar la pelota en una pared lateral, el techo, el paddle o un ladrillo, suena `assets/sounds/ball-bounce.mp3`.
- [ ] Al destruir un ladrillo suena `assets/sounds/break-sound.mp3` una sola vez, en el cuadro del impacto.
- [ ] Al perder una vida suena `assets/sounds/break-sound.mp3`.
- [ ] Al terminar la partida por derrota o por victoria final suena `assets/sounds/break-sound.mp3`.
- [ ] Mientras el silencio está activo, ningún sonido se reproduce.
- [ ] Presionar M alterna el silencio, y el HUD muestra "Sonido: activado" o "Sonido: silenciado" según el estado.
- [ ] Al recargar la página, el sonido vuelve a estar activado.
- [ ] Si un archivo de audio no carga o `play()` es rechazado, el juego sigue funcionando y no aparecen errores sin capturar en la consola.
- [ ] El nivel 1 tiene 60 ladrillos, el nivel 2 tiene 45 y el nivel 3 tiene 48.
- [ ] En los tres niveles, cada fila usa el color que le corresponde en `ROW_COLORS`.
- [ ] El HUD muestra "Nivel 1 / 3", "Nivel 2 / 3" o "Nivel 3 / 3" según el nivel en curso.
- [ ] Al destruir el último ladrillo del nivel 1 o del nivel 2, el nivel siguiente aparece entre 140 ms y 200 ms después del impacto.
- [ ] Durante esos 150 ms la explosión del último ladrillo es visible.
- [ ] El paso de nivel no muestra la pantalla de fin ni detiene la partida.
- [ ] Al pasar de nivel, el puntaje y las vidas conservan sus valores, y la pelota queda en estado `esperando` sobre el paddle.
- [ ] La pelota no se puede lanzar antes de que pasen 500 ms desde el inicio de cada nivel.
- [ ] Al destruir el último ladrillo del nivel 3 aparece la pantalla de victoria con el puntaje acumulado de los tres niveles.
- [ ] El puntaje guardado en el top 5 tras la victoria final es la suma de los tres niveles.
- [ ] Reiniciar la partida vuelve al nivel 1 con 3 vidas, 0 puntos y 60 ladrillos.
- [ ] Reiniciar la partida conserva el estado de silencio.
- [ ] Cada ladrillo destruido sigue sumando exactamente 10 puntos en cualquier nivel.
- [ ] La consola del navegador no muestra errores durante una partida completa de los tres niveles.
- [ ] Ningún archivo de `assets/sounds/` distinto de `ball-bounce.mp3` y `break-sound.mp3` se referencia en el código.

## Decisiones

- **Sí:** Un solo spec para sonidos y niveles. Lo pidió el usuario, aunque el tamaño es grande. Si la implementación se vuelve difícil de revisar, se puede dividir en el paso 5.
- **Sí:** `playSound` en `game.js`, sin módulo nuevo. Mantiene la decisión de SPEC 01 de no usar módulos ni build tooling.
- **Sí:** Un objeto `Audio` nuevo por reproducción. Permite que el rebote y la rotura suenen en el mismo cuadro sin cortarse.
- **No:** Reutilizar un solo `Audio` para todos los sonidos. Un sonido nuevo cortaría al anterior.
- **Sí:** `ball-bounce.mp3` en todos los rebotes, incluidos los ladrillos. Es el evento "rebote de pelota" tal como lo pidió el usuario.
- **Sí:** `break-sound.mp3` también para pérdida de vida y fin de partida. Es decisión del usuario, por no existir archivos adecuados.
- **No:** Archivos de sonido nuevos en este spec. Se agregan en un cambio posterior cuando existan.
- **Sí:** Silencio con la tecla M, solo en memoria. Lo pidió el usuario.
- **No:** Guardar el silencio en localStorage. La clave `arkanoid:v1` no cambia y no hay una segunda clave que versionar.
- **Sí:** Indicador "Sonido: activado / silenciado" en el HUD. Lo agrega este spec para que el estado sea visible. Sin él, el jugador no sabe si M funcionó.
- **Sí:** El silencio se conserva al reiniciar. Es una preferencia de sesión, no del nivel.
- **Sí:** Tres niveles fijos en `LEVEL_PATTERNS`, dentro de `game.js`. Lo pidió el usuario.
- **No:** Niveles en un archivo JSON. Requiere carga asíncrona y manejo de errores de carga.
- **No:** Dificultad generada por código. El diseño de cada nivel queda explícito y verificable.
- **Sí:** Los patrones de la sección "Modelo de datos" son los aprobados por el usuario. Las cantidades (60, 45 y 48) se calcularon contando los caracteres de cada patrón.
- **Sí:** Misma velocidad de pelota en los tres niveles (`BALL_SPEED`). Es el valor por defecto que se desprende de elegir patrones distintos sin cambiar la colisión.
- **No:** Pelota más rápida por nivel. Queda para un spec posterior si se decide.
- **Sí:** Paso de nivel 150 ms después del último impacto, con el mecanismo `victoryAt` de SPEC 02. Así la explosión del último ladrillo se ve completa.
- **No:** Pantalla intermedia entre niveles. Lo pidió el usuario al elegir avance automático.
- **Sí:** Relanzamiento con espera de `RELAUNCH_DELAY_MS` (500 ms) al empezar cada nivel. Reutiliza la regla de SPEC 01 para que nadie lance por accidente la pelota del nivel nuevo.
- **Sí:** Top 5 global con el puntaje acumulado. Lo pidió el usuario.
- **No:** Top 5 por nivel.
- **Sí:** Este spec reemplaza las restricciones de SPEC 01 y SPEC 02 sobre sonidos y sobre el nivel único. Los criterios "Ningún archivo de `assets/sounds/` se referencia en el código" de SPEC 01 y SPEC 02 dejan de aplicar. El criterio nuevo de este spec los sustituye.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `break-sound.mp3` suena en tres eventos distintos y el jugador no distingue una rotura de una pérdida de vida o del fin de partida. | Se acepta en este spec. Los archivos propios para pérdida y fin quedan para un cambio posterior. |
| El navegador bloquea la reproducción automática de audio antes de una interacción. | El primer rebote ocurre después de lanzar la pelota con clic o espacio, que cuentan como gesto del usuario. Si aun así se bloquea, `play()` se rechaza y el error se ignora. |
| Muchos `Audio` creados seguidos al destruir ladrillos rápido afectan el rendimiento. | Cada reproducción es corta. Se revisa en prueba manual con partidas completas. Si hay problemas, se trata en un spec posterior. |
| Un nivel con huecos deja la pelota rebotando entre ladrillos en un patrón que no termina. | El ángulo de rebote es fijo de 45 grados y la pelota sale de los huecos. Se verifica en prueba manual en los niveles 2 y 3. |

## Qué **no** está en este spec

- Archivos de sonido propios para pérdida de vida y fin de partida.
- Música de fondo.
- Control de volumen.
- Persistencia del silencio entre recargas.
- Más de tres niveles o editor de niveles.
- Pantalla intermedia entre niveles.
- Velocidad de pelota distinta por nivel.
- Top 5 por nivel.
- Puntos por color de ladrillo.
- Power-ups, pausa y pantalla de inicio.

Cada uno de estos puntos, si se incorpora, va en su propio spec.
