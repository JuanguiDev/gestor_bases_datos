# Gestor de Bases de Datos Múltiples

Una aplicación web moderna para gestionar múltiples bases de datos MySQL/MariaDB desde una interfaz única. Permite ejecutar consultas SQL en múltiples bases de datos simultáneamente con una interfaz intuitiva y moderna.

## 🚀 Características Principales

- **Conexión flexible**: Conecta a cualquier servidor MySQL/MariaDB (local o remoto)
- **Gestión múltiple**: Selecciona y ejecuta consultas en múltiples bases de datos simultáneamente
- **Creación de BD**: Crea nuevas bases de datos con configuración de charset personalizable
- **Consultas predefinidas**: Plantillas para consultas comunes (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, etc.)
- **Resultados detallados**: Visualiza resultados y errores detallados por cada base de datos
- **Manejo avanzado de datos**: Soporte completo para caracteres especiales y encodings UTF-8
- **Interfaz moderna**: Diseño responsive con Bootstrap 5 y FontAwesome
- **Gestión de sesiones**: Mantiene la conexión activa entre recargas de página
- **Confirmaciones de seguridad**: Protecciones especiales para operaciones destructivas como DROP DATABASE

## 📋 Requisitos del Sistema

- **Servidor web**: Apache, Nginx o cualquier servidor compatible con PHP
- **PHP**: Versión 7.4 o superior
- **Extensiones PHP requeridas**:
  - PDO (php_pdo)
  - PDO MySQL (php_pdo_mysql)
  - mbstring (php_mbstring)
  - JSON (php_json)
- **Base de datos**: MySQL 5.7+ o MariaDB 10.2+
- **Navegador**: Cualquier navegador moderno con soporte para ES6

## 🛠️ Instalación

### Instalación en XAMPP (Windows)

1. **Preparar XAMPP**:
   ```bash
   # Asegúrate de que XAMPP esté instalado y ejecutándose
   # Inicia Apache y MySQL desde el panel de control de XAMPP
   ```

2. **Copiar archivos**:
   ```bash
   # Los archivos deben estar en: c:\xampp\htdocs\app_bds\
   # O clonar el repositorio directamente en htdocs
   ```

3. **Verificar configuración PHP**:
   - Edita `c:\xampp\php\php.ini`
   - Asegúrate de que estas extensiones estén habilitadas:
     ```ini
     extension=pdo_mysql
     extension=mbstring
     extension=json
     ```

### Instalación en Linux/Ubuntu

1. **Instalar dependencias**:
   ```bash
   sudo apt update
   sudo apt install apache2 php php-mysql php-mbstring php-json
   sudo systemctl start apache2
   sudo systemctl start mysql
   ```

2. **Copiar archivos**:
   ```bash
   sudo cp -r app_bds /var/www/html/
   sudo chown -R www-data:www-data /var/www/html/app_bds
   ```

## 🎯 Guía de Uso

### 1. Acceso a la Aplicación
```
# Local (XAMPP)
http://localhost/app_bds/

# Servidor remoto
http://tu-servidor.com/app_bds/
```

### 2. Configuración de Conexión

#### Conexión Local (XAMPP)
- **Host**: `localhost` o `127.0.0.1`
- **Usuario**: `root`
- **Contraseña**: (vacía por defecto)
- **Puerto**: `3306`

#### Conexión Remota
- **Host**: IP del servidor o dominio
- **Usuario**: Usuario de MySQL con permisos adecuados
- **Contraseña**: Contraseña del usuario
- **Puerto**: Puerto de MySQL (generalmente 3306)

### 3. Workflow de Trabajo

#### A. Conectar al Servidor
1. Ingresa las credenciales de tu servidor MySQL
2. Haz clic en "Conectar"
3. La aplicación validará la conexión y mostrará el estado

#### B. Seleccionar Bases de Datos
1. Después de conectar, verás todas las bases de datos disponibles
2. Haz clic en las bases de datos que deseas seleccionar (pueden ser múltiples)
3. Usa "Seleccionar Todo" para seleccionar todas simultáneamente
4. La información de selección se muestra en tiempo real

#### C. Ejecutar Consultas
1. **Selecciona el tipo de consulta** del menú desplegable o elige "Personalizada"
2. **Escribe o modifica la consulta** SQL en el área de texto
3. **Haz clic en "Ejecutar en BD Seleccionadas"**
4. **Confirma la ejecución** en el modal de confirmación
5. **Revisa los resultados** individuales por cada base de datos

#### D. Crear Nuevas Bases de Datos
1. Usa el panel "Crear Nueva Base de Datos"
2. Especifica el nombre y charset (UTF8MB4 recomendado para soporte completo Unicode)
3. La nueva base aparecerá automáticamente en la lista

### 4. Funciones de Seguridad

