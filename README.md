# BadgeMaker - Plataforma de Diseño de Chapitas

Una herramienta web moderna para diseñar y exportar plantillas de impresión para chapitas.

## 🚀 Cómo usar

1. **Abrir**: Simplemente abre el archivo `index.html` en tu navegador.
2. **Subir imagen**: Carga tu diseño o dibujo (JPG, PNG).
3. **Elegir formato**: Selecciona entre Círculo 60mm, Círculo 45mm o Corazón.
4. **Editar**:
   - Arrastra, haz zoom y centra tu imagen.
   - Usa "Ver Recorte" para asegurarte de que lo importante queda dentro de la zona visible (verde).
5. **Agregar a la Hoja**: 
   - Cuando te guste el diseño, haz clic en **"Agregar a la Hoja"**.
   - Puedes cambiar la imagen o el tipo de chapita y seguir agregando más diseños.
   - Verás tus diseños en la "Cola de Impresión".
6. **Exportar PDF**: 
   - Haz clic en "Descargar PDF".
   - El sistema generará una hoja A4 con todos tus diseños organizados para ahorrar papel.
   - Las imágenes tendrán las esquinas recortadas en blanco para ahorrar tinta y mostrar la forma real de corte.

## 🛠️ Tecnologías

- **Bootstrap 5**: UI moderna y responsiva.
- **HTML5 Canvas**: Renderizado gráfico de alto rendimiento.
- **jsPDF**: Generación de PDF vectorial con medidas físicas exactas en milímetros.

## 📏 Especificaciones Técnicas

El sistema trabaja internamente a **300 DPI**.

| Tipo | Visible (Frente) | Sangrado/Corte (Total) |
|------|------------------|------------------|
| Círculo Grande | 60 mm | 66 mm |
| Círculo Mediano | 45 mm | 51 mm |
| Corazón | 55 x 50 mm | 61 x 56 mm |

*El PDF incluye un borde gris fino indicando la línea de corte.*
