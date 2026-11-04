# Beleza Truco · prototipo (guía en español)

**Sitio de prueba:** https://nachobaeza.github.io/beleza-truco-prototipo/

Prototipo de una plataforma de **truco paulista y mineiro con dinero real para Brasil**. "Beleza Truco" es un nombre
provisorio. Es un prototipo de front-end, no un producto: no hay servidor, no hay dinero real, los rivales son bots
locales y todos los números (saldo, mesas, ranking) son datos de ejemplo.

La **interfaz está en portugués de Brasil a propósito**: es el idioma del producto final y los textos que se ven son los
literales que después hay que programar. Esta guía, en español, explica qué es cada cosa.

---

## 1. Cómo probarlo

- Abrí la URL de arriba en el **celular** (es la vista principal, pensada para 390×844) o en la computadora (1440×900).
- No hace falta instalar nada ni crear cuenta. Todos los botones de "Entrar", "Criar conta", "Entrar na mesa" llevan a
  pantallas del prototipo.
- Si querés correrlo en tu PC: bajá el repo y abrí `index.html` con doble clic, o serví la carpeta con
  `python -m http.server 8770` y entrá a `http://localhost:8770/`.
- Las fuentes vienen de Google Fonts: la primera vez necesita internet.

## 2. Las pantallas

| Página | Qué es | Qué mirar |
|---|---|---|
| `index.html` | Índice con links a todo. | — |
| `home.html` | **Home pública** (lo que ve alguien que todavía no tiene cuenta). | Título, botón "Criar conta" (crear cuenta), la mesa con tres cartas y el sello TRUCO!, "Como funciona" (3 pasos), reglas, bloque de transparencia (valor de mesa, comisión, Pix, juego responsable). Sin promesas de dinero. |
| `lobby.html` | **Lobby**: lista de mesas abiertas. | Jugadores en línea y mesas como dato, filtros (paulista/mineiro, 1x1/2x2, rango de valor), cada mesa con sus asientos ocupados, valor por jugador y comisión ("taxa"), botón "Entrar" o "Assistir" si está llena. "Criar mesa" abre el formulario (variante, modo, valor, tiempo por jugada, serie, mano de hierro) con el resumen de cuánto recibe cada ganador. "Prática" es la mesa de entrenamiento con bots, sin dinero. |
| `mesa.html` | **La mesa jugable.** Se juega contra bots con las reglas reales de las dos variantes. | Marcador NÓS / ELES, VALE (cuánto vale la mano), la manilha, las cartas, el botón TRUCO! y la cadena SEIS! NOVE! DOZE!, el banco de bazas a los costados del paño, chat/emotes/señas, resultado final. El engranaje arriba a la derecha abre **Ajustes y demo**: cambiar variante y modo, velocidad, animaciones, alto contraste, y **"Forçar estado"** para provocar mano de once, mano de hierro, un truco del rival o un empate sin esperar a que pasen. |
| `caixa.html` | **Caja**: depósito y retiro por Pix. | Saldo disponible y reservado en mesas; pestañas Depositar / Sacar / Histórico. "Gerar Pix" muestra un QR y el código "copia e cola" (el QR es de demostración, no es un Pix válido); "Simular pagamento" acredita el saldo para ver el flujo completo. El retiro va solo a la clave Pix del propio CPF y se bloquea si la verificación de identidad está pendiente (botón "Demo · alternar verificação" abajo para probar los dos estados). Panel de juego responsable con límite propio y pausa de cuenta. |
| `ranking.html` | **Ranking mensual y perfil.** | Top 10 con filtros, la fila propia siempre visible, recompensas del mes como dato (1º a 10º), perfil con nivel, victorias, partidas, manilhas jugadas, zaps y rachas. |
| `design-system.html` | **Sistema de diseño**: colores, luz, tipografía, las 40 cartas, los 20 componentes con sus estados, pantallas estáticas, animaciones y vocabulario. | Es la referencia exacta para quien programe: cada medida en píxeles, cada tiempo de animación. |
| `cards-test.html` | Las 40 cartas, manilhas y dorsos en todos los tamaños. | Control de calidad del mazo. |

## 3. Qué es real y qué es demo

| Real (se conserva en producción) | Demo (se reemplaza) |
|---|---|
| Diseño completo: colores, tipografía, medidas, componentes, animaciones y sus tiempos. | Los rivales son bots que corren en el navegador. |
| Reglas del juego: el motor `truco-engine.js` implementa paulista y mineiro y pasa 38 tests. | El reloj por jugada corre en el cliente (en producción lo lleva el servidor). |
| Los textos de la interfaz en portugués (botones, marcador, avisos). | Saldo, mesas, histórico, ranking, perfil: datos fijos en `app.js`. |
| La fórmula del dinero: pozo = valor × jugadores; neto = pozo × (1 − comisión); cada ganador cobra neto ÷ (jugadores ÷ 2). | El QR Pix y el código "copia e cola" (en producción los devuelve el proveedor de pagos). |
| Las reglas de compliance (ver punto 5). | "Simular pagamento" y "alternar verificação" existen solo para la demo. |

## 4. Glosario: lo que aparece en la pantalla, en español

**Juego**

- **Truco paulista / mineiro**: las dos variantes brasileñas. En paulista hay "vira" (una carta que se da vuelta y define
  la manilha); en mineiro las manilhas son fijas (4♣ 7♥ A♠ 7♦).
