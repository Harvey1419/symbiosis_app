# Design System — Resumen Ejecutivo

> **Fuente de verdad autoritativa**: `../../Branding/Manual de marca -Symbiosis.pdf` (19 páginas, Canva, feb 2026). Este documento es un resumen operativo; ante cualquier duda, el PDF manda.

## Identidad

- **Nombre**: Symbiosis Lab
- **Logo**: `.Symbiosis lab.` con la S interrumpida por una franja curva y un punto del tamaño de la "i". Logo e isotype viven en `src/assets/brand/`.
- **Personalidad**: Industrial Serenity — herramientas técnicas con un guiño orgánico. Minimalismo profundo con foco en legibilidad profesional.

## Tokens (referencia rápida)

```scss
// Colores
--color-primary:      #032425;   // principal, fondo
--color-yellow:       #F1FF58;   // Yellow Ace: CTAs y acentos críticos
--color-secondary:    #416858;   // secondary verde medio
--color-complement-1: #E5EAE6;   // complemento 1
--color-complement-2: #F5F6F6;   // complemento 2
--color-black:        #000000;
--color-white:        #FFFFFF;

// Tipografía
--font-display: 'Poppins', 'Helvetica Neue', sans-serif;       // títulos
--font-body:    'Helvetica Neue', Helvetica, 'Inter', Arial, sans-serif;  // cuerpo

// Métrica
--radius-base: 4px;
--radius-card: 8px;
--line-height-body: 1.4;
```

## Reglas de uso (no negociables)

### Logo
- **NO inclinar, NO cambiar colores, NO deformar, NO alterar la forma de las letras.**
- Respetar área de reserva (mínimo = altura de la "i").
- Sobre fondo oscuro usar el logo en blanco/amarillo; sobre fondo claro usar la versión oscura.

### Color
- `#F1FF58` (Yellow Ace) está **reservado** para CTAs primarios, estados activos críticos y notificaciones urgentes. **Nunca** para texto largo, íconos decorativos o大面积.
- Construir capas (cards, sidebar) con **incrementos tonales sutiles** del fondo `#032425` (3-5% más claro), no con bordes duros.
- Texto primario: blanco apagado (`#FFFFFF` o `#E5EAE6`) para evitar vibración sobre fondo oscuro.

### Tipografía
- **Títulos**: Poppins Bold. Interletrado ligero (similar a -45 del logo, ajustar visualmente según contexto).
- **Cuerpo**: Helvetica (con Inter cargada desde Google Fonts como fallback para Windows/Linux donde Helvetica no existe).
- **Line-height body**: 1.4 (no 1.5 — el manual es explícito en 1,4).

### Forma
- Radius base **4px** (botones, inputs).
- Radius **8px** (cards, sidebar, containers estructurales).
- **NO usar radius 9999px** (pills) ni esquinas 0px (sharp).

## Implementación actual

`src/styles.scss` contiene los tokens como CSS custom properties y los mixins tipográficos (`@mixin headline-xl/lg/md`, `@mixin body-lg/md`, `@mixin label-md/sm`, `@mixin surface-card`, `@mixin surface-elevated`). Para nuevos componentes, leer las variables y mixins — **no hardcodear valores**.

## Recursos

- PDF manual: `../../Branding/Manual de marca -Symbiosis.pdf`
- Logo assets: `src/assets/brand/`
- Variables CSS: `src/styles.scss`