#### Confirmaciones Especiales
- **DROP DATABASE**: Requiere confirmación doble con checkboxes de seguridad
- **Operaciones masivas**: Muestra el número de bases de datos afectadas
- **Validación de consultas**: Previene operaciones en bases de datos del sistema

#### Gestión de Sesiones
- Las conexiones se mantienen activas entre recargas
- Logout seguro que limpia todas las sesiones
- Timeout automático por seguridad

## 📝 Ejemplos de Consultas

### Consultas de Selección
```sql
-- Consulta básica
SELECT * FROM usuarios;

-- Con condiciones
SELECT nombre, email FROM usuarios WHERE activo = 1;

-- Con ordenamiento y límite
SELECT * FROM productos ORDER BY precio DESC LIMIT 10;

-- Con agregaciones
SELECT categoria, COUNT(*) as total, AVG(precio) as precio_promedio 
FROM productos 
GROUP BY categoria;
```

### Consultas de Modificación
```sql
-- Crear tabla
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2),
    categoria_id INT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_categoria (categoria_id),
    INDEX idx_activo (activo)
);

-- Insertar datos
INSERT INTO productos (nombre, descripcion, precio, categoria_id) 
VALUES 
    ('Laptop HP', 'Computadora portátil', 15999.99, 1),
    ('Mouse Inalámbrico', 'Mouse óptico inalámbrico', 299.99, 2);

-- Actualizar registros
UPDATE productos 
SET precio = precio * 0.9 
WHERE categoria_id = 1 AND activo = TRUE;

-- Eliminar registros
DELETE FROM productos WHERE activo = FALSE AND fecha_creacion < '2023-01-01';
```

### Consultas de Estructura
```sql
-- Modificar tabla existente
ALTER TABLE usuarios 
ADD COLUMN telefono VARCHAR(20),
ADD COLUMN fecha_nacimiento DATE,
ADD INDEX idx_telefono (telefono);

-- Crear vista
CREATE VIEW usuarios_activos AS
SELECT id, nombre, email, fecha_creacion
FROM usuarios 
WHERE activo = TRUE;

-- Crear procedimiento almacenado
DELIMITER //
CREATE PROCEDURE ObtenerUsuariosPorCategoria(IN cat_id INT)
BEGIN
    SELECT u.*, c.nombre as categoria
    FROM usuarios u
    JOIN categorias c ON u.categoria_id = c.id
    WHERE u.categoria_id = cat_id;
END //
DELIMITER ;
```

## 🔧 Configuración Avanzada

### Personalización de Límites
El archivo `api/execute_query.php` permite configurar:

```php
// Límites de memoria y tiempo
ini_set('memory_limit', '512M');        // Ajustar según necesidades
ini_set('max_execution_time', 300);     // 5 minutos máximo
```

### Configuración de Conexión
Edita las opciones de PDO en `api/connect.php`:

```php
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
    PDO::ATTR_TIMEOUT => 60,  // Timeout personalizable
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
];
### Personalización de la Interfaz
Modifica `assets/css/style.css` para personalizar:

```css
/* Cambiar colores principales */
:root {
    --primary-color: #007bff;
    --success-color: #28a745;
    --warning-color: #ffc107;
    --danger-color: #dc3545;
}

/* Personalizar tema */
.database-item.selected {
    background: var(--primary-color);
    color: white;
}
```

### Extender Funcionalidades
Agrega nuevas funciones en `assets/js/app.js`:

```javascript
// Ejemplo: Agregar nueva plantilla de consulta
loadQueryTemplates() {
    const templates = {
        // ...plantillas existentes...
        backup: "BACKUP DATABASE TO 'ruta/backup.sql';",
        optimize: "OPTIMIZE TABLE tabla_nombre;",
        repair: "REPAIR TABLE tabla_nombre;"
    };
    this.queryTemplates = templates;
}
```

## 🛡️ Características de Seguridad

### Protecciones Implementadas
- **Validación de entrada**: Todas las consultas se validan antes de ejecutarse
- **Protección de sistemas**: Previene modificaciones a bases de datos del sistema MySQL
- **Confirmaciones dobles**: Operaciones destructivas requieren confirmación explícita
- **Escape de caracteres**: Prevención automática de inyección SQL
- **Gestión de sesiones**: Control seguro de sesiones de usuario
- **Logging de seguridad**: Registro de operaciones críticas como DROP DATABASE

### Configuración de Permisos MySQL
```sql
-- Crear usuario específico para la aplicación
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'password_segura';

-- Otorgar permisos específicos
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX 
ON *.* TO 'app_user'@'localhost';

-- Restringir acceso a bases del sistema
REVOKE ALL ON mysql.* FROM 'app_user'@'localhost';
REVOKE ALL ON information_schema.* FROM 'app_user'@'localhost';
REVOKE ALL ON performance_schema.* FROM 'app_user'@'localhost';

