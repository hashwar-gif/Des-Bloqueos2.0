# 🔥 DESBLOQUEOS BOLIVIA — Run & Gun Game

![Versión](https://img.shields.io/badge/versión-2.7-red)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue)
![Plataforma](https://img.shields.io/badge/plataforma-Web%20%7C%20Mobile-green)

**Desbloqueos Bolivia** es un juego tipo *run and gun* 2D de desplazamiento lateral ambientado en el conflicto social boliviano de 2026. Avanza por 6 ciudades, derrota enemigos, recolecta recursos, usa habilidades únicas y descubre tu destino según el personaje que elijas.

---

## 🎮 Características Principales

| Característica | Descripción |
|----------------|-------------|
| 🎭 **12 Personajes** | PM, Policía Boliviana, Rebelde, Cholita, Poncho Rojo, COB, Evo González, Presidente, DEA, Cap. LARI, Perro Petardo, Joe |
| 🗺️ **6 Niveles** | La Paz → El Alto → Oruro → Cochabamba → Chapare → Santa Cruz |
| 🌦️ **Clima dinámico** | Día, Noche, Atardecer, Amanecer, Nieve, Tormenta, Vendaval, Lluvia (cambia cada 45s) |
| 💰 **Economía de guerra** | Gana dinero eliminando enemigos, gástalo en la tienda entre niveles |
| ⚡ **Habilidades únicas** | Cada personaje tiene una habilidad especial con cooldown |
| 🏁 **3 Finales** | Chapare, Bueno (desbloqueo) y Malo (bloqueo) — según tu personaje |
| 🎨 **Fondos por ciudad** | Cada nivel tiene su propia geografía, vegetación y decoraciones |
| 📱 **Mobile Ready** | Controles táctiles + responsive |

---

## 🕹️ Controles

| Acción | Tecla | Móvil |
|--------|-------|-------|
| Moverse | ← → | Botones ◀ ▶ |
| Saltar | Espacio | Botón ⬆ |
| Disparar | X | Botón 🔥 |
| Habilidad | C | Botón ⚡ |

---

## 👥 Personajes

| Personaje | Tipo | Habilidad | Final |
|-----------|------|-----------|-------|
| **PM** (Policía Militar) | Héroe | 🎯 VISOR TÁCTICO — Dron + marca enemigos, +1 daño | Chapare |
| **Policía Boliviana** | Héroe | 🚓 MACANAZO POLICIAL — Macanazo + gas lacrimógeno + defensa +20 | Chapare |
| **Rebelde** | Héroe | 🔥 INCENDIO PROVOCADO — 5 molotovs = MURO DE FUEGO | Chapare |
| **DEA** (Agente) | Héroe | 🇺🇸 DRON REAPER — Dron bombardea enemigos con misiles | Chapare |
| **Cap. LARI** | Héroe | 🗣️ GRITO DE EUFORIA — Ondas de choque dañan y empujan | Chapare |
| **Joe** (Hacker) | Héroe | 💻 CÓDIGO FUENTE — Hackea enemigos se atacan entre sí | Chapare |
| **Presidente** | Héroe | 📜 DECRETO SUPREMO — 8 bombas guiadas + botín | Chapare |
| **Cholita** | Villana | 🪔 FOGATA DE LA ABUELA — Fogata + espíritus de fuego | Malo |
| **Poncho Rojo** | Villano | ✨ TEJIDO SAGRADO — INVULNERABLE 4s + refleja daño | Malo |
| **COB** (Minero) | Villano | 💣 DINAMITA DE SOCAVÓN — 3 dinamitas explosión cadena | Malo |
| **Evo González** | Villano | 🌿 LLUVIA DE HOJAS DE COCA — hojas caen del cielo, los enemigos se drogan y reciben daño | Malo |
| **Perro Petardo** | Villano | ☠️ CADENA MORTAL — Carga imparable + explosiones + fuego | Malo |

---

## 🗺️ Niveles

| # | Ciudad | Geografía | Enemigos |
|---|--------|-----------|----------|
| 1 | **La Paz** — Ciudad Maravilla | Cerros, Illimani, árboles | Poncho, COB |
| 2 | **El Alto** — La Cumbre | Altiplano, cactos, piedras | Poncho, COB |
| 3 | **Oruro** — Capital del Folclore | Cerros mineros, socavón, diablada | Poncho, COB |
| 4 | **Cochabamba** — Ciudad Jardín | Valle, cerro Tunari, frutales | Poncho, COB |
| 5 | **Chapare** — Bastión de Evo | Selva montañosa, coca, palmeras, río | Evo, Rodrigo_e |
| 6 | **Santa Cruz** — Ciudad de los Anillos | Colinas tropicales, edificios, palmeras | Evo, Rodrigo_e |

---

## 🛠️ Tecnologías

- HTML5 Canvas (renderizado 2D)
- JavaScript Vanilla (~2,600 líneas)
- Bootstrap 5 (UI responsiva)
- Web Audio API (música y efectos)

---

## 🚀 Cómo jugar

1. Clona o descarga el repositorio
2. Abre `index.html` en tu navegador
3. Haz clic en **EMPEZAR MISIÓN**
4. Selecciona tu personaje
5. Compra suministros en la tienda
6. ¡Sobrevive los 6 niveles y descubre tu final!

---

## 📸 Capturas

> *Próximamente...*

---

## 🏗️ Estructura del proyecto

```
desbloqueos-bolivia/
├── index.html              # Página principal + UI
├── game.js                 # Lógica completa del juego (~2,868 líneas)
├── style.css               # Estilos visuales
├── presentacion.html       # Página promocional
├── README.md               # Este archivo
├── api/
│   └── leaderboard.php     # API de ranking MySQL
├── assets/
│   ├── music/              # Pistas de audio (BGM)
│   │   ├── a)$hash JDR-IA.wav
│   │   └── b)Hashwar JDR-IA.wav
│   └── img/
│       └── qr.jpeg         # Código QR
├── docs/
│   ├── DESCRIPCION.md      # Descripción del juego
│   └── INSTRUCCIONES_ITCHIO.md  # Instrucciones para itch.io
└── legacy/                 # Archivos históricos
    ├── DIAGNOSTICO.txt
    ├── DIAGNOSTICO_COMPLETO.txt
    ├── INFORME_CAMBIOS.txt
    ├── REPORTE_SESION_REBELION_2026.txt
    └── README_legacy_v0.5.txt
```

---

## 👨‍💻 Créditos

**Desarrollado por:** Hashwar Technologies  
**CEO:** Joel Sandi  
**Versión:** v2.7 — "Revelión 2026"  
**Personajes creados por IA generativa** — No representan personas reales

---

## 📜 Licencia

MIT License — Libre para uso educativo y personal.

---

## ⚠️ Aviso

Este juego es una obra de ficción basada en escenarios hipotéticos. Los personajes y situaciones representados no buscan ofender ni promover violencia. Todo el contenido es con fines artísticos y de entretenimiento.
