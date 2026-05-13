module.exports = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.VaiTro)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }
  next();
};
