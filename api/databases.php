<?php
// api/databases.php - Listar bases de datos disponibles

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

if (!isset($_SESSION['db_config'])) {
    echo json_encode([
        'success' => false,
        'message' => 'No hay conexión activa'
    ]);
    exit;
}

try {
    $config = $_SESSION['db_config'];
    $dsn = "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);

    // Obtener lista de bases de datos
    $query = "SHOW DATABASES";
    $stmt = $pdo->query($query);
    $databases = [];

    // Bases de datos del sistema que normalmente se excluyen
    $systemDbs = ['information_schema', 'performance_schema', 'mysql', 'sys'];

    while ($row = $stmt->fetch()) {
        $dbName = $row['Database'];
        
        // Filtrar bases de datos del sistema (opcional)
        if (!in_array($dbName, $systemDbs)) {
            $dbInfo = [
                'name' => $dbName,
                'tables' => 0,
                'size' => 'N/A'
            ];

            // Obtener información adicional de cada base de datos
            try {
                // Contar tablas
                $tableQuery = "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = :dbname";
                $tableStmt = $pdo->prepare($tableQuery);
                $tableStmt->execute(['dbname' => $dbName]);
                $tableCount = $tableStmt->fetch()['table_count'];
                $dbInfo['tables'] = $tableCount;

                // Obtener tamaño de la base de datos
                $sizeQuery = "SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb 
                    FROM information_schema.tables 
                    WHERE table_schema = :dbname";
                $sizeStmt = $pdo->prepare($sizeQuery);
                $sizeStmt->execute(['dbname' => $dbName]);
                $size = $sizeStmt->fetch()['size_mb'];
                
                if ($size > 0) {
                    if ($size < 1) {
                        $dbInfo['size'] = number_format($size * 1024, 2) . ' KB';
                    } else {
                        $dbInfo['size'] = $size . ' MB';
                    }
                }

            } catch (Exception $e) {
                // Si hay error obteniendo información adicional, continuar sin ella
                error_log("Error obteniendo info de BD $dbName: " . $e->getMessage());
            }

            $databases[] = $dbInfo;
        }
    }

    // Incluir bases de datos del sistema si se requiere
    if (isset($_GET['include_system']) && $_GET['include_system'] === 'true') {
        foreach ($systemDbs as $systemDb) {
            try {
                $checkQuery = "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = :dbname";
                $checkStmt = $pdo->prepare($checkQuery);
                $checkStmt->execute(['dbname' => $systemDb]);
                
                if ($checkStmt->fetch()) {
                    $databases[] = [
                        'name' => $systemDb,
                        'tables' => 0,
                        'size' => 'Sistema',
                        'system' => true
                    ];
                }
            } catch (Exception $e) {
                // Ignorar errores en bases de datos del sistema
            }
        }
    }

    // Ordenar por nombre
    usort($databases, function($a, $b) {
        return strcmp($a['name'], $b['name']);
    });

    echo json_encode([
        'success' => true,
        'databases' => $databases,
        'total' => count($databases)
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener bases de datos: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
