-- ============================================================================
-- CHARCAS CAPITAL - ERP/POS CAFETERÍA
-- Universidad Mayor Real y Pontificia de San Francisco Xavier de Chuquisaca
-- Materia: Ingeniería Económica (IND210)
-- Schema DDL - PostgreSQL / Supabase
-- ============================================================================

-- Extensión para encriptación de contraseñas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. TABLA: USUARIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario   SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    rol          VARCHAR(30) NOT NULL
                 CHECK (rol IN ('SuperAdmin', 'Administrador', 'Mesero', 'Cajero', 'Barista', 'Cocina')),
    password_hash VARCHAR(255) NOT NULL,
    activo       BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. TABLA: MESAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS mesas (
    id_mesa      SERIAL PRIMARY KEY,
    numero_mesa  INT NOT NULL UNIQUE,
    capacidad    INT NOT NULL CHECK (capacidad > 0),
    estado       VARCHAR(20) DEFAULT 'Disponible'
                 CHECK (estado IN ('Disponible', 'Ocupada', 'Reservada', 'Inactiva'))
);

-- ============================================================================
-- 3. TABLA: INSUMOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS insumos (
    id_insumo     SERIAL PRIMARY KEY,
    nombre_insumo VARCHAR(100) NOT NULL UNIQUE,
    stock_actual  DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo  DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    unidad_medida VARCHAR(20) NOT NULL
                  CHECK (unidad_medida IN ('gramos', 'mililitros', 'unidades', 'piezas'))
);

