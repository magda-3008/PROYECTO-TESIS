function verificarSesion(req, res, next) {

    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            mensaje: "No hay una sesión activa."
        });
    }

    next();
}


function verificarAdministrador(req, res, next) {

    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            mensaje: "No hay una sesión activa."
        });
    }

    if (req.session.usuario.rol !== "Administrador") {
        return res.status(403).json({
            mensaje: "No tienes permisos para realizar esta acción."
        });
    }

    next();
}


module.exports = {
    verificarSesion,
    verificarAdministrador
};