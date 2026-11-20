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

Este plugin todavía no está en el catálogo oficial de Punktfunk, así que se instala por su nombre
de paquete y aparece como **Sin verificar**.

### a) Desde la consola web

1. Abre **Plugins → Explorar**.
2. Al final de la página, pulsa **Instalar desde especificación de paquete…**.
3. En **Especificación del paquete** escribe `@sopis/plugin-gamedb@1.0.1`, y otra vez en
   **Escribe de nuevo la especificación para confirmar**.
4. Marca **Entiendo que esto ejecuta código no revisado con privilegios de operador.**, escribe la
   **Contraseña de la consola** y pulsa **Instalar sin verificar**.
5. Actívalo en **Biblioteca → Fuentes → Imágenes y metadatos**.

### b) Desde una terminal

En el host, desde una terminal de administrador (Windows) o como el usuario del host (Linux):

```sh
punktfunk-host plugins add @sopis/plugin-gamedb --allow-public-registry
```

Después actívalo en **Biblioteca → Fuentes → Imágenes y metadatos**.

### Si aparece "Detenido"

Reinicia el ejecutor de plugins (**Plugins → Instalados → Ejecutor de plugins**, o):

```sh
punktfunk-host plugins disable
punktfunk-host plugins enable
```

### Desde una compilación propia

`bun install && bun run build && bun pm pack`, copia el `.tgz` a la carpeta de plugins
(`%ProgramData%\punktfunk\plugins` en Windows, `~/.config/punktfunk/plugins` en Linux) y ejecuta
allí `punktfunk-host plugins add ./sopis-plugin-gamedb-1.0.1.tgz --allow-public-registry`. Deja el
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
