// Gestor de Bases de Datos Múltiples - JavaScript Principal

/**
 * Clase principal para gestionar conexiones y operaciones con bases de datos múltiples
 * Permite conectar a un servidor MySQL/MariaDB y realizar operaciones en múltiples bases de datos
 */
class DatabaseManager {
    /**
     * Constructor de la clase DatabaseManager
     * Inicializa las propiedades principales y ejecuta la configuración inicial
     */
    constructor() {
        this.isConnected = false;           // Estado de conexión actual
        this.connectionConfig = null;       // Configuración de conexión almacenada
        this.databases = [];                // Array de bases de datos disponibles
        this.selectedDatabases = new Set(); // Set de bases de datos seleccionadas
        this.init();                        // Inicialización de la aplicación
    }

    /**
     * Método de inicialización principal
     * Configura eventos, plantillas de consultas y verifica sesiones activas
     */
    init() {
        this.bindEvents();        // Vincula eventos del DOM
        this.loadQueryTemplates(); // Carga plantillas de consultas SQL
        this.checkSession();      // Verifica si hay una sesión activa
    }

    /**
     * Vincula todos los eventos del DOM necesarios para la aplicación
     * Incluye eventos para formularios, botones y elementos interactivos
     */
    bindEvents() {
        // Eventos de conexión - Maneja el formulario de conexión al servidor
        document.getElementById('connectionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.connect();
        });

