# @sopis/plugin-gamedb

[English](README.md)

Fuente de imágenes y metadatos para Punktfunk que busca carátulas igual que Sunshine, Apollo y
Vibepollo: en [LizardByte GameDB](https://github.com/LizardByte/GameDB), una copia estática de
[IGDB](https://www.igdb.com). **Sin cuenta ni clave de API.**

- Rellena la carátula vertical, una imagen de cabecera (ilustración de IGDB o, si no hay, una
  captura), descripción, desarrollador, año y géneros.
- Solo asigna un juego automáticamente si el nombre coincide, o coincide más un subtítulo
  (`Monkey Island 2` → `Monkey Island 2: LeChuck's Revenge`). Si no, abre el juego, pulsa
  **¿Juego incorrecto?**, escribe un nombre y elige la carátula, como en Vibepollo.
- Los espacios y signos no cuentan al buscar ni al asignar: `Little Big Planet` encuentra
  `LittleBigPlanet`.
- **Elegir…** en la carátula muestra las de todas las ediciones con el mismo nombre.

## Instalación

Disponible en el **catálogo oficial de Punktfunk** como **GameDB** (Punktfunk 0.47.0 o posterior).

### a) Desde la consola web

1. Abre **Plugins → Explorar**.
2. Busca **GameDB**, abre su ficha y pulsa **Instalar**.
3. Una vez instalado, actívalo en **Biblioteca → Fuentes → Imágenes y metadatos**.

La instalación desde el catálogo está revisada: no necesitas **Instalar desde especificación
de paquete…** ni confirmar la ejecución de código sin verificar.

### b) Desde una terminal (instalación directa desde npm)

En el host, desde una terminal de administrador (Windows) o como el usuario del host (Linux):

```sh
punktfunk-host plugins add @sopis/plugin-gamedb --allow-public-registry
```

Después actívalo en **Biblioteca → Fuentes → Imágenes y metadatos**.

Este comando instala directamente desde npm, fuera del proceso del catálogo revisado, y puede
aparecer como **Sin verificar**. Para instalar la versión revisada del catálogo, usa preferentemente
la consola web indicada arriba.

### Si aparece "Detenido"

Reinicia el ejecutor de plugins (**Plugins → Instalados → Ejecutor de plugins**, o):

```sh
punktfunk-host plugins disable
punktfunk-host plugins enable
```

### Desde una compilación propia

`bun install && bun run build && bun pm pack`, copia el `.tgz` a la carpeta de plugins
(`%ProgramData%\punktfunk\plugins` en Windows, `~/.config/punktfunk/plugins` en Linux) y ejecuta
allí `punktfunk-host plugins add ./sopis-plugin-gamedb-1.0.3.tgz --allow-public-registry`. Deja el
`./`: una ruta sin `/` se interpreta como nombre de plugin.

## Idioma

Español e inglés. El ajuste **Idioma** de la fuente elige uno; **auto** sigue el idioma del
sistema. Traduce el título en la consola, las etiquetas de las imágenes y los géneros. Las
descripciones siguen en inglés, el único idioma en que las tiene IGDB. Tras cambiarlo, refresca
la fuente para que los géneros ya rellenados se actualicen.

## Línea de comandos

```sh
punktfunk-plugin-gamedb search Rayman Origins   # sin host: lista candidatos con sus carátulas
punktfunk-plugin-gamedb lookup <id de la biblioteca>
punktfunk-plugin-gamedb uninstall
```

## Créditos

Datos e imágenes de juegos © [IGDB](https://www.igdb.com), a través de LizardByte GameDB. Este
plugin solo enlaza a ellos; no incluye ningún dato.

Licencia: MIT o Apache-2.0.

## Apoya el proyecto

Si este plugin te resulta útil, puedes apoyar mi trabajo en Ko-fi. ¡Gracias!

[![Apóyame en Ko-fi](https://storage.ko-fi.com/cdn/kofi2.png?v=3)](https://ko-fi.com/sopis)
