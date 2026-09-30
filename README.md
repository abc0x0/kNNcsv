# Clasificador k-NN móvil

Aplicación web progresiva (PWA) educativa para clasificar un objeto mediante **k vecinos más cercanos** usando dos rasgos cuantitativos, `x` y `y`.

## Características

- Optimizada para teléfono celular en posición vertical.
- Carga archivos CSV.
- Representación gráfica de las instancias en un plano X-Y.
- Colores distintos por clase.
- Entrada manual de un nuevo objeto `(x,y)`.
- Selección del valor de `k`.
- Distancia euclidiana.
- Resaltado de los k vecinos más cercanos.
- Líneas desde el objeto nuevo hacia sus vecinos.
- Tabla con vecinos, clase y distancia.
- Desempate por menor suma de distancias.
- Funciona sin bibliotecas externas.
- PWA instalable y con funcionamiento sin conexión después de la primera carga.

## Formato del CSV

El archivo debe contener exactamente estas columnas:

```csv
x,y,clase
90,5.0,Limon
110,5.5,Limon
170,7.0,Naranja
```

- `x`: primer rasgo cuantitativo.
- `y`: segundo rasgo cuantitativo.
- `clase`: etiqueta conocida.

## Cómo ejecutar

Por restricciones de los navegadores, una PWA no debe abrirse directamente con `file://`.

### Opción 1. Servidor local con Python

Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Después abrir:

```text
http://localhost:8000
```

En computadora esto permite probar el *service worker*.

### Opción 2. Publicación para instalarla en el celular

Súbela a un servicio con **HTTPS**, por ejemplo GitHub Pages, Netlify, Cloudflare Pages o un servidor web propio.

En el teléfono:

1. Abrir la URL en Chrome/Edge.
2. Usar el botón **Instalar aplicación** cuando aparezca, o el menú del navegador → **Instalar app / Añadir a pantalla de inicio**.
3. La aplicación quedará disponible en modo independiente.

## Archivos

- `index.html`: interfaz.
- `style.css`: diseño responsive.
- `app.js`: lectura CSV, k-NN, gráfica y lógica de instalación.
- `manifest.webmanifest`: metadatos PWA.
- `sw.js`: service worker y caché offline.
- `ejemplo.csv`: datos de prueba.
- `icons/logo.svg`: logotipo vectorial.
- `icons/icon-192.png`: icono PWA.
- `icons/icon-512.png`: icono PWA.
- `icons/maskable-512.png`: icono maskable.
- `icons/apple-touch-icon.png`: icono para iOS.

## Algoritmo

Para el objeto nuevo `q=(x,y)` se calcula la distancia euclidiana a cada instancia conocida:

```text
d(p,q) = sqrt((px-qx)^2 + (py-qy)^2)
```

Se seleccionan los `k` objetos con menor distancia y se asigna la clase con mayor número de votos.

Si dos clases empatan en votos, se elige la que tenga menor suma de distancias entre sus vecinos.

## Nota didáctica

Esta versión usa únicamente dos rasgos cuantitativos para que el proceso pueda visualizarse directamente en un plano cartesiano.
