const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1]; // Extraer el token después de "Bearer"

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Usa la misma clave secreta con la que generaste el token
        req.user = decoded; // Agrega la info del usuario al request
        next(); // Continúa con la ejecución
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};

module.exports = authMiddleware;
