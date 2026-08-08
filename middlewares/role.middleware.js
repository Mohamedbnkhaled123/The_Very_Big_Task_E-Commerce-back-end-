exports.authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const userRole = (req.user.role || '').toLowerCase();
        if (userRole === 'superadmin' && allowedRoles.includes('admin')) {
            return next();
        }
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: "access denied" });
        }
        next();
    };
};

exports.requireSuperAdmin = (req, res, next) => {
    if (!req.user || (req.user.role || '').toLowerCase() !== 'superadmin') {
        return res.status(403).json({ error: "Super Admin privileges required." });
    }
    next();
};
    