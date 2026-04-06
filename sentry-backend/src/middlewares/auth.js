//ini kode untuk authorization yaitu pemberian akses user

//import jsonwebtoken
const jwt = require("jsonwebtoken")
const SECRET_KEY = process.env.JWT_SECRET || "sentry";

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
    req.user = user;          // <- penting
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
