<?php
// api/logout.php - Cerrar sesión

header('Content-Type: application/json');   // Establecer el tipo de contenido a JSON
header('Access-Control-Allow-Origin: *');   // Permitir solicitudes desde cualquier origen
header('Access-Control-Allow-Methods: POST');   // Permitir solo el método POST
header('Access-Control-Allow-Headers: Content-Type');   // Permitir encabezados específicos

// Verificar si la solicitud es POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

session_start();

try {
    // Limpiar todas las variables de sesión
    $_SESSION = array();
    
    // Destruir la cookie de sesión si existe
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time()-3600, '/');
    }
    
    // Destruir la sesión
    session_destroy();
    
    echo json_encode([
        'success' => true,
        'message' => 'Sesión cerrada correctamente'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al cerrar sesión: ' . $e->getMessage()
    ]);
}
?>
