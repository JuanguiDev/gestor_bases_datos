<?php
// api/execute_query.php - Ejecutar consultas en múltiples bases de datos

// Configurar límites de memoria y tiempo para consultas grandes
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300); // 5 minutos

// Desactivar la visualización de errores en producción y capturarlos
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Asegurar que solo se envíe JSON
ob_start();

header('Content-Type: application/json; charset=utf-8');    // Respuesta en formato JSON
header('Access-Control-Allow-Origin: *');   // Permite CORS desde cualquier origen
header('Access-Control-Allow-Methods: POST');   // Solo acepta métodos POST
header('Access-Control-Allow-Headers: Content-Type');   // Headers permitidos

// Verificar que la solicitud sea POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

session_start();

// Verificar si hay una conexión activa
if (!isset($_SESSION['db_config'])) {
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'message' => 'No hay conexión activa'
    ]);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);   // Obtener datos de entrada en formato JSON
    
    // Validar que los datos de entrada no estén vacíos
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error al decodificar JSON: ' . json_last_error_msg());
    }
    
    // Validar que se reciban los campos necesarios
    if (!$input || !isset($input['query']) || !isset($input['databases'])) {
        throw new Exception('Datos de entrada inválidos. Se requiere "query" y "databases".');
    }

    $query = trim($input['query']); // Consulta SQL a ejecutar
    $databases = $input['databases'];   // Bases de datos seleccionadas

    // Validar que la consulta y las bases de datos no estén vacías
    if (empty($query)) {
        throw new Exception('La consulta SQL es requerida');
    }

    // Validar que se seleccionen bases de datos
    if (empty($databases) || !is_array($databases)) {
        throw new Exception('Debe seleccionar al menos una base de datos');
    }

    $config = $_SESSION['db_config'];   // Obtener configuración de la base de datos desde la sesión
    $results = [];  // Resultados de las consultas

    // Determinar si es una consulta SELECT o no
    $isSelect = preg_match('/^\s*SELECT\s+/i', $query);
    $isDropDatabase = preg_match('/^\s*DROP\s+(DATABASE|SCHEMA)\s+/i', $query);
    
    // Validar consultas peligrosas - Solo bloquear modificaciones a MySQL system tables
    if (preg_match('/\b(TRUNCATE|DELETE|DROP|ALTER|UPDATE)\s+.*?\b(mysql\.|information_schema\.|performance_schema\.|sys\.)/i', $query)) {
        throw new Exception('Las consultas que modifican esquemas del sistema MySQL no están permitidas');
    }
    
    // Validaciones especiales para DROP DATABASE
    if ($isDropDatabase) {
        // Verificar que no sean bases de datos del sistema
        $systemDatabases = ['mysql', 'information_schema', 'performance_schema', 'sys', 'phpmyadmin'];
        
        foreach ($systemDatabases as $sysDb) {
            if (preg_match('/DROP\s+(DATABASE|SCHEMA)\s+(`?' . preg_quote($sysDb, '/') . '`?|' . preg_quote($sysDb, '/') . ')\s*;?/i', $query)) {
                throw new Exception("No se puede eliminar la base de datos del sistema: $sysDb");
            }
        }
        
        // Verificar que se incluya la palabra clave de confirmación
        if (!isset($input['confirm_drop']) || $input['confirm_drop'] !== true) {
            throw new Exception('DROP DATABASE requiere confirmación explícita');
        }
        
        // Log de seguridad para DROP DATABASE
        error_log("DROP DATABASE ejecutado - Query: $query - Bases: " . implode(', ', $databases) . " - IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . " - Timestamp: " . date('Y-m-d H:i:s'));
    }

    foreach ($databases as $database) {
        $result = [
            'database' => $database,
            'success' => false,
            'message' => '',
            'data' => [],
            'affected_rows' => 0
        ];

        try {
            // Validar nombre de base de datos
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $database)) {
                throw new Exception("Nombre de base de datos no válido: $database");
            }
            
            // Conectar a la base de datos específica
            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname=$database;charset=utf8mb4";
            $pdo = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 60,
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]);

            // Ejecutar la consulta
            $stmt = $pdo->prepare($query);
            $stmt->execute();

            $result['success'] = true;

            if ($isSelect) {
                // Para consultas SELECT, obtener todos los datos
                $data = $stmt->fetchAll();
                $totalRows = count($data);
                
                // Limpiar y validar datos para JSON
                $cleanData = [];
                foreach ($data as $row) {
                    $cleanRow = [];
                    foreach ($row as $key => $value) {
                        // Convertir a UTF-8 si es necesario y limpiar caracteres problemáticos
                        if (is_string($value)) {
                            $cleanValue = mb_convert_encoding($value, 'UTF-8', 'auto');
                            $cleanValue = mb_check_encoding($cleanValue, 'UTF-8') ? $cleanValue : utf8_encode($value);
                            // Reemplazar caracteres de control que pueden causar problemas
                            $cleanValue = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $cleanValue);
                        } else {
                            $cleanValue = $value;
                        }
                        $cleanRow[$key] = $cleanValue;
                    }
                    $cleanData[] = $cleanRow;
                }
                
                $result['data'] = $cleanData;
                $result['message'] = "Consulta ejecutada exitosamente. $totalRows filas devueltas.";
                $result['total_rows'] = $totalRows;
                $result['showing_rows'] = $totalRows;
                $result['truncated'] = false;
            } else {
                // Para consultas INSERT, UPDATE, DELETE, etc.
                $affectedRows = $stmt->rowCount();
                $result['affected_rows'] = $affectedRows;
                
                // Obtener el último ID insertado para INSERT
                $lastInsertId = $pdo->lastInsertId();
                if ($lastInsertId) {
                    $result['last_insert_id'] = $lastInsertId;
                }
                
                $result['message'] = 'Consulta ejecutada exitosamente. ' . $affectedRows . ' filas afectadas.';
            }

        } catch (PDOException $e) {
            $result['success'] = false;
            $result['message'] = getErrorMessage($e);
            $result['error_code'] = $e->getCode();
            $result['sql_state'] = $e->errorInfo[0] ?? null;
            
        } catch (Exception $e) {
            $result['success'] = false;
            $result['message'] = $e->getMessage();
        }

        $results[] = $result;
    }

    // Limpiar cualquier salida previa
    $output = ob_get_clean();
    if (!empty($output)) {
        error_log("Output no deseado en execute_query.php: " . $output);
    }

    // Asegurar que se retorne JSON válido
    header('Content-Type: application/json; charset=utf-8');
    
    // Configurar opciones de JSON para manejar mejor los caracteres especiales
    $jsonOptions = JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE;
    $jsonOutput = json_encode($results, $jsonOptions);
    
    // Verificar si la codificación JSON fue exitosa
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Si hay error en JSON, crear una respuesta de error simplificada
        $errorInfo = [
            'success' => false,
            'message' => 'Error al procesar los datos: ' . json_last_error_msg() . '. Algunos caracteres pueden no ser compatibles.',
            'error_type' => 'json_encoding',
            'json_error_code' => json_last_error()
        ];
        
        // Intentar crear una respuesta más simple
        $simpleResults = [];
        foreach ($results as $result) {
            $simpleResult = [
                'database' => $result['database'],
                'success' => $result['success'],
                'message' => $result['message'],
                'total_rows' => $result['total_rows'] ?? 0
            ];
            
            if ($result['success'] && isset($result['data'])) {
                $simpleResult['data_available'] = true;
                $simpleResult['columns'] = !empty($result['data']) ? array_keys($result['data'][0]) : [];
                $simpleResult['row_count'] = count($result['data']);
                $simpleResult['message'] = "Datos disponibles pero contienen caracteres especiales. Consulta ejecutada exitosamente.";
            }
            
            $simpleResults[] = $simpleResult;
        }
        
        $alternativeJson = json_encode($simpleResults, $jsonOptions);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo $alternativeJson;
        } else {
            echo json_encode($errorInfo, $jsonOptions);
        }
    } else {
        echo $jsonOutput;
    }

} catch (Exception $e) {
    // Limpiar cualquier output buffer
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    // Asegurar que se retorne JSON válido incluso en caso de error
    header('Content-Type: application/json; charset=utf-8');
    
    $errorResponse = [
        'success' => false,
        'message' => $e->getMessage(),
        'error_type' => 'general',
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ];
    
    echo json_encode($errorResponse, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Error $e) {
    // Capturar errores fatales de PHP
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json; charset=utf-8');
    
    $errorResponse = [
        'success' => false,
        'message' => 'Error fatal del servidor: ' . $e->getMessage(),
        'error_type' => 'fatal',
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ];
    
    echo json_encode($errorResponse, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
}

function getErrorMessage($e) {
    $code = $e->getCode();
    $message = $e->getMessage();
    
    // Errores comunes de MySQL/MariaDB
    switch ($code) {
        case 1044:
            return 'Acceso denegado a la base de datos. Verifica los permisos del usuario.';
        case 1045:
            return 'Usuario o contraseña incorrectos para la base de datos.';
        case 1049:
            return 'Base de datos no encontrada. Verifica que la base de datos exista.';
        case 1054:
            return 'Columna desconocida en la consulta. Verifica los nombres de las columnas.';
        case 1062:
            return 'Entrada duplicada - violación de clave única. Este valor ya existe.';
        case 1064:
            return 'Error de sintaxis en la consulta SQL. Verifica la sintaxis de tu consulta.';
        case 1146:
            return 'Tabla no encontrada. Verifica que la tabla exista en la base de datos.';
        case 1216:
            return 'No se puede agregar la restricción de clave foránea. Verifica las relaciones.';
        case 1217:
            return 'No se puede eliminar - violación de clave foránea. Hay registros relacionados.';
        case 1364:
            return 'Campo obligatorio sin valor por defecto. Proporciona un valor para todos los campos requeridos.';
        case 1451:
            return 'No se puede eliminar - restricción de clave foránea. Hay registros relacionados.';
        case 1452:
            return 'No se puede agregar o actualizar - restricción de clave foránea. La referencia no existe.';
        case 2002:
            return 'No se puede conectar al servidor MySQL. Verifica que XAMPP esté ejecutándose.';
        case 2003:
            return 'No se puede conectar al servidor MySQL en el puerto especificado.';
        case 2006:
            return 'El servidor MySQL se desconectó. Verifica la conexión.';
        default:
            // Limpiar el mensaje para que sea más legible
            $cleanMessage = str_replace(['SQLSTATE[HY000] [', '] ', 'SQLSTATE[23000] [', 'SQLSTATE[42S02] [', 'SQLSTATE[42000] ['], '', $message);
            return $cleanMessage;
    }
}
?>
