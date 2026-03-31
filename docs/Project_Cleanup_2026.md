# Registro de Limpieza de Directorios - 31/03/2026

Este documento registra los archivos eliminados durante la limpieza del proyecto para mantener solo el código de producción y configuración necesaria.

## Archivos Eliminados

### Raíz del Proyecto
- `data_row.txt`
- `final_headers.txt`
- `headers_all.txt`
- `read_xlsx.js`
- `tmp_headers.csv`

### Backend
- `accounts_map.json`
- `check_docs.js`
- `check_indices.js`
- `check_owner.js`
- `check_perms.js`
- `check_privs.js`
- `create_customers.js`
- `create_indices.js`
- `migrate_owned.js`
- `migrate_renames.js`
- `rename_column.js`
- `rename_column_env.js`
- `rename_column_prisma.js`
- `tmp_indices.json`

### Temporales (tmp/)
- `tmp/check_db.js`
- `tmp/clientes.xlsx`
- `tmp/init.sql`

## Motivo de la Limpieza
Eliminación de scripts de scratch, archivos de datos intermedios y herramientas de migración de un solo uso para mejorar la mantenibilidad del repositorio.
