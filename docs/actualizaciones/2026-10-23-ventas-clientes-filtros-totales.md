# Ventas — Clientes: filtros coordinados y totales

**Fecha:** 23/10/2026  
**Ruta:** `/sales/customers`  
**Estado:** cambios sincronizados a la carpeta local; sin despliegue acreditado.

## Cambios de funcionamiento

- Mapa y selector Territorio comparten selección. El ranking lateral, la tabla y la exportación reciben filtros coherentes de zona y cartera.
- Provincias en español y alias por identidad: Vizcaya/Bizkaia, Gerona/Girona, Lérida/Lleida y equivalentes. Se corrigen también identificadores cartográficos portugueses.
- Carga completa de clientes para el mapa, eliminando el corte de 600 registros. «Todos» ya no limita el ranking a 500; los marcadores conservan su límite visual de 100.
- Pie fijo con clientes filtrados, ventas anuales 2023–2026 y acumulado. Suma toda la selección, no solamente las filas cargadas. Conserva negativos, columnas configurables y estilos claro/oscuro.
- Retirada de las cuatro tarjetas superiores y de sus componentes de carga. La vista comienza con el mapa.

## Cálculo y límites

`getCustomerTableTotals` reutiliza la cartera completa del mapa y aplica la zona activa. No añade consultas; ignora comodines con prefijo `999999`. El acumulado comprende los cuatro ejercicios mostrados. Margen, días y campos descriptivos no se suman. El Top del ranking no modifica los totales. El pie visual no se añade como fila al Excel.

Los estados «Calculando…» y «No se pudieron calcular» evitan confundir una consulta pendiente o fallida con cero clientes. Los datos importados desde BC se mantienen de solo lectura, sin cambios SQL, de permisos o de estructura.

## Validación y aceptación

**Verificado:** 19 pruebas backend de clasificación y filtros; comprobación frontend de 70 zonas y carga de 2.005 clientes; regresión de totales por zona, cartera completa, abonos, alternativas y cartera vacía. Compilaciones frontend/backend correctas en la entrega de filtros y frontend correcta tras los cambios visuales. La lectura real en transacción de solo lectura devolvió los mismos 31 clientes de Vizcaya por clasificación del mapa y consultas `ES-48`/Vizcaya. Es una muestra de una cartera y un momento, no una cifra fija para todos los usuarios.

**Pendiente de aceptación visual tras recargar la app local:**

1. Seleccionar Vizcaya en el mapa y después desde Territorio; contrastar empresas del ranking en «Todos» y tabla con los mismos filtros.
2. Combinar vendedor, búsqueda, tipo, mercado, modelo de negocio, condiciones de pago y portes; quitar la zona y restablecer filtros.
3. Desplazar la tabla y comprobar que el pie sigue visible y sus importes no dependen de las páginas cargadas.
4. Ocultar/mostrar columnas, comprobar modos claro y oscuro, cartera vacía y carga de una selección nueva.
5. Confirmar ausencia de las tarjetas superiores y exportación de los registros filtrados.

No se declara aceptación visual ni publicación en producción.

## Documentación relacionada

- [Ficha de la vista](../vistas/02_ventas/ventas_clientes.md).
- [Manual general de usuario](../manual-usuario.md), capítulo 2.1 y guía de filtros y totales.
- [Definiciones de cálculo](../kpi-definitions.md) y [documentación técnica](../Calculos_Tecnicos.md).

El manual específico de CRM–Clientes y Contactos conserva su alcance: estos cambios corresponden a Ventas–Clientes y no requieren regenerar su PDF.
