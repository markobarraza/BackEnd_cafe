//npm install express pg bcrypt jsonwebtoken
//node index.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config.js";
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

// //  consultas de Productos //   //

export const registrarProducto = async (producto, usuario_id) => {
  try {
    let { nombre_producto, descripcion, imagen, precio, stock } = producto;
    const values = [
      nombre_producto,
      descripcion,
      imagen,
      precio,
      stock,
      usuario_id,
    ];
    const consulta =
      "INSERT INTO productos (imagen, nombre_producto, descripcion, precio, stock,usuario_id) VALUES ($1, $2, $3, $4, $5, $6)";
    await pool.query(consulta, values);
    return { code: 201, message: "Producto registrado exitosamente" };
  } catch (error) {
    if (error.code === "23505") {
      throw { code: 400, message: "El producto ya existe" };
    }
    throw { code: 500, message: "Error al registrar el producto" };
  }
};

export const obtenerProductos = async () => {
  try {
    const consulta =
      "SELECT id, imagen, nombre_producto, descripcion, precio, categoria_id FROM productos";
    const { rows } = await pool.query(consulta);
    if (rows.length === 0) {
      return { message: "No hay productos registrados" };
    }
    return rows;
  } catch (error) {
    console.error("Error en obtenerProductos:", error);
    throw { code: 500, message: "Error al obtener productos" };
  }
};

export const obtenerProductosPorId = async (id) => {
  try {
    if (!id) throw { code: 400, message: "ID de producto no proporcionado" };
    const consulta =
      "SELECT id, imagen, nombre_producto, descripcion, precio, stock, categoria_id FROM productos WHERE id = $1";
    const values = [id];
    const { rows, rowCount } = await pool.query(consulta, values);

    if (rowCount === 0) throw { code: 404, message: "Producto no encontrado" };
    return rows[0];
  } catch (error) {
    console.error("Error al obtener producto:", error);
    throw {
      code: error.code || 500,
      message: error.message || "Error interno obtener el producto",
    };
  }
};

export const actualizarProducto = async (id, datos) => {
  try {
    const { imagen, nombre_producto, descripcion, precio, stock } = datos;
    // Validación para evitar valores undefined
    if (!id || !nombre_producto || !precio || stock === undefined) {
      throw { code: 400, message: "Datos incompletos o incorrectos" };
    }
    const values = [imagen, nombre_producto, descripcion, precio, stock, id];
    const consulta = `
              UPDATE productos 
              SET imagen = $1, nombre_producto = $2, descripcion = $3, precio = $4, stock = $5
              WHERE id = $6
              RETURNING id, imagen, nombre_producto, descripcion, precio, stock
          `;

    const {
      rows: [producto],
      rowCount,
    } = await pool.query(consulta, values);
    if (!rowCount) throw { code: 404, message: "Producto no encontrado" };
    return producto;
  } catch (error) {
    if (error) {
      throw { code: 400, message: "El prodcuto ya esta actualizado" };
    }
    throw {
      code: error.code || 500,
      message: error.message || "Error al actualizar producto",
    };
  }
};

export const eliminarProducto = async (id) => {
  try {
    const values = [id];

    // Verifico si el producto existe antes de eliminarlo
    const productoExistente = await pool.query(
      "SELECT id FROM productos WHERE id = $1",
      values
    );
    if (productoExistente.rowCount === 0) {
      throw { code: 404, message: "Producto no encontrado" };
    }

    // Elimino referencias en carrito_productos y detalle_pedido antes de eliminar el producto
    await pool.query(
      "DELETE FROM carrito_productos WHERE producto_id = $1",
      values
    );
    await pool.query(
      "DELETE FROM detalle_pedido WHERE producto_id = $1",
      values
    );

    // elimino el producto
    const consulta = "DELETE FROM productos WHERE id = $1 RETURNING id";
    const { rowCount } = await pool.query(consulta, values);

    if (rowCount === 0) throw { code: 404, message: "Producto no encontrado" };

    return { message: "Producto eliminado con éxito" };
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    throw {
      code: error.code && !isNaN(error.code) ? error.code : 500,
      message: error.message || "Error al eliminar producto",
    };
  }
};

export { pool };
