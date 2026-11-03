# CRM Clientes: segmentos y potencial

La pestaña consulta una fila por cliente y segmento con facturación de producto o potencialidad guardada. El backend aplica la cartera y los permisos del perfil. La clasificación y las reglas ETM se describen en [facturación por segmentos](2026-11-02-facturacion-segmentos.md).

Los indicadores muestran las filas filtradas y el importe sin clasificar por separado. El detalle Sin segmento muestra ventas del año agrupadas por cliente y producto; familia y estado de potencialidad se desactivan en ese modo. El botón Excel exporta todas las filas filtradas. La ficha de cliente es la vía para editar potencialidad. La tabla presenta desplazamiento automático y fila de totales; las familias sin subsegmentos no se despliegan.

La facturación excluye IVA y líneas de cuentas y resta abonos. Sin clasificar solo se limita por vendedor y cliente, ya que sus líneas no tienen segmento asignable. El cálculo usa la subcategoría y modelo de negocio actuales; sus cambios pueden modificar la clasificación histórica. La potencialidad es anual y la facturación acumulada del año, por lo que no abarcan necesariamente el mismo periodo.

El usuario ha validado parcialmente la presentación durante la iteración. Las pruebas de descarga Excel y conciliación con facturas concretas deben confirmarse en la versión desplegada.
