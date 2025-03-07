//npm install express pg bcrypt jsonwebtoken
//node index.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "./config.js";
const SECRET_KEY = process.env.JWT_SECRET || "secretkey";

export const registrarUsuario = async (usuario) => {
  try {
    let { nombre, email, contrasena, direccion, rol } = usuario;
    const passwordEncriptada = bcrypt.hashSync(contrasena, 10);
    const values = [nombre, email, passwordEncriptada, direccion, rol];
    const consulta =
      "INSERT INTO usuarios (nombre, email, contrasena, direccion, rol) VALUES ($1, $2, $3, $4, $5)";
    await pool.query(consulta, values);
  } catch (error) {
    if (error.code === "23505") {
      throw { code: 400, message: "El email ya está registrado" };
    }
    throw { code: 500, message: "Error al registrar el usuario" };
  }
};

export const verificarCredenciales = async (email, contrasena) => {
  try {
    const values = [email];
    const consulta = "SELECT * FROM usuarios WHERE email = $1";
    const {
      rows: [usuario],
      rowCount,
    } = await pool.query(consulta, values);

    if (!rowCount || !bcrypt.compareSync(contrasena, usuario.contrasena)) {
      throw { code: 401, message: "Email o contraseña incorrecta" };
    }

    // Generar token JWT, para que el usuario demuestre que inició sesión y asi no vuelva a ingresar sus credenciales en cada solicitud que se haga, en este caso dura 1 hora
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      SECRET_KEY,
      { expiresIn: "1h" }
    );
    return token;
  } catch (error) {
    throw {
      code: error.code || 500,
      message: error.message || "Error al verificar credenciales",
    };
  }
};

export const obtenerUsuarios = async () => {
  try {
    const consulta = "SELECT id, nombre, email, direccion, rol FROM usuarios";
    const { rows } = await pool.query(consulta);
    return rows;
  } catch (error) {
    throw { code: 500, message: "Error al obtener usuarios" };
  }
};

export const obtenerUsuarioPorId = async (id) => {
  try {
    const values = [id];
    const consulta =
      "SELECT id, nombre, email, direccion, rol FROM usuarios WHERE id = $1";
    const {
      rows: [usuario],
      rowCount,
    } = await pool.query(consulta, values);

    if (!rowCount) throw { code: 404, message: "Usuario no encontrado" };
    return usuario;
  } catch (error) {
    throw {
      code: error.code || 500,
      message: error.message || "Error al obtener usuario",
    };
  }
};

export const actualizarUsuario = async (id, datos) => {
  try {
    const { nombre, email, direccion } = datos;
    const values = [nombre, email, direccion, id];
    const consulta = `
            UPDATE usuarios 
            SET nombre = $1, email = $2, direccion = $3
            WHERE id = $4
            RETURNING id, nombre, email, direccion, rol
        `;

    const {
      rows: [usuario],
      rowCount,
    } = await pool.query(consulta, values);
    if (!rowCount) throw { code: 404, message: "Usuario no encontrado" };
    return usuario;
  } catch (error) {
    if (error.code === "23505") {
      throw { code: 400, message: "El email ya está en uso" };
    }
    throw {
      code: error.code || 500,
      message: error.message || "Error al actualizar usuario",
    };
  }
};

export const eliminarUsuario = async (id) => {
  try {
    const values = [id];
    const consulta = "DELETE FROM usuarios WHERE id = $1 RETURNING id";
    const { rowCount } = await pool.query(consulta, values);

    if (!rowCount) throw { code: 404, message: "Usuario no encontrado" };
    return { message: "Usuario eliminado con éxito" };
  } catch (error) {
    throw {
      code: error.code || 500,
      message: error.message || "Error al eliminar usuario",
    };
  }
};

export const autenticarUsuario = (req, res, next) => {
  try {
    // Obtener el token del encabezado de la solicitud
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      throw {
        code: 401,
        message: "Acceso no autorizado: Token no proporcionado",
      };

    // Verificar el token
    const decoded = jwt.verify(token, SECRET_KEY);
    req.usuario = decoded; // Almacenar la información del usuario en el objeto `req`

    next(); // Continuar con la siguiente función (controlador)
  } catch (error) {
    res
      .status(error.code || 401)
      .json({ message: error.message || "Token inválido o expirado" });
  }
};

