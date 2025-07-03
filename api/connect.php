<?php

header('Content-Type: application/json');   // Respuesta en formato JSON
header('Access-Control-Allow-Origin: *');   // Permite CORS desde cualquier origen
header('Access-Control-Allow-Methods: POST');   // Solo acepta métodos POST
header('Access-Control-Allow-Headers: Content-Type');   // Headers permitidos

// api/connect.php - Conectar a la base de datos MySQL
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);    // Método no permitido
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Obtener datos de entrada en formato JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validar que los datos de entrada no estén vacíos
    if (!$input) {
        throw new Exception('Datos de entrada inválidos');
    }

    $host = $input['host'] ?? 'localhost';  // Host por defecto para XAMPP local
    $username = $input['username'] ?? 'root';   // Usuario por defecto para XAMPP local
    $password = $input['password'] ?? '';   // Contraseña por defecto para XAMPP local
    $port = $input['port'] ?? 3306; // Puerto por defecto para MySQL

    // Construir DSN simple para XAMPP local
    $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
    
    // Crear conexión PDO
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ];

    $pdo = new PDO($dsn, $username, $password, $options);   // Crear conexión PDO

    // Guardar configuración en sesión
    session_start();
    $_SESSION['db_config'] = [
        'host' => $host,    // Guardar host
        'username' => $username,    // Guardar usuario
        'password' => $password,    // Guardar contraseña
        'port' => $port // Guardar puerto
    ];
    $_SESSION['connected'] = true;  // Marcar como conectado
    $_SESSION['session_start'] = time();    // Guardar tiempo de inicio de sesión

    // Obtener información del servidor
    $version = $pdo->query("SELECT VERSION() as version")->fetch()['version']; 
    
    echo json_encode([
        'success' => true,  // Indicar éxito
        'message' => 'Conexión exitosa',    // Mensaje de éxito
        'server_info' => [
            'version' => $version,  // Versión del servidor
            'host' => $host,    // Host del servidor
            'port' => $port // Puerto del servidor
        ]
    ]);

} catch (PDOException $e) {
    $error_message = 'Error de conexión: '; // Mensaje de error genérico
    
    switch ($e->getCode()) {
        case 1045:
            $error_message .= 'Usuario o contraseña incorrectos';   // Error de autenticación
            break;
        case 2002:
            $error_message .= 'No se puede conectar al servidor';   // Error de conexión al servidor
            break;
        case 1049:
            $error_message .= 'Base de datos no encontrada';    // Error de base de datos no encontrada
            break;
        default:
            $error_message .= $e->getMessage();   // Mensaje de error genérico
    }

    echo json_encode([
        'success' => false, // Indicar fallo
        'message' => $error_message,    // Mensaje de error
        'error_code' => $e->getCode()   // Código de error específico
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false, // Indicar fallo
        'message' => $e->getMessage()   // Mensaje de error genérico
    ]);
}
?>