FLUSH PRIVILEGES;
```

### Buenas Prácticas de Seguridad
1. **Usar HTTPS** en producción
2. **Cambiar credenciales** por defecto de MySQL
3. **Restringir acceso** por IP si es necesario
4. **Realizar backups** antes de operaciones destructivas
5. **Monitorear logs** regularmente

### Errores Comunes

#### Error de Conexión
```
Error: No se puede conectar al servidor MySQL
```
**Solución**:
- Verificar que MySQL esté ejecutándose
- Comprobar credenciales
- Revisar puerto y host

#### Error de JSON
```
Unexpected token '<': '...' is not valid JSON
```
**Solución**:
- Revisar logs de error de PHP
- Verificar configuración de `php.ini`
- Usar el archivo de diagnóstico

#### Error de Encoding
```
Error de codificación de datos
```
**Solución**:
- Verificar que las tablas usen UTF-8
- Configurar `utf8mb4` en MySQL
- Revisar datos con caracteres especiales

### Logs y Debugging
```php
// Habilitar logging en desarrollo
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/path/to/error.log');
```

## 📊 Estructura del Proyecto

```
app_bds/
├── index.html                 # Página principal
├── README.md                 # Este archivo
├── api/                      # Backend PHP
│   ├── check_session.php     # Verificación de sesión
│   ├── connect.php           # Conexión a base de datos
│   ├── create_database.php   # Creación de BD
│   ├── databases.php         # Lista de BD disponibles
│   ├── execute_query.php     # Ejecución de consultas
│   └── logout.php           # Cerrar sesión
└── assets/                   # Frontend
    ├── css/
    │   └── style.css         # Estilos personalizados
    └── js/
        └── app.js            # Lógica de la aplicación
```

## 🤝 Contribución

### Cómo Contribuir
1. **Fork** el repositorio
2. **Crea una rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crea un Pull Request**

### Reportar Bugs
Usa el archivo de diagnóstico y proporciona:
- Versión de PHP y MySQL
- Sistema operativo
- Pasos para reproducir el error
- Logs de error relevantes

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

## 📞 Soporte

### Documentación Adicional
- [Manual de MySQL](https://dev.mysql.com/doc/)
- [Documentación de PHP PDO](https://www.php.net/manual/en/book.pdo.php)
- [Bootstrap 5 Docs](https://getbootstrap.com/docs/5.0/)

### Versión
**v2.0.0** - Diciembre 2024
- Soporte para conexiones remotas
- Manejo avanzado de caracteres especiales
- Interfaz mejorada
- Mejor sistema de diagnóstico
- Medidas de seguridad reforzadas

---

Desarrollado con ❤️ para facilitar la gestión de múltiples bases de datos MySQL.

La aplicación incluye medidas de seguridad básicas:
- Validación de consultas peligrosas
- Sanitización de nombres de BD
- Uso de prepared statements
- Filtrado de caracteres especiales

### Recomendaciones adicionales:
- Usa un usuario MySQL con permisos limitados
- No uses esta aplicación en producción sin autenticación
- Implementa HTTPS en entornos públicos
- Realiza copias de seguridad antes de ejecutar consultas masivas

## 🚨 Solución de Problemas

### Error de conexión
- Verifica que MySQL esté ejecutándose
- Confirma usuario y contraseña
- Revisa el puerto (3306 por defecto)

### Permisos insuficientes
```sql
-- Crear usuario con permisos (ejecutar como root)
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON *.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
```

### Consultas lentas
- Revisa índices en las tablas
- Limita resultados con `LIMIT`
- Usa `EXPLAIN` para analizar consultas

## 🔄 Actualizaciones Futuras

Funcionalidades planificadas:
- [ ] Exportar/importar consultas
- [ ] Historial de consultas
- [ ] Backup automático
- [ ] Múltiples conexiones simultáneas
- [ ] Editor SQL con syntax highlighting
- [ ] Gráficos de rendimiento

## 💡 Consejos de Uso

1. **Prueba primero**: Ejecuta consultas en una sola BD antes de aplicarlas a múltiples
2. **Respaldos**: Siempre haz backup antes de consultas que modifiquen datos
3. **Índices**: Crea índices apropiados para consultas frecuentes
4. **Monitoreo**: Revisa los logs de MySQL para detectar problemas

## 🤝 Contribución

Si encuentras bugs o tienes sugerencias:
1. Documenta el problema claramente
2. Incluye pasos para reproducir el error
3. Propón soluciones si es posible

---

**⚠️ Importante**: Esta aplicación está diseñada para entornos de desarrollo local. Para uso en producción, implementa autenticación y medidas de seguridad adicionales.
