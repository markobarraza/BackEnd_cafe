//npm install cors express morgan
//npm install dotenv jsonwebtoken
//npm install bcryptjs

// import express from "express";
const SECRET_KEY = process.env.JWT_SECRET || 'secretkey';
import cors from "cors";
import morgan from "morgan";
import {
  registrarUsuario,
  verificarCredenciales,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario,
  registrarProducto,
  obtenerProductos,
  obtenerProductosPorId,
  actualizarProducto,
  eliminarProducto,
} from "./consultas.js";
import express from 'express';
import jwt from 'jsonwebtoken'
const app = express();
const port = process.env.PORT || 3000;
// middlewares
app.use(cors()); // Habilita CORS para permitir peticiones de diferentes dominios
app.use(express.json()); // Para manejar cuerpos de solicitud en formato JSON
app.use(morgan("dev")); // Para loguear las peticiones HTTP en consola (solo en desarrollo)
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});



// Ruta POST para registrar un nuevo usuario
app.post("/usuarios", async (req, res) => {
  const { nombre, email, contrasena, direccion, rol } = req.body;
  try {
    await registrarUsuario({ nombre, email, contrasena, direccion, rol });
    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ message: error.message || "Error al registrar el usuario" });
  }
});

// Ruta POST para verificar credenciales y obtener un token
app.post("/login", async (req, res) => {
  const { email, contrasena } = req.body;
  try {
    const token = await verificarCredenciales(email, contrasena);
    res.status(200).json({ token });
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ message: error.message || "Error al verificar credenciales" });
  }
});

// Ruta GET para obtener todos los usuarios
app.get("/usuarios", async (req, res) => {
  try {
    const usuarios = await obtenerUsuarios();
    res.status(200).json(usuarios);
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ message: error.message || "Error al obtener usuarios" });
  }
});




// Ruta GET para obtener un usuario por ID
app.get("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    let userId = id;
    // Si el usuario pide su propio perfil con "me", obtenemos el ID desde el token
    if (id === "me") {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) throw { code: 401, message: "Acceso no autorizado" };

        const decoded = jwt.verify(token, SECRET_KEY);
        userId = decoded.id; // Usamos el ID del token
    }
    const usuario = await obtenerUsuarioPorId(userId);
    res.status(200).json(usuario);




  } catch (error) {
    res
      .status(error.code || 500)
      .json({ message: error.message || "Error al obtener el usuario" });
  }
});








// Ruta PUT para actualizar un usuario
app.put("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, email, direccion } = req.body;
  try {
    const usuarioActualizado = await actualizarUsuario(id, {
      nombre,
      email,
      direccion,
    });
    res.status(200).json(usuarioActualizado);
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ message: error.message || "Error al actualizar el usuario" });
  }
});

// Ruta DELETE para eliminar un usuario
app.delete("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await eliminarUsuario(id);
    res.status(200).json(resultado);
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ message: error.message || "Error al eliminar el usuario" });
  }
});

// Rutas para Productos  //

//Ruta Post para registrar productos
app.post("/productos", async (req, res) => {
  const { imagen, nombre_producto, descripcion, precio, stock, categoria_id } =
    req.body;

  try {
    // Obtener usuario_id desde el token de autenticación
    const usuario_id = req.usuario.id;
    if (!usuario_id) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }
    // Si no se envía categoria_id, asignar una por defecto (ejemplo: ID = 1)
    const categoriaFinal = categoria_id || 1;
    // Validaciones
    if (!nombre_producto || !descripcion || !precio || !stock) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }
    if (isNaN(precio) || isNaN(stock) || stock < 0 || precio <= 0) {
      return res
        .status(400)
        .json({ message: "Precio y stock deben ser valores válidos" });
    }

    // Registrar el producto
    await registrarProducto({
      imagen,
      nombre_producto,
      descripcion,
      precio,
      stock,
      usuario_id,
      categoria_id: categoriaFinal,
    });

    res.status(201).json({ message: "Producto registrado con éxito" });
  } catch (error) {
    console.error("Error al registrar producto:", error);
    res.status(500).json({ message: "Error interno al registrar el producto" });
  }
});

// Ruta GET para obtener todos los prodcutos
app.get("/productos", async (req, res) => {
  try {
    // Para cosultas por filtros
    // const { categoria, precio_min, precio_max } = req.query;
    // const productos = await obtenerProductos({ categoria, precio_min, precio_max });
    const productos = await obtenerProductos();

    if (!productos || productos.length === 0) {
      return res.status(404).json({ message: "No hay productos disponibles" });
    }

    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(error.code || 500).json({
      message: error.message || "Error al obtener productos",
    });
  }
});

// Ruta PUT para actualizar un usuario
app.put("/productos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { imagen, nombre_producto, descripcion, precio, stock } = req.body;
  // Validaciones
  if (!nombre_producto || !descripcion || !precio || stock === undefined) {
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }
  if (precio <= 0 || stock < 0) {
    return res
      .status(400)
      .json({ message: "Precio y stock deben ser valores positivos" });
  }
  try {
    // Verificar si el producto existe antes de actualizarlo
    const productoExistente = await obtenerProductosPorId(id);
    if (!productoExistente) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const productoActualizado = await actualizarProducto(id, {
      imagen,
      nombre_producto,
      descripcion,
      precio,
      stock,
    });
    res.status(200).json({
      message: "Producto actualizado correctamente",
      producto: productoActualizado,
    });
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ message: error.message || "Error al actualizar el producto" });
  }
});

// Ruta DELETE para eliminar un prodcuto
app.delete("/producto/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await eliminarProducto(id);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.status(200).json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ message: error.message || "Error al eliminar el producto" });
  }
});