// Agregar producto
export const agregarProducto = async (req) => {
  try {
    const { imagen, nombre_producto, descripcion, precio, stock } = req.body;
    const usuario_id = req.usuario.id; // Obtener el ID del usuario desde el token

    // Validación del precio
    if (precio <= 0) {
      throw { code: 400, message: "El precio debe ser un valor positivo" };
    }

    const values = [
      imagen,
      nombre_producto,
      descripcion,
      precio,
      stock,
      usuario_id,
    ];
    const consulta = `
            INSERT INTO productos (imagen, nombre_producto, descripcion, precio, stock, usuario_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
    const {
      rows: [nuevoProducto],
    } = await pool.query(consulta, values);
    return nuevoProducto;
  } catch (error) {
    throw { code: 500, message: "Error al agregar el producto" };
  }
};

export const obtenerProductos = async () => {
  try {
    const consulta =
      "SELECT id, imagen, nombre_producto, descripcion, precio, stock, vendido, usuario_id FROM productos";
    const { rows } = await pool.query(consulta);
    return rows.length > 0 ? rows : []; // Asegura que siempre sea un array
  } catch (error) {
    throw { code: 500, message: "Error al obtener los productos" };
  }
};

export const obtenerProductosPorUsuario = async (usuario_id) => {
  try {
    const consulta =
      "SELECT id, imagen, nombre_producto, descripcion, precio, stock, vendido, usuario_id FROM productos WHERE usuario_id = $1";
    const values = [usuario_id];
    const { rows } = await pool.query(consulta, values);
    if (rows.length === 0) {
      return { message: "No hay productos registrados para este usuario" };
    }
    return rows;
  } catch (error) {
    throw { code: 500, message: "Error al obtener los productos del usuario" };
  }
};

// eliminar un producto
export const eliminarProducto = async (req) => {
  try {
    const { id } = req.params; // ID del producto a eliminar
    const usuario_id = req.usuario.id; // ID del usuario autenticado

    // Verificar que el producto pertenezca al usuario autenticado
    const consultaVerificacion =
      "SELECT usuario_id FROM productos WHERE id = $1";
    const {
      rows: [producto],
      rowCount,
    } = await pool.query(consultaVerificacion, [id]);

    if (!rowCount) throw { code: 404, message: "Producto no encontrado" };
    if (producto.usuario_id !== usuario_id)
      throw {
        code: 403,
        message: "No tienes permiso para eliminar este producto",
      };

    // Eliminar el producto
    const consulta = "DELETE FROM productos WHERE id = $1 RETURNING *";
    const {
      rows: [productoEliminado],
    } = await pool.query(consulta, [id]);
    return {
      message: "Producto eliminado con éxito",
      producto: productoEliminado,
    };
  } catch (error) {
    throw {
      code: error.code || 500,
      message: error.message || "Error al eliminar el producto",
    };
  }
};

// Agregar un producto al carrito
export const agregarProductoAlCarrito = async (req) => {
  try {
    const { producto_id, cantidad } = req.body;
    const usuario_id = req.usuario.id; // ID del usuario autenticado

    const values = [usuario_id, producto_id, cantidad];
    const consulta = `
            INSERT INTO carrito_productos (usuario_id, producto_id, cantidad)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
    const {
      rows: [carrito],
    } = await pool.query(consulta, values);
    return carrito;
  } catch (error) {
    throw { code: 500, message: "Error al agregar el producto al carrito" };
  }
};

// Eliminar un producto del carrito
export const eliminarProductoDelCarrito = async (req) => {
  try {
    const { id } = req.params; // ID del producto en el carrito
    const usuario_id = req.usuario.id; // ID del usuario autenticado

    // Verificar que el producto en el carrito pertenezca al usuario autenticado
    const consultaVerificacion =
      "SELECT usuario_id FROM carrito_productos WHERE id = $1";
    const {
      rows: [carrito],
      rowCount,
    } = await pool.query(consultaVerificacion, [id]);

    if (!rowCount)
      throw { code: 404, message: "Producto no encontrado en el carrito" };
    if (carrito.usuario_id !== usuario_id)
      throw {
        code: 403,
        message: "No tienes permiso para eliminar este producto del carrito",
      };

    // Eliminar el producto del carrito
    const consulta = "DELETE FROM carrito_productos WHERE id = $1 RETURNING *";
    const {
      rows: [productoEliminado],
    } = await pool.query(consulta, [id]);
    return {
      message: "Producto eliminado del carrito con éxito",
      producto: productoEliminado,
    };
  } catch (error) {
    throw {
      code: error.code || 500,
      message: error.message || "Error al eliminar el producto del carrito",
    };
  }
};

export const obtenerProductoPorId = async (id) => {
  try {
    const consulta =
      "SELECT id, imagen, nombre_producto, descripcion, precio, stock, vendido, usuario_id FROM productos WHERE id = $1";
    const values = [id];
    const {
      rows: [producto],
    } = await pool.query(consulta, values);
    if (!producto) {
      throw { code: 404, message: "Producto no encontrado" };
    }
    return producto;
  } catch (error) {
    throw {
      code: error.code || 500,
      message: error.message || "Error al obtener el producto",
    };
  }
};
