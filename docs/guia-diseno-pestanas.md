# Patrón de pestañas de la aplicación

Las pestañas nuevas de las vistas de la aplicación deben utilizar el patrón visual del Directorio de Empresas del CRM. La referencia reutilizable está en `frontend/src/components/shared/appTabs.ts`:

- `appTabListClass` define la separación, el ajuste en varias filas y el borde inferior del grupo.
- `appTabClass(activa)` define tamaño, espaciado, forma, colores en temas claro y oscuro, hover y foco del botón.
- `appTabIconClass(activa)` define el color del icono; utilizar iconos de 16 píxeles cuando la pestaña tenga icono.
- La separación vertical entre la barra de pestañas y el contenido siguiente debe coincidir con el Directorio de Empresas: `space-y-3.5` en su contenedor común (14 px con la escala estándar de Tailwind), además del borde y padding propios de `appTabListClass`. No añadir márgenes superiores adicionales al panel que alteren esa separación.

Cada grupo debe conservar sus permisos, navegación y contenido; utilizar botones con `type="button"`, un nombre accesible y los atributos `role="tablist"`, `role="tab"` y `aria-selected` cuando corresponda. El grupo debe adaptarse a pantallas estrechas sin ocultar etiquetas ni impedir el acceso a opciones. Comprobar visualmente ambos temas y el funcionamiento de las pestañas al aplicar el patrón.
