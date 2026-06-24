<?php
/**
 * api_leaderboard.php - API para gestionar el ranking de BLOQUEOS BOLIVIA
 */

require_once '../Hashwar11.2/src/Database.php';

header('Content-Type: application/json');

$db = new Database();
$conn = $db->getConnection();

if (!$conn) {
    echo json_encode(["status" => "error", "message" => "Sin conexión a base de datos."]);
    exit;
}

// Crear tabla si no existe
$sql_create = "CREATE TABLE IF NOT EXISTS leaderboard_rebelion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dinero INT DEFAULT 0,
    tiempo_restante INT DEFAULT 0,
    unidad VARCHAR(50),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;";
$conn->exec($sql_create);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    if (!empty($data->nombre)) {
        $query = "INSERT INTO leaderboard_rebelion (nombre, dinero, tiempo_restante, unidad) VALUES (:nombre, :dinero, :tiempo, :unidad)";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':nombre', $data->nombre);
        $stmt->bindParam(':dinero', $data->dinero);
        $stmt->bindParam(':tiempo', $data->tiempo);
        $stmt->bindParam(':unidad', $data->unidad);
        
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Puntaje guardado."]);
        } else {
            echo json_encode(["status" => "error", "message" => "No se pudo guardar."]);
        }
    }
} else if ($method === 'GET') {
    $query = "SELECT * FROM leaderboard_rebelion ORDER BY tiempo_restante DESC, dinero DESC LIMIT 10";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($results);
}
?>