const jwt = require('jsonwebtoken');

const JWT_SECRET = 'acmetone-secret-key-yuzhuohengnmsl-likexiansima';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: '24h',
    }
  );
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.id) {
      console.error('Token verification failed: missing user ID');
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
}; 