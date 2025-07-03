<?php
// api/create_database.php - Crear nuevas bases de datos

header('Content-Type: application/json');   // Respuesta en formato JSON
header('Access-Control-Allow-Origin: *');   // Permite CORS desde cualquier origen
header('Access-Control-Allow-Methods: POST');   // Solo acepta métodos POST
header('Access-Control-Allow-Headers: Content-Type');   // Headers permitidos

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);    // Método no permitido
    echo json_encode(['success' => false, 'message' => 'Método no permitido']); // Respuesta JSON
    exit;
}

session_start();    // Iniciar sesión para acceder a la configuración de la base de datos

// Verificar si hay una conexión activa
if (!isset($_SESSION['db_config'])) {
    echo json_encode([
        'success' => false, // Indicar fallo
        'message' => 'No hay conexión activa'   // Mensaje de error
    ]);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);   // Obtener datos de entrada en formato JSON
    
    // Validar que los datos de entrada no estén vacíos
    if (!$input || !isset($input['name'])) {
        throw new Exception('Datos de entrada inválidos');
    }

    $dbName = trim($input['name']); // Nombre de la base de datos
    $charset = $input['charset'] ?? 'utf8mb4';  // Conjunto de caracteres por defecto
    $collation = $input['collation'] ?? 'utf8mb4_unicode_ci';   // Intercalación por defecto

    // Validar que el nombre de la base de datos no esté vacío
    if (empty($dbName)) {
        throw new Exception('El nombre de la base de datos es requerido');
    }

    // Validar nombre de base de datos
    if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $dbName)) {
        throw new Exception('El nombre de la base de datos solo puede contener letras, números y guiones bajos, y debe comenzar con una letra');
    }

    // Validar longitud del nombre de la base de datos
    if (strlen($dbName) > 64) {
        throw new Exception('El nombre de la base de datos no puede exceder 64 caracteres');
    }

    // Palabras reservadas que no se pueden usar como nombres de BD
    $reservedWords = ['mysql', 'information_schema', 'performance_schema', 'sys'];
    if (in_array(strtolower($dbName), $reservedWords)) {
        throw new Exception('No se puede usar una palabra reservada como nombre de base de datos');
    }

    $config = $_SESSION['db_config'];   // Obtener configuración de la base de datos desde la sesión
    $dsn = "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4";   // DSN para conexión PDO
    // Crear conexión PDO
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,    // Modo de error para excepciones
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,   // Modo de recuperación por defecto
        PDO::ATTR_EMULATE_PREPARES => false // Desactivar emulación de preparadas
    ]);

    // Verificar si la base de datos ya existe
    $checkQuery = "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = :dbname";
    $checkStmt = $pdo->prepare($checkQuery);
    $checkStmt->execute(['dbname' => $dbName]);
    
    if ($checkStmt->fetch()) {
        throw new Exception("La base de datos '$dbName' ya existe");
    }

    // Crear la base de datos
    $createQuery = "CREATE DATABASE `$dbName` CHARACTER SET $charset COLLATE $collation";
    $pdo->exec($createQuery);

    // Verificar que se creó correctamente
    $verifyStmt = $pdo->prepare($checkQuery);
    $verifyStmt->execute(['dbname' => $dbName]);
    
    // Si no se encontró la base de datos recién creada, lanzar una excepción
    if (!$verifyStmt->fetch()) {
        throw new Exception('Error al verificar la creación de la base de datos');
    }

    // Obtener información de la base de datos recién creada
    $sizeQuery = "SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
        COUNT(*) as table_count
        FROM information_schema.tables 
        WHERE table_schema = :dbname";
    $sizeStmt = $pdo->prepare($sizeQuery);
    $sizeStmt->execute(['dbname' => $dbName]);
    $info = $sizeStmt->fetch();

    // Respuesta exitosa
    echo json_encode([
        'success' => true,  // Indicar éxito
        'message' => "Base de datos '$dbName' creada exitosamente", // Mensaje de éxito
        'database' => [
            'name' => $dbName,  // Nombre de la base de datos
            'charset' => $charset,  // Conjunto de caracteres
            'collation' => $collation,  // Intercalación
            'tables' => $info['table_count'] ?? 0,  // Número de tablas
            'size' => ($info['size_mb'] ?? 0) . ' MB'   // Tamaño en MB
        ]
    ]);

} catch (PDOException $e) {
    $error_message = 'Error al crear la base de datos: ';   // Mensaje de error genérico
    
    switch ($e->getCode()) {
        case 1007:
            $error_message .= 'La base de datos ya existe';
            break;
        case 1044:
            $error_message .= 'Acceso denegado. El usuario no tiene permisos para crear bases de datos';
            break;
        case 1045:
            $error_message .= 'Usuario o contraseña incorrectos';
            break;
        case 1064:
            $error_message .= 'Error de sintaxis en el nombre de la base de datos';
            break;
        default:
            $error_message .= $e->getMessage();
    }

    echo json_encode([
        'success' => false,
        'message' => $error_message,
        'error_code' => $e->getCode()
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