-- ============================================================================
-- 4. TABLA: PRODUCTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS productos (
    id_producto     SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(100) NOT NULL UNIQUE,
    precio_venta    DECIMAL(10,2) NOT NULL CHECK (precio_venta >= 0),
    categoria       VARCHAR(50) NOT NULL
                    CHECK (categoria IN ('Bebidas Calientes', 'Bebidas Frías', 'Repostería', 'Desayunos', 'Meriendas')),
    disponible      BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 5. TABLA: RECETAS (Relación Producto ↔ Insumo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recetas (
    id_receta          SERIAL PRIMARY KEY,
    id_producto        INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    id_insumo          INT NOT NULL REFERENCES insumos(id_insumo) ON DELETE RESTRICT,
    cantidad_requerida DECIMAL(10,2) NOT NULL CHECK (cantidad_requerida > 0),
    UNIQUE (id_producto, id_insumo)
);

-- ============================================================================
-- 6. TABLA: PEDIDOS (Cabecera)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido      SERIAL PRIMARY KEY,
    id_usuario     INT REFERENCES usuarios(id_usuario),
    id_mesa        INT REFERENCES mesas(id_mesa),
    tipo_servicio  VARCHAR(30) NOT NULL
                   CHECK (tipo_servicio IN ('Comer en el Lugar', 'Para Llevar / Recoger')),
    estado_pedido  VARCHAR(30) DEFAULT 'Pendiente'
                   CHECK (estado_pedido IN ('Pendiente', 'En Preparación', 'Listo', 'Entregado', 'Cancelado')),
    metodo_pago    VARCHAR(30)
                   CHECK (metodo_pago IN ('Efectivo', 'Pago QR Simple')),
    estado_pago    VARCHAR(20) DEFAULT 'No Pagado'
                   CHECK (estado_pago IN ('No Pagado', 'Pagado')),
    total_pago     DECIMAL(10,2) DEFAULT 0,
    fecha_hora     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. TABLA: DETALLE_PEDIDO
-- ============================================================================
CREATE TABLE IF NOT EXISTS detalle_pedido (
    id_detalle     SERIAL PRIMARY KEY,
    id_pedido      INT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    id_producto    INT NOT NULL REFERENCES productos(id_producto),
    cantidad       INT NOT NULL CHECK (cantidad > 0),
    subtotal       DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    observaciones  TEXT
);

-- ============================================================================
-- 8. ÍNDICES DE RENDIMIENTO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido ON detalle_pedido(id_pedido);
CREATE INDEX IF NOT EXISTS idx_recetas_producto ON recetas(id_producto);
CREATE INDEX IF NOT EXISTS idx_insumos_stock ON insumos(stock_actual, stock_minimo);

-- ============================================================================
-- 9. SECUENCIA PARA TICKETS "PARA LLEVAR"
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS seq_ticket_llevar START WITH 1 INCREMENT BY 1 CYCLE;

-- ============================================================================
-- 10. FUNCIÓN PL/pgSQL: PROCESAMIENTO DE DESCUENTO DE INVENTARIO
-- ============================================================================
CREATE OR REPLACE FUNCTION procesar_descuento_inventario()
RETURNS TRIGGER AS $$
DECLARE
    item           RECORD;
    ingrediente    RECORD;
    stock_disponible DECIMAL(10,2);
BEGIN
    -- Solo ejecutar cuando el pedido pasa a estado 'Entregado'
    IF NEW.estado_pedido = 'Entregado' AND OLD.estado_pedido != 'Entregado' THEN

        -- ================================================================
        -- FASE 1: Validación preventiva de stock suficiente
        -- Recorrer cada producto en el detalle del pedido
        -- ================================================================
        FOR item IN
            SELECT dp.id_producto, dp.cantidad, p.nombre_producto
            FROM detalle_pedido dp
            JOIN productos p ON p.id_producto = dp.id_producto
            WHERE dp.id_pedido = NEW.id_pedido
        LOOP
            -- Para cada producto, verificar cada ingrediente en la receta
            FOR ingrediente IN
                SELECT r.id_insumo, r.cantidad_requerida, i.nombre_insumo, i.stock_actual
                FROM recetas r
                JOIN insumos i ON i.id_insumo = r.id_insumo
                WHERE r.id_producto = item.id_producto
            LOOP
                -- Calcular si hay stock suficiente
                stock_disponible := ingrediente.stock_actual - (ingrediente.cantidad_requerida * item.cantidad);

                IF stock_disponible < 0 THEN
                    RAISE EXCEPTION 'Stock insuficiente para el insumo "%" (disponible: %, requerido: %) al preparar el producto "%".',
                        ingrediente.nombre_insumo,
                        ingrediente.stock_actual,
                        (ingrediente.cantidad_requerida * item.cantidad),
                        item.nombre_producto;
                END IF;
            END LOOP;
        END LOOP;

        -- ================================================================
        -- FASE 2: Descuento efectivo de inventario
        -- ================================================================
        FOR item IN
            SELECT dp.id_producto, dp.cantidad
            FROM detalle_pedido dp
            WHERE dp.id_pedido = NEW.id_pedido
        LOOP
            FOR ingrediente IN
                SELECT r.id_insumo, r.cantidad_requerida
                FROM recetas r
                WHERE r.id_producto = item.id_producto
            LOOP
                UPDATE insumos
                SET stock_actual = stock_actual - (ingrediente.cantidad_requerida * item.cantidad)
                WHERE id_insumo = ingrediente.id_insumo;
            END LOOP;
        END LOOP;

        -- ================================================================
        -- FASE 3: Liberar mesa asociada (si aplica)
        -- ================================================================
        IF NEW.id_mesa IS NOT NULL THEN
            UPDATE mesas
            SET estado = 'Disponible'
            WHERE id_mesa = NEW.id_mesa;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. TRIGGER: DESCUENTO AUTOMÁTICO DE INVENTARIO
-- ============================================================================
DROP TRIGGER IF EXISTS trg_descuento_inventario ON pedidos;
CREATE TRIGGER trg_descuento_inventario
    AFTER UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION procesar_descuento_inventario();

-- ============================================================================
-- 12. DATOS INICIALES (SEED)
-- ============================================================================

-- Usuario SuperAdmin por defecto (password: admin123)
INSERT INTO usuarios (nombre, rol, password_hash) VALUES
    ('Administrador General', 'SuperAdmin', crypt('admin123', gen_salt('bf'))),
    ('Carlos Mendoza', 'Cajero', crypt('cajero123', gen_salt('bf'))),
    ('María Gutiérrez', 'Barista', crypt('barista123', gen_salt('bf'))),
    ('José Flores', 'Cocina', crypt('cocina123', gen_salt('bf'))),
    ('Ana Torres', 'Administrador', crypt('admin456', gen_salt('bf')))
ON CONFLICT DO NOTHING;

-- Mesas del salón de té
INSERT INTO mesas (numero_mesa, capacidad, estado) VALUES
    (1, 4, 'Disponible'),
    (2, 2, 'Disponible'),
    (3, 6, 'Disponible'),
    (4, 4, 'Disponible'),
    (5, 2, 'Disponible'),
    (6, 8, 'Disponible'),
    (7, 4, 'Disponible'),
    (8, 2, 'Disponible'),
    (9, 4, 'Disponible'),
    (10, 6, 'Disponible')
ON CONFLICT (numero_mesa) DO NOTHING;

-- Insumos de la cafetería
INSERT INTO insumos (nombre_insumo, stock_actual, stock_minimo, unidad_medida) VALUES
    ('Café molido arábica', 5000.00, 500.00, 'gramos'),
    ('Leche entera', 20000.00, 3000.00, 'mililitros'),
    ('Leche deslactosada', 10000.00, 2000.00, 'mililitros'),
    ('Azúcar blanca', 8000.00, 1000.00, 'gramos'),
    ('Chocolate en polvo', 3000.00, 500.00, 'gramos'),
    ('Crema de leche', 5000.00, 800.00, 'mililitros'),
    ('Canela en polvo', 500.00, 100.00, 'gramos'),
    ('Vainilla líquida', 1000.00, 200.00, 'mililitros'),
    ('Harina de trigo', 10000.00, 1500.00, 'gramos'),
    ('Mantequilla', 5000.00, 800.00, 'gramos'),
    ('Huevos', 200.00, 30.00, 'unidades'),
    ('Levadura', 1000.00, 200.00, 'gramos'),
    ('Mermelada de fresa', 3000.00, 500.00, 'gramos'),
    ('Queso crema', 4000.00, 600.00, 'gramos'),
    ('Pan de molde', 100.00, 20.00, 'piezas'),
    ('Jamón', 3000.00, 500.00, 'gramos'),
    ('Té negro', 2000.00, 300.00, 'gramos'),
    ('Manzanilla seca', 1500.00, 200.00, 'gramos'),
    ('Hielo', 10000.00, 2000.00, 'gramos'),
    ('Jarabe de goma', 2000.00, 400.00, 'mililitros')
ON CONFLICT (nombre_insumo) DO NOTHING;

-- Productos del menú
INSERT INTO productos (nombre_producto, precio_venta, categoria, disponible) VALUES
    ('Café Americano', 12.00, 'Bebidas Calientes', TRUE),
    ('Cappuccino Clásico', 18.00, 'Bebidas Calientes', TRUE),
    ('Latte Vainilla', 20.00, 'Bebidas Calientes', TRUE),
    ('Mochaccino', 22.00, 'Bebidas Calientes', TRUE),
    ('Chocolate Caliente', 15.00, 'Bebidas Calientes', TRUE),
    ('Té Negro con Limón', 10.00, 'Bebidas Calientes', TRUE),
    ('Infusión de Manzanilla', 10.00, 'Bebidas Calientes', TRUE),
    ('Café Helado', 18.00, 'Bebidas Frías', TRUE),
    ('Frappuccino Mokka', 25.00, 'Bebidas Frías', TRUE),
    ('Limonada del Valle', 12.00, 'Bebidas Frías', TRUE),
    ('Croissant de Mantequilla', 10.00, 'Repostería', TRUE),
    ('Torta de Chocolate', 15.00, 'Repostería', TRUE),
    ('Cheesecake de Fresa', 18.00, 'Repostería', TRUE),
    ('Empanada de Queso', 8.00, 'Repostería', TRUE),
    ('Desayuno Continental', 35.00, 'Desayunos', TRUE),
    ('Tostadas con Mermelada', 15.00, 'Desayunos', TRUE),
    ('Sandwich Mixto', 20.00, 'Desayunos', TRUE),
    ('Merienda Clásica', 30.00, 'Meriendas', TRUE),
    ('Té con Masitas', 25.00, 'Meriendas', TRUE)
ON CONFLICT (nombre_producto) DO NOTHING;

-- Recetas (Relación Producto ↔ Insumos con cantidades)
INSERT INTO recetas (id_producto, id_insumo, cantidad_requerida) VALUES
    -- Café Americano: café molido + agua (agua no rastreada)
    (1, 1, 18.00),   -- 18g café molido
    (1, 4, 5.00),    -- 5g azúcar

    -- Cappuccino Clásico
    (2, 1, 18.00),   -- café molido
    (2, 2, 150.00),  -- leche entera
    (2, 4, 5.00),    -- azúcar

    -- Latte Vainilla
    (3, 1, 18.00),   -- café molido
    (3, 2, 200.00),  -- leche entera
    (3, 8, 10.00),   -- vainilla líquida
    (3, 4, 5.00),    -- azúcar

    -- Mochaccino
    (4, 1, 18.00),   -- café molido
    (4, 2, 150.00),  -- leche
    (4, 5, 20.00),   -- chocolate en polvo
    (4, 6, 30.00),   -- crema de leche

    -- Chocolate Caliente
    (5, 5, 40.00),   -- chocolate en polvo
    (5, 2, 250.00),  -- leche
    (5, 4, 10.00),   -- azúcar

    -- Té Negro con Limón
    (6, 17, 5.00),   -- té negro
    (6, 4, 5.00),    -- azúcar

    -- Infusión de Manzanilla
    (7, 18, 5.00),   -- manzanilla

    -- Café Helado
    (8, 1, 18.00),   -- café molido
    (8, 2, 100.00),  -- leche
    (8, 19, 100.00), -- hielo
    (8, 4, 10.00),   -- azúcar

    -- Frappuccino Mokka
    (9, 1, 18.00),   -- café molido
    (9, 2, 150.00),  -- leche
    (9, 5, 20.00),   -- chocolate en polvo
    (9, 19, 150.00), -- hielo
    (9, 6, 30.00),   -- crema de leche

    -- Limonada del Valle
    (10, 4, 25.00),  -- azúcar
    (10, 19, 200.00),-- hielo
    (10, 20, 30.00), -- jarabe de goma

    -- Croissant de Mantequilla
    (11, 9, 80.00),  -- harina
    (11, 10, 40.00), -- mantequilla
    (11, 11, 1.00),  -- huevo

    -- Torta de Chocolate
    (12, 9, 60.00),  -- harina
    (12, 5, 30.00),  -- chocolate en polvo
    (12, 10, 30.00), -- mantequilla
    (12, 11, 1.00),  -- huevo
    (12, 4, 25.00),  -- azúcar

    -- Cheesecake de Fresa
    (13, 14, 100.00),-- queso crema
    (13, 13, 50.00), -- mermelada de fresa
    (13, 10, 20.00), -- mantequilla
    (13, 4, 20.00),  -- azúcar

    -- Empanada de Queso
    (14, 9, 60.00),  -- harina
    (14, 14, 40.00), -- queso crema
    (14, 10, 15.00), -- mantequilla

    -- Desayuno Continental
    (15, 15, 2.00),  -- pan de molde
    (15, 16, 50.00), -- jamón
    (15, 14, 30.00), -- queso crema
    (15, 13, 20.00), -- mermelada
    (15, 10, 10.00), -- mantequilla
    (15, 11, 2.00),  -- huevos

    -- Tostadas con Mermelada
    (16, 15, 2.00),  -- pan de molde
    (16, 10, 10.00), -- mantequilla
    (16, 13, 30.00), -- mermelada

    -- Sandwich Mixto
    (17, 15, 2.00),  -- pan de molde
    (17, 16, 60.00), -- jamón
    (17, 14, 30.00), -- queso crema
    (17, 10, 10.00), -- mantequilla

    -- Merienda Clásica (incluye café + repostería)
    (18, 1, 18.00),  -- café molido
    (18, 2, 150.00), -- leche
    (18, 9, 60.00),  -- harina
    (18, 10, 30.00), -- mantequilla
    (18, 11, 1.00),  -- huevo

    -- Té con Masitas
    (19, 17, 5.00),  -- té negro
    (19, 9, 50.00),  -- harina
    (19, 10, 25.00), -- mantequilla
    (19, 4, 15.00)   -- azúcar
ON CONFLICT (id_producto, id_insumo) DO NOTHING;

-- ============================================================================
-- FIN DEL SCRIPT DDL
-- ============================================================================