        // Eventos de creación de BD - Maneja el formulario de creación de nuevas bases de datos
        document.getElementById('createDbForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createDatabase();
        });

        // Eventos de consulta - Botón para ejecutar consultas SQL
        document.getElementById('executeQuery').addEventListener('click', () => {
            this.executeQuery();
        });

        // Limpiar área de consultas
        document.getElementById('clearQuery').addEventListener('click', () => {
            this.clearQuery();
        });

        // Cambio de tipo de consulta - Carga plantillas predefinidas
        document.getElementById('queryType').addEventListener('change', (e) => {
            this.loadQueryTemplate(e.target.value);
        });

        // Evento de confirmación - Confirma la ejecución de consultas
        document.getElementById('confirmExecute').addEventListener('click', () => {
            this.confirmExecuteQuery();
        });

        // Eventos adicionales para funcionalidad extra
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
    }

    /**
     * Establece conexión con el servidor de base de datos
     * Valida los datos de entrada y maneja la respuesta del servidor
     */
    async connect() {
        // Obtener datos del formulario de conexión
        const host = document.getElementById('host').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const port = document.getElementById('port').value;

        // Validar que los campos obligatorios no estén vacíos
        if (!host.trim() || !username.trim()) {
            this.showAlert('Host y usuario son requeridos', 'warning');
            return;
        }

        // Almacenar configuración de conexión
        this.connectionConfig = { 
            host, 
            username, 
            password, 
            port: parseInt(port)
        };

        // Mostrar indicadores de estado durante la conexión
        this.showLoading('Conectando a XAMPP local...');
        this.updateConnectionBadge('connecting', 'Conectando...');

        try {
            console.log('Enviando petición de conexión...'); // Debug
            
            // Realizar petición de conexión al servidor
            const response = await fetch('api/connect.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.connectionConfig)
            });

            console.log('Respuesta recibida:', response.status, response.statusText); // Debug
            
            // Verificar si la respuesta es JSON válido
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('Respuesta no es JSON:', textResponse); // Debug
                throw new Error('El servidor devolvió HTML en lugar de JSON. Revisa la consola del navegador.');
            }

            const result = await response.json();
            console.log('Datos JSON recibidos:', result); // Debug

            // Procesar respuesta exitosa
            if (result.success) {
                this.isConnected = true;
                this.showConnectionStatus(true, 'Conexión exitosa a XAMPP');
                this.showSessionInfo(this.connectionConfig);
                this.updateConnectionBadge('connected', `Conectado a XAMPP Local`);
                this.loadDatabases();           // Cargar bases de datos disponibles
                this.showCreateDbPanel();       // Mostrar panel de creación de BD
                this.showNotification('Conectado exitosamente a XAMPP', 'success');
            } else {
                // Manejar errores de conexión
                this.showConnectionStatus(false, result.message || 'Error de conexión');
                this.updateConnectionBadge('disconnected', 'Error de conexión');
            }
        } catch (error) {
            console.error('Error completo:', error); // Debug
            this.showConnectionStatus(false, 'Error al conectar: ' + error.message);
            this.updateConnectionBadge('disconnected', 'Error de conexión');
        }
    }

    /**
     * Carga la lista de bases de datos disponibles en el servidor
     * Actualiza la interfaz con las bases de datos encontradas
     */
    async loadDatabases() {
        try {
            const response = await fetch('api/databases.php');
            const result = await response.json();

            if (result.success) {
                this.databases = result.databases;
                this.renderDatabases();     // Renderizar bases de datos en la interfaz
                this.showQueryPanel();      // Mostrar panel de consultas
            } else {
                this.showAlert('Error al cargar bases de datos: ' + result.message, 'danger');
            }
        } catch (error) {
            this.showAlert('Error al cargar bases de datos: ' + error.message, 'danger');
        }
    }

    /**
     * Renderiza las bases de datos en la interfaz de usuario
     * Muestra información detallada de cada base de datos y permite selección múltiple
     */
    renderDatabases() {
        const container = document.getElementById('databasesContainer');
        
        // Mostrar mensaje si no hay bases de datos
        if (this.databases.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-database fa-3x mb-3"></i>
                    <p>No se encontraron bases de datos</p>
                </div>
            `;
            return;
        }

        // Construir HTML para mostrar bases de datos
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">
                    <i class="fas fa-database me-2"></i>
                    Bases de Datos Disponibles
                    <span class="database-count">${this.databases.length}</span>
                </h6>
                <button class="select-all-btn" onclick="dbManager.toggleSelectAll()">
                    <i class="fas fa-check-double me-1"></i>
                    ${this.selectedDatabases.size === this.databases.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                </button>
            </div>
            <div class="row">
        `;

        // Generar elemento HTML para cada base de datos
        this.databases.forEach(db => {
            const isSelected = this.selectedDatabases.has(db.name);
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="database-item ${isSelected ? 'selected' : ''}" 
                         onclick="dbManager.toggleDatabase('${db.name}')">
                        <div class="select-checkbox">
                            ${isSelected ? '<i class="fas fa-check"></i>' : ''}
                        </div>
                        <div class="database-name">
                            <i class="fas fa-database me-2"></i>
                            ${db.name}
                        </div>
                        <div class="database-info">
                            <small>
                                <i class="fas fa-table me-1"></i>
                                ${db.tables || 0} tablas
                                <br>
                                <i class="fas fa-weight me-1"></i>
                                ${db.size || 'N/A'}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
        this.updateSelectedDbsDisplay(); // Actualizar display de bases seleccionadas
    }

    /**
     * Alterna la selección de una base de datos específica
     * @param {string} dbName - Nombre de la base de datos a alternar
     */
    toggleDatabase(dbName) {
        if (this.selectedDatabases.has(dbName)) {
            this.selectedDatabases.delete(dbName);
        } else {
            this.selectedDatabases.add(dbName);
        }
        this.renderDatabases();
    }

    /**
     * Alterna la selección de todas las bases de datos
     * Si todas están seleccionadas, las deselecciona; si no, las selecciona todas
     */
    toggleSelectAll() {
        if (this.selectedDatabases.size === this.databases.length) {
            this.selectedDatabases.clear();
        } else {
            this.selectedDatabases.clear();
            this.databases.forEach(db => this.selectedDatabases.add(db.name));
        }
        this.renderDatabases();
    }

    /**
     * Actualiza la visualización de bases de datos seleccionadas
     * Muestra información detallada sobre las bases seleccionadas
     */
    updateSelectedDbsDisplay() {
        const display = document.getElementById('selectedDbsDisplay');
        
        if (this.selectedDatabases.size === 0) {
            display.innerHTML = '<span class="text-muted">Ninguna base seleccionada</span>';
        } else {
            const selectedList = Array.from(this.selectedDatabases).join(', ');
            display.innerHTML = `
                <span class="text-success">
                    <i class="fas fa-check-circle me-1"></i>
                    ${this.selectedDatabases.size} BD seleccionada${this.selectedDatabases.size > 1 ? 's' : ''}:
                </span>
                <br>
                <small class="text-dark"><strong>${selectedList}</strong></small>
                <br>
                <small class="text-muted">
                    ${this.selectedDatabases.size > 1 ? 
                        `La consulta se ejecutará en ${this.selectedDatabases.size} bases de datos simultáneamente` : 
                        'La consulta se ejecutará en esta base de datos'
                    }
                </small>
            `;
        }
    }

    /**
     * Crea una nueva base de datos en el servidor
     * Valida los datos y maneja la respuesta del servidor
     */
    async createDatabase() {
        const dbName = document.getElementById('newDbName').value;
        const charset = document.getElementById('charset').value;

        // Validar que el nombre no esté vacío
        if (!dbName.trim()) {
            this.showAlert('El nombre de la base de datos es requerido', 'warning');
            return;
        }

        try {
            // Enviar petición de creación al servidor
            const response = await fetch('api/create_database.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: dbName, charset })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(`Base de datos "${dbName}" creada exitosamente`, 'success');
                document.getElementById('newDbName').value = '';
                
                // Actualizar automáticamente la lista de bases de datos
                this.showNotification('Base de datos creada. Actualizando lista...', 'info', true);
                setTimeout(async () => {
                    await this.refreshData();
                }, 1000);
            } else {
                this.showAlert('Error al crear la base de datos: ' + result.message, 'danger');
            }
        } catch (error) {
            this.showAlert('Error al crear la base de datos: ' + error.message, 'danger');
        }
    }

    /**
     * Ejecuta una consulta SQL en las bases de datos seleccionadas
     * Valida la entrada y determina el tipo de confirmación necesaria
     */
    executeQuery() {
        const query = document.getElementById('sqlQuery').value.trim();
        
        // Validar que la consulta no esté vacía
        if (!query) {
            this.showAlert('La consulta SQL es requerida', 'warning');
            return;
        }

        // Validar que haya bases de datos seleccionadas
        if (this.selectedDatabases.size === 0) {
            this.showAlert('Debe seleccionar al menos una base de datos', 'warning');
            return;
        }

        // Verificar si es una consulta DROP DATABASE (operación destructiva)
        const isDropDatabase = /^\s*DROP\s+(DATABASE|SCHEMA)\s+/i.test(query);
        
        if (isDropDatabase) {
            this.showDropDatabaseConfirmation(query);
        } else {
            this.showRegularConfirmation(query);
        }
    }

    /**
     * Muestra un modal de confirmación para consultas regulares
     * @param {string} query - La consulta SQL a ejecutar
     */
    showRegularConfirmation(query) {
        // Modal de confirmación regular
        const message = `¿Está seguro de ejecutar la siguiente consulta en ${this.selectedDatabases.size} base(s) de datos?<br><br><code>${query}</code>`;
        document.getElementById('confirmMessage').innerHTML = message;
        
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        modal.show();
    }

    /**
     * Muestra un modal de confirmación especial para operaciones DROP DATABASE
     * Incluye advertencias adicionales y checkboxes de confirmación
     * @param {string} query - La consulta DROP DATABASE a ejecutar
     */
    showDropDatabaseConfirmation(query) {
        // Modal de confirmación especial para DROP DATABASE
        const selectedDbList = Array.from(this.selectedDatabases).join(', ');
        const message = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>¡ATENCIÓN! Esta es una operación DESTRUCTIVA e IRREVERSIBLE</strong>
            </div>
            <p><strong>Consulta a ejecutar:</strong></p>
            <code class="bg-danger text-white p-2 d-block rounded">${query}</code>
            <p class="mt-3"><strong>Se ejecutará en ${this.selectedDatabases.size} base(s) de datos:</strong></p>
            <div class="bg-warning p-2 rounded"><strong>${selectedDbList}</strong></div>
            <div class="mt-3">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="confirmDropCheck" required>
                    <label class="form-check-label text-danger" for="confirmDropCheck">
                        <strong>Entiendo que esta acción ELIMINARÁ completamente la(s) base(s) de datos y NO se puede deshacer</strong>
                    </label>
                </div>
                <div class="form-check mt-2">
                    <input class="form-check-input" type="checkbox" id="confirmBackupCheck" required>
                    <label class="form-check-label text-warning" for="confirmBackupCheck">
                        <strong>Confirmo que he realizado un backup si es necesario</strong>
                    </label>
                </div>
            </div>
        `;
        
        document.getElementById('confirmMessage').innerHTML = message;
        
        // Cambiar el botón de confirmación para operaciones destructivas
        const confirmBtn = document.getElementById('confirmExecute');
        confirmBtn.textContent = 'SÍ, ELIMINAR BASE(S) DE DATOS';
        confirmBtn.className = 'btn btn-danger';
        
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        modal.show();
        
        // Función para actualizar el estado del botón según los checkboxes
        const updateButtonState = () => {
            const check1 = document.getElementById('confirmDropCheck');
            const check2 = document.getElementById('confirmBackupCheck');
            confirmBtn.disabled = !(check1?.checked && check2?.checked);
        };
        
        // Agregar listeners después de que el modal esté visible
        modal._element.addEventListener('shown.bs.modal', () => {
            const check1 = document.getElementById('confirmDropCheck');
            const check2 = document.getElementById('confirmBackupCheck');
            
            if (check1 && check2) {
                check1.addEventListener('change', updateButtonState);
                check2.addEventListener('change', updateButtonState);
                updateButtonState(); // Estado inicial
            }
        });
        
        // Restaurar botón cuando se cierre el modal
        modal._element.addEventListener('hidden.bs.modal', () => {
            confirmBtn.textContent = 'Confirmar';
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.disabled = false;
        });
    }

    /**
     * Confirma y ejecuta la consulta SQL después de la confirmación del usuario
     * Maneja tanto consultas regulares como operaciones DROP DATABASE
     */
    async confirmExecuteQuery() {
        const query = document.getElementById('sqlQuery').value.trim();
        const selectedDbs = Array.from(this.selectedDatabases);
        const isDropDatabase = /^\s*DROP\s+(DATABASE|SCHEMA)\s+/i.test(query);

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
        modal.hide();

        this.showLoading('Ejecutando consulta...');

        try {
            const requestBody = {
                query: query,
                databases: selectedDbs
            };
            
            // Agregar confirmación especial para DROP DATABASE
            if (isDropDatabase) {
                requestBody.confirm_drop = true;
            }

            // Enviar consulta al servidor
            const response = await fetch('api/execute_query.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            // Verificar si la respuesta es JSON válido
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('Respuesta no es JSON:', textResponse);
                
                // Mostrar una parte del HTML para debugging
                const preview = textResponse.substring(0, 200);
                this.showAlert(`El servidor devolvió HTML en lugar de JSON. Posible error de PHP:<br><br><small><code>${preview}...</code></small>`, 'danger');
                return;
            }

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('Error al parsear JSON:', jsonError);
                const textResponse = await response.text();
                console.error('Respuesta del servidor:', textResponse);
                
                // Mostrar una parte del contenido para debugging
                const preview = textResponse.substring(0, 200);
                this.showAlert(`Error al procesar la respuesta del servidor. El servidor devolvió:<br><br><small><code>${preview}...</code></small><br><br>Revisa la consola para más detalles.`, 'danger');
                return;
            }
            
            // Verificar si hubo error en la decodificación JSON
            if (!result) {
                throw new Error('Error al procesar la respuesta del servidor.');
            }
            
            // Procesar los resultados según su tipo
            if (Array.isArray(result)) {
                this.displayResults(result);
            } else if (result.success === false) {
                // Error general del servidor
                if (result.error_type === 'json_encoding') {
                    this.showAlert(`Error de codificación de datos: ${result.message}`, 'warning');
                } else {
                    this.showAlert('Error del servidor: ' + result.message, 'danger');
                }
                return;
            } else {
                // Resultado único, convertirlo a array
                this.displayResults([result]);
            }
            
            // Actualizar automáticamente después de ejecutar consultas
            if (isDropDatabase) {
                // Para DROP DATABASE, actualizar inmediatamente sin delay
                this.showNotification('Base(s) de datos eliminada(s). Actualizando lista...', 'warning', true);
                await this.refreshData();
            } else {
                this.showNotification('Consulta ejecutada. Actualizando datos...', 'info', true);
                setTimeout(async () => {
                    await this.refreshData();
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error completo:', error);
            this.showAlert('Error al ejecutar la consulta: ' + error.message, 'danger');
        }
    }

    /**
     * Muestra los resultados de las consultas SQL ejecutadas
     * Renderiza tablas y maneja diferentes tipos de resultados
     * @param {Array} results - Array de resultados de las consultas
     */
    displayResults(results) {
        const container = document.getElementById('resultsContainer');
        let html = '';

        if (results.length === 0) {
            html = '<div class="text-center text-muted py-4">No hay resultados para mostrar</div>';
        } else {
            // Procesar cada resultado individual
            results.forEach(result => {
                const statusClass = result.success ? 'success' : 'error';
                const statusIcon = result.success ? 'fas fa-check-circle' : 'fas fa-times-circle';
                const statusText = result.success ? 'Exitoso' : 'Error';

                html += `
                    <div class="query-result ${statusClass}">
                        <h6>
                            <i class="fas fa-database me-2"></i>
                            ${result.database}
                            <span class="badge bg-${result.success ? 'success' : 'danger'} ms-2">
                                <i class="${statusIcon} me-1"></i>
                                ${statusText}
                            </span>
                        </h6>
                `;

                if (result.success) {
                    if (result.data && result.data.length > 0) {
                        // Mostrar tabla con resultados
                        html += this.renderResultTable(result.data);
                    } else if (result.data_available) {
                        // Caso especial: hay datos pero no se pudieron mostrar por problemas de encoding
                        html += `
                            <div class="alert alert-warning mb-0">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                <strong>Datos disponibles:</strong> ${result.row_count} filas encontradas.<br>
                                <strong>Columnas:</strong> ${result.columns ? result.columns.join(', ') : 'N/A'}<br>
                                <small>${result.message}</small>
                            </div>
                        `;
                    } else {
                        // Consulta ejecutada sin datos de retorno
                        html += `
                            <div class="alert alert-info mb-0">
                                <i class="fas fa-info-circle me-2"></i>
                                Consulta ejecutada correctamente. 
                                ${result.affected_rows ? `Filas afectadas: ${result.affected_rows}` : ''}
                                ${result.last_insert_id ? `ID insertado: ${result.last_insert_id}` : ''}
                            </div>
                        `;
                    }
                } else {
                    // Mostrar errores
                    html += `
                        <div class="alert alert-danger mb-0">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Error:</strong> ${result.message}
                        </div>
                    `;
                }

                html += '</div>';
            });
        }

        container.innerHTML = html;
        document.getElementById('resultsPanel').style.display = 'block';

        // Scroll hacia los resultados
        document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Renderiza una tabla HTML con los datos de resultados
     * @param {Array} data - Array de objetos con los datos a mostrar
     * @returns {string} HTML de la tabla renderizada
     */
    renderResultTable(data) {
        if (!data || data.length === 0) return '';

        const columns = Object.keys(data[0]);
        let html = `
            <div class="result-table">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
        `;

        // Generar encabezados de columnas
        columns.forEach(column => {
            html += `<th>${column}</th>`;
        });

        html += '</tr></thead><tbody>';

        // Generar filas de datos
        data.forEach(row => {
            html += '<tr>';
            columns.forEach(column => {
                let cellValue = row[column];
                // Manejar valores null, undefined o problemáticos
                if (cellValue === null || cellValue === undefined) {
                    cellValue = '<span class="text-muted">NULL</span>';
                } else if (typeof cellValue === 'string') {
                    // Escapar HTML y manejar caracteres especiales
                    cellValue = cellValue.replace(/&/g, '&amp;')
                                      .replace(/</g, '&lt;')
                                      .replace(/>/g, '&gt;')
                                      .replace(/"/g, '&quot;')
                                      .replace(/'/g, '&#39;');
                    
                    // Truncar texto muy largo
                    if (cellValue.length > 100) {
                        cellValue = cellValue.substring(0, 100) + '...';
                    }
                } else {
                    cellValue = String(cellValue);
                }
                html += `<td>${cellValue}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';

        return html;
    }

    /**
     * Carga las plantillas de consultas SQL predefinidas
     * Define consultas comunes para facilitar el trabajo del usuario
     */
    loadQueryTemplates() {
        const templates = {
            select: "SELECT * FROM tabla_nombre WHERE condicion = 'valor';",
            insert: "INSERT INTO tabla_nombre (columna1, columna2) VALUES ('valor1', 'valor2');",
            update: "UPDATE tabla_nombre SET columna1 = 'nuevo_valor' WHERE condicion = 'valor';",
            delete: "DELETE FROM tabla_nombre WHERE condicion = 'valor';",
            create: `CREATE TABLE nueva_tabla (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
            alter: "ALTER TABLE tabla_nombre ADD COLUMN nueva_columna VARCHAR(255);",
            drop: "DROP TABLE tabla_nombre;",
            dropdatabase: "DROP DATABASE nombre_base_datos;",
            custom: ""
        };

        this.queryTemplates = templates;
    }

    /**
     * Carga una plantilla de consulta específica en el área de texto
     * @param {string} type - Tipo de plantilla a cargar
     */
    loadQueryTemplate(type) {
        const textarea = document.getElementById('sqlQuery');
        if (this.queryTemplates[type]) {
            textarea.value = this.queryTemplates[type];
        }
    }

    /**
     * Limpia el área de consultas y oculta los resultados
     */
    clearQuery() {
        document.getElementById('sqlQuery').value = '';
        document.getElementById('resultsPanel').style.display = 'none';
    }

    /**
     * Muestra el estado de conexión en la interfaz
     * @param {boolean} connected - Estado de conexión
     * @param {string} message - Mensaje a mostrar
     */
    showConnectionStatus(connected, message) {
        const statusDiv = document.getElementById('connectionStatus');
        const statusClass = connected ? 'status-connected' : 'status-disconnected';
        const statusIcon = connected ? 'fas fa-check-circle' : 'fas fa-times-circle';
        
        statusDiv.innerHTML = `
            <div class="alert alert-${connected ? 'success' : 'danger'} mb-0">
                <i class="${statusIcon} me-2"></i>
                ${message}
            </div>
        `;

        // Mostrar información adicional si está conectado
        if (connected) {
            statusDiv.innerHTML += `
                <div class="connection-info mt-2">
                    <i class="fas fa-server me-2"></i>
                    Servidor: ${this.connectionConfig.host}:${this.connectionConfig.port}
                    <br>
                    <i class="fas fa-user me-2"></i>
                    Usuario: ${this.connectionConfig.username}
                </div>
            `;
        }
    }

    /**
     * Actualiza el indicador de estado de conexión en la barra superior
     * @param {string} status - Estado de conexión ('connected', 'connecting', 'disconnected')
     * @param {string} text - Texto a mostrar en el indicador
     */
    updateConnectionBadge(status, text) {
        const badge = document.getElementById('connectionBadge');
        const badgeText = document.getElementById('connectionBadgeText');
        
        if (!badge || !badgeText) return;
        
        badge.style.display = 'block';
        badgeText.textContent = text;
        
        // Remover clases anteriores
        badge.classList.remove('disconnected', 'connecting');
        
        // Agregar clase según el estado
        if (status === 'connected') {
            badge.classList.add('connected');
        } else if (status === 'connecting') {
            badge.classList.add('connecting');
        } else {
            badge.classList.add('disconnected');
        }
    }

    /**
     * Oculta el indicador de estado de conexión
     */
    hideConnectionBadge() {
        const badge = document.getElementById('connectionBadge');
        if (badge) badge.style.display = 'none';
    }

    /**
     * Muestra el panel de creación de bases de datos
     */
    showCreateDbPanel() {
        document.getElementById('createDbPanel').style.display = 'block';
    }

    /**
     * Muestra el panel de consultas SQL
     */
    showQueryPanel() {
        document.getElementById('queryPanel').style.display = 'block';
    }

    /**
     * Muestra un indicador de carga
     * @param {string} message - Mensaje de carga a mostrar
     */
    showLoading(message) {
        // Aquí puedes implementar un indicador de carga
        console.log('Loading:', message);
    }

    /**
     * Muestra una alerta temporal en la interfaz
     * @param {string} message - Mensaje de la alerta
     * @param {string} type - Tipo de alerta ('info', 'success', 'warning', 'danger')
     */
    showAlert(message, type = 'info') {
        // Crear alerta temporal
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    /**
     * Verifica si hay una sesión activa al cargar la página
     * Restaura automáticamente la conexión si existe una sesión válida
     */
    async checkSession() {
        try {
            const response = await fetch('api/check_session.php');
            const result = await response.json();
            
            if (result.success && result.connected) {
                this.isConnected = true;
                this.connectionConfig = result.config;
                this.showSessionInfo(result.config);
                this.updateConnectionBadge('connected', `Conectado a ${result.config.host}:${result.config.port}`);
                this.showNotification('Sesión restaurada automáticamente', 'success');
                await this.loadDatabases();
                this.showCreateDbPanel();
            } else {
                this.updateConnectionBadge('disconnected', 'Desconectado');
            }
        } catch (error) {
            console.log('No hay sesión activa previa');
        }
    }

    /**
     * Actualiza los datos sin cerrar la sesión
     * Recarga las bases de datos y actualiza la interfaz
     */
    async refreshData() {
        if (!this.isConnected) {
            this.showNotification('No hay conexión activa', 'warning');
            return;
        }

        this.showNotification('Actualizando datos...', 'info', true);
        
        try {
            // Recargar lista de bases de datos
            await this.loadDatabases();
            
            // Actualizar información de las bases seleccionadas
            this.updateSelectedDbsDisplay();
            
            this.showNotification('Datos actualizados correctamente', 'success');
            
        } catch (error) {
            this.showNotification('Error al actualizar datos: ' + error.message, 'danger');
        }
    }

    /**
     * Cierra la sesión actual y resetea la aplicación
     * Limpia todos los datos y vuelve al estado inicial
     */
    async logout() {
        try {
            // Llamar al endpoint de logout
            await fetch('api/logout.php', { method: 'POST' });
            
            // Resetear estado de la aplicación
            this.isConnected = false;
            this.connectionConfig = null;
            this.databases = [];
            this.selectedDatabases.clear();
            
            // Resetear interfaz
            this.resetInterface();
            
            // Actualizar indicador de estado
            this.updateConnectionBadge('disconnected', 'Desconectado');
            
            this.showNotification('Sesión cerrada correctamente', 'success');
            
        } catch (error) {
            this.showNotification('Error al cerrar sesión: ' + error.message, 'danger');
        }
    }

    /**
     * Muestra información de sesión en la barra superior
     * @param {Object} config - Configuración de conexión actual
     */
    showSessionInfo(config) {
        const connectedUser = document.getElementById('connectedUser');
        const connectedServer = document.getElementById('connectedServer');
        const sessionInfo = document.getElementById('sessionInfo');
        const refreshBtn = document.getElementById('refreshBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (connectedUser) connectedUser.textContent = config.username;
        if (connectedServer) connectedServer.textContent = `${config.host}:${config.port}`;
        if (sessionInfo) sessionInfo.style.display = 'block';
        if (refreshBtn) refreshBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    }

    /**
     * Oculta la información de sesión de la barra superior
     */
    hideSessionInfo() {
        const sessionInfo = document.getElementById('sessionInfo');
        const refreshBtn = document.getElementById('refreshBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (sessionInfo) sessionInfo.style.display = 'none';
        if (refreshBtn) refreshBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    /**
     * Resetea la interfaz al estado inicial
     * Limpia todos los formularios y paneles, restaura valores por defecto
     */
    resetInterface() {
        // Ocultar paneles
        const createDbPanel = document.getElementById('createDbPanel');
        const queryPanel = document.getElementById('queryPanel');
        const resultsPanel = document.getElementById('resultsPanel');
        
        if (createDbPanel) createDbPanel.style.display = 'none';
        if (queryPanel) queryPanel.style.display = 'none';
        if (resultsPanel) resultsPanel.style.display = 'none';
        
        // Resetear formularios
        const connectionForm = document.getElementById('connectionForm');
        const createDbForm = document.getElementById('createDbForm');
        const sqlQuery = document.getElementById('sqlQuery');
        
        if (connectionForm) connectionForm.reset();
        if (createDbForm) createDbForm.reset();
        if (sqlQuery) sqlQuery.value = '';
        
        // Resetear contenedores
        const databasesContainer = document.getElementById('databasesContainer');
        if (databasesContainer) {
            databasesContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-database fa-3x mb-3"></i>
                    <p>Conecta al servidor para ver las bases de datos disponibles</p>
                </div>
            `;
        }
        
        const connectionStatus = document.getElementById('connectionStatus');
        const selectedDbsDisplay = document.getElementById('selectedDbsDisplay');
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (connectionStatus) connectionStatus.innerHTML = '';
        if (selectedDbsDisplay) selectedDbsDisplay.innerHTML = 'Ninguna base seleccionada';
        if (resultsContainer) resultsContainer.innerHTML = '';
        
        // Ocultar info de sesión
        this.hideSessionInfo();
        
        // Restaurar valores por defecto (con validación)
        const host = document.getElementById('host');
        const username = document.getElementById('username');
        const password = document.getElementById('password');
        const port = document.getElementById('port');
        const connectionTimeout = document.getElementById('connectionTimeout');
        const useSSL = document.getElementById('useSSL');
        const connectionCharset = document.getElementById('connectionCharset');
        const presetConfigs = document.getElementById('presetConfigs');
        
        if (host) host.value = 'localhost';
        if (username) username.value = 'root';
        if (password) password.value = '';
        if (port) port.value = '3306';
        if (connectionTimeout) connectionTimeout.value = '30';
        if (useSSL) useSSL.checked = false;
        if (connectionCharset) connectionCharset.value = 'utf8mb4';
        if (presetConfigs) presetConfigs.value = '';
    }

    /**
     * Muestra notificaciones en el panel de notificaciones
     * @param {string} message - Mensaje de la notificación
     * @param {string} type - Tipo de notificación ('info', 'success', 'warning', 'danger')
     * @param {boolean} showSpinner - Si debe mostrar un spinner de carga
     */
    showNotification(message, type = 'info', showSpinner = false) {
        const panel = document.getElementById('notificationPanel');
        const icon = document.getElementById('notificationIcon');
        const text = document.getElementById('notificationText');
        const spinner = document.getElementById('notificationSpinner');
        
        // Configurar tipo de notificación
        panel.className = `alert alert-${type} fade show`;
        
        // Configurar icono según el tipo
        const icons = {
            success: 'fas fa-check-circle',
            danger: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        icon.className = icons[type] || icons.info;
        text.textContent = message;
        
        // Mostrar/ocultar spinner
        if (showSpinner) {
            spinner.style.display = 'inline-block';
            icon.style.display = 'none';
        } else {
            spinner.style.display = 'none';
            icon.style.display = 'inline-block';
        }
        
        // Mostrar panel
        panel.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos (excepto si hay spinner)
        if (!showSpinner) {
            setTimeout(() => {
                this.hideNotification();
            }, 5000);
        }
    }

    /**
     * Oculta el panel de notificaciones
     */
    hideNotification() {
        const panel = document.getElementById('notificationPanel');
        panel.style.display = 'none';
    }

    /**
     * Carga configuraciones predefinidas para la conexión
     * @param {string} preset - Tipo de configuración ('local', 'remote', 'custom')
     */
    loadPresetConfig(preset) {
        const presets = {
            local: {
                host: 'localhost',
                username: 'root',
                password: '',
                port: 3306,
                timeout: 30,
                useSSL: false,
                charset: 'utf8mb4'
            },
            remote: {
                host: '',
                username: '',
                password: '',
                port: 3306,
                timeout: 60,
                useSSL: true,
                charset: 'utf8mb4'
            },
            custom: {
                host: '',
                username: '',
                password: '',
                port: 3306,
                timeout: 30,
                useSSL: false,
                charset: 'utf8mb4'
            }
        };

        // Aplicar configuración seleccionada
        if (presets[preset]) {
            const config = presets[preset];
            document.getElementById('host').value = config.host;
            document.getElementById('username').value = config.username;
            document.getElementById('password').value = config.password;
            document.getElementById('port').value = config.port;
            document.getElementById('connectionTimeout').value = config.timeout;
            document.getElementById('useSSL').checked = config.useSSL;
            document.getElementById('connectionCharset').value = config.charset;
            
            // Mostrar configuración avanzada si no es local
            if (preset !== 'local') {
                const advancedConfig = document.getElementById('advancedConfig');
                if (!advancedConfig.classList.contains('show')) {
                    new bootstrap.Collapse(advancedConfig).show();
                }
            }
        }
    }
}

// Inicializar la aplicación cuando se carga la página
const dbManager = new DatabaseManager();

// Exponer instancia globalmente para eventos onclick en el HTML
window.dbManager = dbManager;