- **Manilha**: la carta más fuerte de la mano (equivale al "ancho" nuestro). En el prototipo se dibuja **invertida**:
  cara negra con tinta dorada, para que se reconozca al instante. **Zap** es la manilha de bastos (♣), la más alta.
- **Vira**: la carta que se da vuelta al repartir y define cuál es la manilha.
- **TRUCO! · SEIS! · NOVE! · DOZE!**: la cadena de aumentos (vale 1 → 3 → 6 → 9 → 12). En mineiro: TRUCO! · SEIS! ·
  DEZ! · DOZE! (2 → 4 → 6 → 10 → 12).
- **ACEITAR** = quiero · **CORRER** / **NÃO QUERO** = no quiero, me voy · **JOGAR COBERTA** = jugar una carta boca
  abajo (vale menos que todas) · **JOGAR** = jugar.
- **DESCE!** = "bajá" (aceptaron el truco) · **TÔ FORA!** = "me voy" (corrieron) · **EMPACHOU!** = empate de la vuelta.
- **NÓS / ELES** = nosotros / ellos (en 1x1: VOCÊ / ELE). **VALE** = cuánto vale la mano ahora. **Pontos** = los
  puntos de la partida (a 12). **Rodada** = cada vuelta de cartas (baza). **Tentos** = el valor de la mano.
- **Mão de onze**: cuando un lado llega a 11, ve las cartas del compañero y decide jugar (vale 3) o correr (el rival
  suma 1). **Mão de ferro**: 11 a 11, se juega a ciegas, vale 1.
- **Vazas / banco**: las vueltas ya cerradas, apiladas a los costados del paño (izquierda las nuestras, derecha las de ellos).
- **Sinais**: las señas al compañero en 2x2 (guiño, ceja, cachete, lengua), con significado sorteado en cada mano.
- **Prática**: mesa de entrenamiento con bots ("robô"), sin dinero en juego.

**Dinero y cuenta**

- **Caixa** = caja · **Saldo disponível** = saldo disponible · **Reservado em mesas** = plata retenida mientras jugás.
- **Depositar / Sacar** = depositar / retirar · **Pix** = la transferencia instantánea brasileña · **copia e cola** =
  el código Pix para pegar en el banco · **chave Pix** = la clave Pix (acá, siempre el CPF del usuario).
- **Taxa** = comisión de la plataforma sobre el pozo de la mesa (ej. 7 %). **Valor por jogador** = lo que pone cada uno.
- **Você recebe R$ 3,72** = "recibís R$ 3,72" · **Você perde R$ 2,00** = "perdés R$ 2,00". Voz neutra a propósito.
- **CPF** = el DNI fiscal brasileño · **Verificação de identidade** = verificación de identidad (documento + selfie)
  · **Verificada / Pendente** = verificada / pendiente · **Maior de 18** = mayor de 18.
- **Jogo responsável** = juego responsable · **Limite** = límite · **Pausar conta** = pausar la cuenta.
- **Recompensas do mês** = las recompensas del ranking mensual · **Regulamento** = reglamento.
- **"O jogo pode ser viciante. Jogue com responsabilidade. 18+."** = el pie legal obligatorio en todas las pantallas.

## 5. Reglas de compliance que el prototipo cumple (y hay que mantener)

- Nunca "grátis", "bônus", "prêmio", "ganhe dinheiro", "aposta", "cassino". Las recompensas se llaman "recompensas".
- El dinero es **dato, no gancho**: valor y comisión aparecen en el chip de la mesa, sin verbos de ganancia ni signos de
  exclamación. La voz en errores y en dinero es neutra.
- Nada que parezca moneda, ficha, confeti o brillo en loop: la celebración es la luz y la tipografía.
- "Robô" solo en la mesa de práctica; en mesas con dinero todos los asientos son personas.
- Pie legal 18+ en todas las pantallas, modales y resultado.
- La palabra "boteco" / "botequim" no aparece en la interfaz ni en la marca: es solo el nombre interno de la dirección
  de arte ("una lámpara, una mesa, una voz").

## 6. Qué falta (fuera del prototipo)

Registro y login, servidor de juego y protocolo (está especificado aparte), pagos reales con un proveedor Pix,
verificación de identidad real, sonido (voces y efectos), pruebas en teléfonos Android de gama media, textos legales
definitivos validados por un abogado en Brasil.

## 7. Archivos

| Archivo | Qué es |
|---|---|
| `tokens.css` | Todos los colores, tipografías, medidas y tiempos como variables CSS. Es la tabla a copiar en cualquier plataforma. |
| `cards.js` | Genera las 40 cartas, las manilhas y el dorso como SVG. |
| `truco-engine.js` | El motor de reglas, sin interfaz. Sirve como núcleo del servidor. |
| `mesa.html` / `mesa.css` / `mesa.js` | La mesa jugable. |
| `app.css` / `app.js` | Lo compartido por home, lobby, caja y ranking (cabecera, barra de pestañas, listas, formularios, datos de ejemplo). |
| `design-system.*` | La página del sistema de diseño. |
| `noise.svg` | El único asset de textura (grano fino). |

---

O jogo pode ser viciante. Jogue com responsabilidade. 18+.
