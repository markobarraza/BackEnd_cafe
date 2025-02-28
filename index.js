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
  agregarProducto,
  autenticarUsuario,
  obtenerProductos,
  obtenerProductosPorUsuario
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



// Ruta POST para agregar un producto (protegida)
app.post("/productos", autenticarUsuario, async (req, res) => {
    try {
        const nuevoProducto = await agregarProducto(req); // Pasar `req` para acceder al usuario autenticado
        res.status(201).json(nuevoProducto);
    } catch (error) {
        res.status(error.code || 500).json({ message: error.message });
    }
});

// Ruta GET para obtener todos los productos
app.get("/productos", async (req, res) => {
    try {
        const productos = await obtenerProductos();
        res.status(200).json(productos);
    } catch (error) {
        res.status(error.code || 500).json({ message: error.message });
    }
});



app.get("/productos/usuario/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;
    try {
        const productos = await obtenerProductosPorUsuario(usuario_id);
        res.status(200).json(productos);
    } catch (error) {
        res.status(error.code || 500).json({ message: error.message });
    }
});