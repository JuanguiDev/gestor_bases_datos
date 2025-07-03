<?php

header('Content-Type: application/json');   // Respuesta en formato JSON
header('Access-Control-Allow-Origin: *');   // Permite CORS desde cualquier origen
header('Access-Control-Allow-Methods: GET');    // Solo acepta métodos GET
header('Access-Control-Allow-Headers: Content-Type');   // Headers permitidos

session_start();    // Inicia la sesión si no está iniciada

try {
    // Verifica si la sesión contiene la configuración de la base de datos y el estado de conexión
    if (isset($_SESSION['db_config']) && isset($_SESSION['connected']) && $_SESSION['connected']) {
        echo json_encode([
            'success' => true,  // Indica que la verificación fue exitosa
            'connected' => true,    // Indica que la conexión está activa
            'config' => $_SESSION['db_config'], // Devuelve la configuración de la base de datos
            'session_start' => $_SESSION['session_start'] ?? null   // Devuelve el inicio de sesión si está disponible
        ]);
    } else {
        // Si no hay sesión activa o no está conectada
        echo json_encode([
            'success' => true,  // Indica que la verificación fue exitosa
            'connected' => false,   // Indica que no hay conexión activa
            'message' => 'No hay sesión activa' // Mensaje informativo
        ]);
    }
} catch (Exception $e) {
    // Manejo de excepciones en caso de error al verificar la sesión
    echo json_encode([
        'success' => false, // Indica que hubo un error
        'message' => 'Error al verificar sesión: ' . $e->getMessage()   // Mensaje de error con detalles
    ]);
}
?>
