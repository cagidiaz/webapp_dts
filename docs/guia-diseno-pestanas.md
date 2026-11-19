# Patrón de pestañas de la aplicación

Las pestañas nuevas de las vistas de la aplicación deben utilizar el patrón visual del Directorio de Empresas del CRM. La referencia reutilizable está en `frontend/src/components/shared/appTabs.ts`:

- `appTabListClass` define la separación, el ajuste en varias filas y el borde inferior del grupo.
- `appTabClass(activa)` define tamaño, espaciado, forma, colores en temas claro y oscuro, hover y foco del botón.
- `appTabIconClass(activa)` define el color del icono; utilizar iconos de 16 píxeles cuando la pestaña tenga icono.
- La separación vertical entre la barra de pestañas y el contenido siguiente debe coincidir con el Directorio de Empresas: `space-y-3.5` en su contenedor común (14 px con la escala estándar de Tailwind), además del borde y padding propios de `appTabListClass`. No añadir márgenes superiores adicionales al panel que alteren esa separación.

Cada grupo debe conservar sus permisos, navegación y contenido; utilizar botones con `type="button"`, un nombre accesible y los atributos `role="tablist"`, `role="tab"` y `aria-selected` cuando corresponda. El grupo debe adaptarse a pantallas estrechas sin ocultar etiquetas ni impedir el acceso a opciones. Comprobar visualmente ambos temas y el funcionamiento de las pestañas al aplicar el patrón.

## Estilo común de tablas

El Directorio de Empresas del CRM es la referencia visual. Las tablas HTML con cabecera toman el fondo, la tipografía y el relleno de la cabecera de `frontend/src/index.css`, que también define el resaltado de las filas al pasar el cursor. Cada vista define sus columnas, alineación y comportamiento de desplazamiento según sus datos.

En Ventas vs Presupuestos y Presupuesto x Product Manager, `frontend/src/pages/sales/components/budgetShared.tsx` define las medidas del panel, la barra de controles y el pie de totales. Las dos vistas usan el mismo patrón de pestañas del CRM y sitúan **Exportar XLSX** a la derecha. El botón descarga los datos de la pestaña activa.

Para cambiar una medida o un estilo común, modifica su definición compartida y comprueba el resultado en ambas vistas de presupuestos y en un listado de otro módulo. Cuando se cambie el estilo global de cabeceras, revisa también las tablas de Finanzas con encabezados agrupados.

## Comprobación tras publicar

- En las dos vistas de presupuestos, alterna el detalle y **Por segmentos**. Las cabeceras deben empezar a la misma altura y **Exportar XLSX** debe permanecer arriba a la derecha.
- En **Por Comercial**, alterna las tres subpestañas y comprueba el pie de totales. En **Por segmentos**, selecciona un segmento, combina el filtro con un periodo y compara la tabla con el Excel.
- En CRM, Ventas, Compras, Finanzas y Usuarios, revisa el contraste, los títulos largos, la ordenación y el desplazamiento. La comprobación visual previa a la publicación se realizó en las dos vistas de presupuestos.
